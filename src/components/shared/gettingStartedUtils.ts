/**
 * "Brand-new" definition (design decision, Req 5.1): a character with no XP
 * spent and no career selected — i.e. a fresh quick-start character. Imported or
 * advanced characters are excluded.
 */
export function isBrandNewCharacter(xpSpent: number, career: string): boolean {
  return xpSpent === 0 && career === '';
}
