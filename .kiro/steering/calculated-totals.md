# Calculated Total Tooltips

## Rule

Wherever a calculated total number is displayed in the UI, it must have a tooltip that shows how that number was calculated — including the individual components and formula that produce the total.

## Guidelines

1. **Show the breakdown**: The tooltip should list each contributing value with a label, e.g., `Initial 30 + Advances 5 + Bonus 0 = 35`
2. **Use the existing Tooltip component**: The project has a `Tooltip` component in `src/components/shared/Tooltip.tsx` — use it for consistency.
3. **Format clearly**: Use a simple additive format like `A + B + C = Total` or a labeled list when there are many components.
4. **Include zero values**: Show components even when they are 0, so users can see all the factors that could contribute.
5. **Name the sources**: Use meaningful labels (e.g., "Initial", "Advances", "Talent bonus", "SB") rather than just raw numbers.
6. **Examples of calculated totals that need tooltips**:
   - Characteristic totals (Initial + Advances + Bonus)
   - Characteristic bonuses
   - Skill totals (Characteristic + Advances)
   - Wound maximum (SB + 2×TB + WPB + Hardy)
   - Encumbrance totals
   - Weapon damage values
   - Armour point totals per location
   - Movement values
   - Any summed or derived stat
7. **Hover on desktop, tap on mobile**: Tooltip should appear on hover for desktop users and on tap/long-press for touch users.
