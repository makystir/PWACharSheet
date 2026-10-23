import { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, CharacteristicKey } from '../../types/character';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import { CHAR_FULL_NAMES } from '../pages/characterConstants';
import { decodeSharePayload, MAX_JSON_CHARS } from '../../logic/share-codec';
import { validateSharedPayload } from '../../logic/share-validate';
import { deriveSheetTotals, type SheetTotals } from '../../logic/sheet-totals';
import { shouldRenderSection } from '../../logic/section-visibility';
import { getSkillBreakdown, getCBBreakdown } from '../../logic/breakdown-helpers';
import { calcWeaponDamage } from '../../logic/weapons';
import { isValidPortraitDataUrl } from '../../storage/portrait-codec';
import { importFromJSONWithPortrait } from '../../storage/export-import';
import { Tooltip } from './Tooltip';
import { TooltipTriggerCell } from './TooltipTriggerCell';
import { ConfirmDialog } from './ConfirmDialog';
import { WoundsBreakdownContent } from '../pages/WoundsBreakdownContent';
import { WeaponDamageBreakdownContent } from '../pages/WeaponDamageBreakdownContent';
import { MoveBreakdownContent } from '../pages/MoveBreakdownContent';
import { SkillBreakdownContent } from '../pages/SkillBreakdownContent';
import { CBBreakdownContent } from '../pages/CBBreakdownContent';
import { EncumbranceBreakdownContent } from '../pages/EncumbranceBreakdownContent';
import { CoinWeightBreakdownContent } from '../pages/CoinWeightBreakdownContent';
import { APBreakdownContent } from '../pages/APBreakdownContent';
import { getBonus } from '../../logic/calculators';
import { getEncumbranceBreakdown, getCoinWeightBreakdown, getAPBreakdown } from '../../logic/breakdown-helpers';
import type { LocationKey } from '../../logic/armourLayering';
import styles from './SharedCharacterViewer.module.css';

/**
 * Read-only GM viewer for a shared character.
 *
 * Mounted by AppContent ONLY on a `#view/…` route (before the welcome/shell
 * branch). It performs NO storage writes on render and contains NO editable
 * inputs: it decodes + validates the payload via FEAT-001's share pipeline,
 * then displays the sheet using deriveSheetTotals (AC2 reuse) with a breakdown
 * tooltip on every calculated total (calculated-total-tooltips steering). The
 * only write path is the explicit, confirmed "Import into my characters"
 * button at the foot of the sheet.
 */

interface SharedCharacterViewerProps {
  /** The opaque encoded payload after `#view/` (empty string for the bare route). */
  encoded: string;
}

/** Which single breakdown tooltip is open, if any (one at a time). */
type TooltipState =
  | null
  | { type: 'charTotal'; key: CharacteristicKey; anchorEl: HTMLElement }
  | { type: 'charBonus'; key: CharacteristicKey; anchorEl: HTMLElement }
  | { type: 'skill'; index: number; anchorEl: HTMLElement }
  | { type: 'wounds'; anchorEl: HTMLElement }
  | { type: 'ap'; location: LocationKey; anchorEl: HTMLElement }
  | { type: 'encumbrance'; anchorEl: HTMLElement }
  | { type: 'coinWeight'; anchorEl: HTMLElement }
  | { type: 'move'; anchorEl: HTMLElement }
  | { type: 'weaponDamage'; index: number; anchorEl: HTMLElement };

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'sheet'; character: Character; totals: SheetTotals }
  | { phase: 'open' };

/** Map a decode error code to a friendly, non-technical message (design error table). */
function decodeErrorMessage(code: string): string {
  switch (code) {
    case 'too-large':
      return 'This shared character is too large to open.';
    case 'bad-version':
      return 'This link was made with a newer version of the app and can’t be opened here.';
    case 'bad-base64url':
    case 'empty':
      return 'This share link looks incomplete or corrupted.';
    case 'bad-gzip':
    case 'bad-utf8':
      return 'The shared data could not be read. The link may be corrupted.';
    default:
      return 'The shared character could not be opened.';
  }
}

