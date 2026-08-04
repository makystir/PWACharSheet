import { useCallback } from 'react';
import type { CharacteristicKey } from '../../types/character';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import styles from './CharCurrentCell.module.css';

export interface CharCurrentCellProps {
  charKey: CharacteristicKey;
  current: number;
  isTooltipOpen: boolean;
  onOpen: (key: CharacteristicKey, anchorEl: HTMLElement) => void;
  onClose: () => void;
}

export function CharCurrentCell({
  charKey,
  current,
  isTooltipOpen,
  onOpen,
  onClose,
}: CharCurrentCellProps) {
  const handleOpen = useCallback(
    (anchorEl: HTMLElement) => {
      onOpen(charKey, anchorEl);
    },
    [charKey, onOpen],
  );

  return (
    <TooltipTriggerCell
      tooltipId={`tooltip-char-${charKey}`}
      displayValue={current}
      isTooltipOpen={isTooltipOpen}
      onOpen={handleOpen}
      onClose={onClose}
      className={styles.cell}
    />
  );
}