/** Navigate back to the user's own characters: clear the view hash and notify listeners. */
function goBackToMyCharacters(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** The AP locations in sheet display order with their labels. */
const AP_LOCATIONS: { location: LocationKey; label: string; key: keyof SheetTotals['armourPoints'] }[] = [
  { location: 'head', label: 'Head', key: 'head' },
  { location: 'lArm', label: 'Left Arm', key: 'lArm' },
  { location: 'rArm', label: 'Right Arm', key: 'rArm' },
  { location: 'body', label: 'Body', key: 'body' },
  { location: 'lLeg', label: 'Left Leg', key: 'lLeg' },
  { location: 'rLeg', label: 'Right Leg', key: 'rLeg' },
];

export function SharedCharacterViewer({ encoded }: SharedCharacterViewerProps) {
  const [state, setState] = useState<LoadState>(() =>
    encoded ? { phase: 'loading' } : { phase: 'open' },
  );
  const [pasteText, setPasteText] = useState('');
  const [openInputError, setOpenInputError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Decode + validate the link payload asynchronously (gzip is async). Guarded
  // against race conditions if `encoded` changes mid-flight.
  //
  // This effect synchronises viewer state to the external `encoded` prop (which
  // is driven by the browser hash): an empty payload resets to the "open a
  // shared character" panel, and a present payload shows a loading state while
  // the async decode runs. The synchronous reset to that transient state is the
  // sanctioned setState-in-effect pattern mirroring src/components/shared/
  // Tooltip.tsx (reposition-on-anchor-change) — it reflects an external input
  // change, not derived React state.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(encoded ? { phase: 'loading' } : { phase: 'open' });
    if (!encoded) {
      return;
    }
    (async () => {
      const decoded = await decodeSharePayload(encoded);
      if (cancelled) return;
      if (!decoded.ok) {
        setState({ phase: 'error', message: decodeErrorMessage(decoded.code) });
        return;
      }
      const result = loadFromJson(decoded.json);
      if (cancelled) return;
      setState(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [encoded]);

  const close = useCallback(() => setTooltip(null), []);

  // Funnel pasted/opened text through the same validate pipeline as the link.
  const openFromText = useCallback((text: string) => {
    setOpenInputError(null);
    if (text.length > MAX_JSON_CHARS) {
      setOpenInputError('This character data is too large to open.');
      return;
    }
    const result = loadFromJson(text);
    if (result.phase === 'error') {
      setOpenInputError(result.message);
      return;
    }
    setState(result);
  }, []);

  const handlePasteOpen = useCallback(() => {
    openFromText(pasteText);
  }, [openFromText, pasteText]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so re-selecting the same file re-triggers change.
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => openFromText(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => setOpenInputError('Could not read that file.');
      reader.readAsText(file);
    },
    [openFromText],
  );

  // ─── Render: loading ───────────────────────────────────────────────────────
  if (state.phase === 'loading') {
    return (
      <div className={styles.viewer}>
        <div className={styles.statusBox}>Opening shared character…</div>
      </div>
    );
  }

  // ─── Render: error ───────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <div className={styles.viewer}>
        <div className={styles.errorBox}>
          <div className={styles.errorTitle}>Can’t open this shared character</div>
          <div className={styles.errorMessage}>{state.message}</div>
          <button type="button" className={styles.backButton} onClick={goBackToMyCharacters}>
            Back to my characters
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: open panel (bare #view/ route) ─────────────────────────────────
  if (state.phase === 'open') {
    return (
      <div className={styles.viewer}>
        <div className={styles.openPanel}>
          <h2>Open a shared character</h2>
          <p className={styles.banner}>
            Paste shared character data below, or open a <code>.json</code> file a player sent you.
          </p>
          <textarea
            aria-label="Shared character data"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste shared character JSON here…"
          />
          <div className={styles.openActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handlePasteOpen}
              disabled={pasteText.trim().length === 0}
            >
              Open pasted data
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Open shared character file"
              onChange={handleFileChange}
            />
          </div>
          {openInputError && <div className={styles.errorMessage}>{openInputError}</div>}
          <button type="button" className={styles.backButton} onClick={goBackToMyCharacters}>
            Back to my characters
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: sheet ───────────────────────────────────────────────────────
  const { character, totals } = state;
  const showPortrait = !!character.portrait && isValidPortraitDataUrl(character.portrait);
  const allSkills = [...character.bSkills, ...character.aSkills];
  const encBreakdown = getEncumbranceBreakdown(character.chars, totals.strongBackLevel, totals.sturdyLevel);
  const coinBreakdown = getCoinWeightBreakdown(character.wGC, character.wSS, character.wD);

  return (
    <div className={styles.viewer}>
      <div className={styles.banner}>
        Read-only shared view. No changes here are saved.
        <button type="button" className={styles.backButton} onClick={goBackToMyCharacters} style={{ marginLeft: 12 }}>
          Back to my characters
        </button>
      </div>

      {/* Identity (always rendered) */}
      <div className={styles.card}>
        <div className={styles.identityHeader}>
          {showPortrait && (
            <img className={styles.portrait} src={character.portrait} alt={`${character.name || 'Character'} portrait`} />
          )}
          <div className={styles.identityMeta}>
            <div className={styles.characterName}>{character.name || 'Unnamed Character'}</div>
            <div>{character.species}</div>
            <div>{character.career}{character.careerLevel ? ` — ${character.careerLevel}` : ''}</div>
            <div>{character.class}</div>
          </div>
        </div>
      </div>

      {/* Characteristics (always) — total and bonus each carry a tooltip */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Characteristics</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Characteristic</th>
              <th>Total</th>
              <th>Bonus</th>
            </tr>
          </thead>
          <tbody>
            {CHARACTERISTIC_KEYS.map((key) => {
              const c = character.chars[key];
              const total = c.i + c.a + c.b;
              const bonus = getBonus(Math.max(0, total));
              return (
                <tr key={key}>
                  <td>{CHAR_FULL_NAMES[key]}</td>
                  <td>
                    <TooltipTriggerCell
                      tooltipId={`view-char-total-${key}`}
                      className={styles.triggerCell}
                      displayValue={total}
                      ariaLabel={`${CHAR_FULL_NAMES[key]} total ${total}. Show breakdown.`}
                      isTooltipOpen={tooltip?.type === 'charTotal' && tooltip.key === key}
                      onOpen={(anchorEl) => setTooltip({ type: 'charTotal', key, anchorEl })}
                      onClose={close}
                    />
                  </td>
                  <td>
                    <TooltipTriggerCell
                      tooltipId={`view-char-bonus-${key}`}
                      className={styles.triggerCell}
                      displayValue={bonus}
                      ariaLabel={`${CHAR_FULL_NAMES[key]} bonus ${bonus}. Show breakdown.`}
                      isTooltipOpen={tooltip?.type === 'charBonus' && tooltip.key === key}
                      onOpen={(anchorEl) => setTooltip({ type: 'charBonus', key, anchorEl })}
                      onClose={close}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movement + Wounds (always) */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Movement &amp; Wounds</div>
        <div className={styles.statGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Movement</span>
            <TooltipTriggerCell
              tooltipId="view-move"
              className={styles.triggerCell}
              displayValue={`${character.move.m}/${character.move.w}/${character.move.r}`}
              ariaLabel={`Movement ${character.move.m}, Walk ${character.move.w}, Run ${character.move.r}. Show breakdown.`}
              isTooltipOpen={tooltip?.type === 'move'}
              onOpen={(anchorEl) => setTooltip({ type: 'move', anchorEl })}
              onClose={close}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Wounds</span>
            <TooltipTriggerCell
              tooltipId="view-wounds"
              className={styles.triggerCell}
              displayValue={totals.wounds.total}
              ariaLabel={`Wounds ${totals.wounds.total}. Show breakdown.`}
              isTooltipOpen={tooltip?.type === 'wounds'}
              onOpen={(anchorEl) => setTooltip({ type: 'wounds', anchorEl })}
              onClose={close}
            />
          </div>
        </div>
      </div>

      {/* Skills (always) */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Skills</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Skill</th>
              <th>Char</th>
              <th>Adv</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {allSkills.map((skill, index) => {
              const cv = character.chars[skill.c as CharacteristicKey];
              const total = (cv ? Math.max(0, cv.i + cv.a + cv.b) : 0) + skill.a;
              return (
                <tr key={`${skill.n}-${index}`}>
                  <td>{skill.n}</td>
                  <td>{skill.c}</td>
                  <td>{skill.a || ''}</td>
                  <td>
                    <TooltipTriggerCell
                      tooltipId={`view-skill-${index}`}
                      className={styles.triggerCell}
                      displayValue={total}
                      ariaLabel={`${skill.n} total ${total}. Show breakdown.`}
                      isTooltipOpen={tooltip?.type === 'skill' && tooltip.index === index}
                      onOpen={(anchorEl) => setTooltip({ type: 'skill', index, anchorEl })}
                      onClose={close}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Talents (always) */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Talents</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Talent</th>
              <th>Times Taken</th>
            </tr>
          </thead>
          <tbody>
            {character.talents.map((t, i) => (
              <tr key={`${t.n}-${i}`}>
                <td>{t.n}</td>
                <td>{t.lvl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Weapons (always) — derived damage carries a tooltip */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Weapons</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Range/Reach</th>
              <th>Damage</th>
              <th>Qualities</th>
            </tr>
          </thead>
          <tbody>
            {character.weapons.map((w, index) => {
              const dmg = calcWeaponDamage(w, totals.SB, character.talents, w.runes ?? [], totals.rangedDamageSBMode);
              return (
                <tr key={`${w.name}-${index}`}>
                  <td>{w.name}</td>
                  <td>{w.group}</td>
                  <td>{w.rangeReach || w.maxR || ''}</td>
                  <td>
                    {dmg.num === null ? (
                      // Not derivable — show the raw damage string, no tooltip (per spec).
                      <span>{w.damage || '—'}</span>
                    ) : (
                      <TooltipTriggerCell
                        tooltipId={`view-weapon-damage-${index}`}
                        className={styles.triggerCell}
                        displayValue={dmg.num}
                        ariaLabel={`${w.name} damage ${dmg.num}. Show breakdown.`}
                        isTooltipOpen={tooltip?.type === 'weaponDamage' && tooltip.index === index}
                        onOpen={(anchorEl) => setTooltip({ type: 'weaponDamage', index, anchorEl })}
                        onClose={close}
                      />
                    )}
                  </td>
                  <td>{w.qualities}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Armour + Armour Points (always) — each AP location carries a tooltip */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Armour Points</div>
        <table className={styles.table}>
          <tbody>
            {AP_LOCATIONS.map(({ location, label, key }) => (
              <tr key={location}>
                <td>{label}</td>
                <td>
                  <TooltipTriggerCell
                    tooltipId={`view-ap-${location}`}
                    className={styles.triggerCell}
                    displayValue={totals.armourPoints[key]}
                    ariaLabel={`${label} armour points ${totals.armourPoints[key]}. Show breakdown.`}
                    isTooltipOpen={tooltip?.type === 'ap' && tooltip.location === location}
                    onOpen={(anchorEl) => setTooltip({ type: 'ap', location, anchorEl })}
                    onClose={close}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>Shield</td>
              <td>{totals.armourPoints.shield}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Encumbrance + Coin weight (always) */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Encumbrance</div>
        <div className={styles.statGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Max Enc.</span>
            <TooltipTriggerCell
              tooltipId="view-encumbrance"
              className={styles.triggerCell}
              displayValue={totals.maxEncumbrance}
              ariaLabel={`Maximum encumbrance ${totals.maxEncumbrance}. Show breakdown.`}
              isTooltipOpen={tooltip?.type === 'encumbrance'}
              onOpen={(anchorEl) => setTooltip({ type: 'encumbrance', anchorEl })}
              onClose={close}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Coin Weight</span>
            <TooltipTriggerCell
              tooltipId="view-coin-weight"
              className={styles.triggerCell}
              displayValue={totals.coinWeight}
              ariaLabel={`Coin weight ${totals.coinWeight}. Show breakdown.`}
              isTooltipOpen={tooltip?.type === 'coinWeight'}
              onOpen={(anchorEl) => setTooltip({ type: 'coinWeight', anchorEl })}
              onClose={close}
            />
          </div>
        </div>
      </div>

      {/* Spells and Prayers (conditional) */}
      {shouldRenderSection(character, 'spells') && (
        <div className={styles.card} data-section="spells">
          <div className={styles.cardTitle}>Spells and Prayers</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>CN</th>
                <th>Range</th>
                <th>Target</th>
                <th>Duration</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              {character.spells.map((s, i) => (
                <tr key={`${s.name}-${i}`}>
                  <td>{s.name}</td>
                  <td>{s.cn}</td>
                  <td>{s.range}</td>
                  <td>{s.target}</td>
                  <td>{s.duration}</td>
                  <td>{s.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ammunition (conditional) */}
      {shouldRenderSection(character, 'ammunition') && (
        <div className={styles.card} data-section="ammunition">
          <div className={styles.cardTitle}>Ammunition</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Qualities</th>
              </tr>
            </thead>
            <tbody>
              {character.ammo.map((a, i) => (
                <tr key={`${a.name}-${i}`}>
                  <td>{a.name}</td>
                  <td>{a.quantity}</td>
                  <td>{a.qualities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Conditions (conditional) */}
      {shouldRenderSection(character, 'conditions') && (
        <div className={styles.card} data-section="conditions">
          <div className={styles.cardTitle}>Conditions</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Condition</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {character.conditions.filter((c) => c.level > 0).map((c, i) => (
                <tr key={`${c.name}-${i}`}>
                  <td>{c.name}</td>
                  <td>{c.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer: explicit import (create-new semantics) behind a confirm */}
      <div className={styles.footer}>
        <button type="button" className={styles.primaryButton} onClick={() => setShowImportConfirm(true)}>
          Import into my characters
        </button>
      </div>

      {showImportConfirm && (
        <ConfirmDialog
          message={`Import "${character.name || 'this character'}" as a new character in your list?`}
          confirmLabel="Import"
          cancelLabel="Cancel"
          onCancel={() => setShowImportConfirm(false)}
          onConfirm={() => {
            setShowImportConfirm(false);
            // Create-new import: re-serialize the validated character and route
            // it through importFromJSONWithPortrait (never SettingsPage's
            // overwrite handler). This is the ONLY storage write in the viewer.
            void importFromJSONWithPortrait(JSON.stringify(character));
          }}
        />
      )}

      {/* Single active breakdown tooltip (one open at a time) */}
      {tooltip?.type === 'charTotal' && (
        <Tooltip id={`view-char-total-${tooltip.key}`} anchorEl={tooltip.anchorEl} title={`${CHAR_FULL_NAMES[tooltip.key]} Total`} onClose={close}>
          <SkillBreakdownContent {...getSkillBreakdown(tooltip.key, character.chars, 0)} />
        </Tooltip>
      )}
      {tooltip?.type === 'charBonus' && (
        <Tooltip id={`view-char-bonus-${tooltip.key}`} anchorEl={tooltip.anchorEl} title={`${CHAR_FULL_NAMES[tooltip.key]} Bonus`} onClose={close}>
          <CBBreakdownContent {...getCBBreakdown(tooltip.key, character.chars)} />
        </Tooltip>
      )}
      {tooltip?.type === 'skill' && (() => {
        const skill = allSkills[tooltip.index];
        if (!skill) return null;
        return (
          <Tooltip id={`view-skill-${tooltip.index}`} anchorEl={tooltip.anchorEl} title={`${skill.n} Breakdown`} onClose={close}>
            <SkillBreakdownContent {...getSkillBreakdown(skill.c as CharacteristicKey, character.chars, skill.a)} />
          </Tooltip>
        );
      })()}
      {tooltip?.type === 'wounds' && (
        <Tooltip id="view-wounds" anchorEl={tooltip.anchorEl} title="Wounds Breakdown" onClose={close}>
          <WoundsBreakdownContent wounds={totals.wounds} />
        </Tooltip>
      )}
      {tooltip?.type === 'ap' && (() => {
        const loc = AP_LOCATIONS.find((l) => l.location === tooltip.location)!;
        return (
          <Tooltip id={`view-ap-${tooltip.location}`} anchorEl={tooltip.anchorEl} title={`${loc.label} Armour Points`} onClose={close}>
            <APBreakdownContent {...getAPBreakdown(character.armour, tooltip.location, loc.label)} />
          </Tooltip>
        );
      })()}
      {tooltip?.type === 'encumbrance' && (
        <Tooltip id="view-encumbrance" anchorEl={tooltip.anchorEl} title="Max Encumbrance Breakdown" onClose={close}>
          <EncumbranceBreakdownContent {...encBreakdown} />
        </Tooltip>
      )}
      {tooltip?.type === 'coinWeight' && (
        <Tooltip id="view-coin-weight" anchorEl={tooltip.anchorEl} title="Coin Weight Breakdown" onClose={close}>
          <CoinWeightBreakdownContent {...coinBreakdown} />
        </Tooltip>
      )}
      {tooltip?.type === 'move' && (
        <Tooltip id="view-move" anchorEl={tooltip.anchorEl} title="Movement Breakdown" onClose={close}>
          <MoveBreakdownContent m={character.move.m} w={character.move.w} r={character.move.r} />
        </Tooltip>
      )}
      {tooltip?.type === 'weaponDamage' && (() => {
        const w = character.weapons[tooltip.index];
        if (!w) return null;
        const dmg = calcWeaponDamage(w, totals.SB, character.talents, w.runes ?? [], totals.rangedDamageSBMode);
        return (
          <Tooltip id={`view-weapon-damage-${tooltip.index}`} anchorEl={tooltip.anchorEl} title={`${w.name} Damage`} onClose={close}>
            <WeaponDamageBreakdownContent num={dmg.num} breakdown={dmg.breakdown} rawDamage={w.damage} />
          </Tooltip>
        );
      })()}
    </div>
  );
}

/**
 * Validate a JSON string through the share pipeline and produce the next
 * sheet/error state. The MAX_JSON_CHARS pre-check is applied by callers for the
 * pasted/opened text path; the link path is already byte-bounded by the codec.
 */
function loadFromJson(json: string): LoadState {
  const validated = validateSharedPayload(json);
  if (!validated.ok) {
    return { phase: 'error', message: validated.error };
  }
  const totals = deriveSheetTotals(validated.character);
  return { phase: 'sheet', character: validated.character, totals };
}
