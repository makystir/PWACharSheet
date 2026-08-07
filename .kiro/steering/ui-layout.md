---
inclusion: fileMatch
fileMatchPattern: "**/*.tsx,**/*.css,**/*.module.css"
---

# UI Layout Rules

## Text Content Must Remain Readable

When adding UI controls (buttons, icons, drag handles, toggles, badges) to existing components:

1. **Never reduce content readability.** Weapon names, trapping names, skill names, and any user-entered text must remain fully visible or wrap naturally. Do not allow new controls to push text into truncation (`text-overflow: ellipsis`) unless it was already truncated before the change.

2. **Measure the horizontal budget.** Before adding inline controls to a row, check the container's minimum width (look at `minmax()` in grid definitions or `min-width` on flex containers). If the new controls would consume more than 20% of available width, use one of these patterns instead:
   - Show controls only on hover/focus (hidden by default on desktop)
   - Place controls in an absolutely-positioned overlay
   - Use a compact icon that expands on interaction
   - Move controls to a secondary row that appears on expand/hover

3. **Flex items holding text content must have `min-width: 0` and `flex: 1`.** This prevents flex children from overflowing their container when sibling elements are added.

4. **Trapping cards are small (~160px minimum).** Any inline control added to trapping cards must be ≤24px wide at rest. Use hover-reveal or icon-only patterns.

5. **Weapon cards have a dense primary row.** The primary row already contains: name + damage chip + range chip + roll button + delete button. Any additions must use hover-reveal or be placed in the secondary line.

## Mobile Touch Targets

On mobile (`@media (max-width: 767px)` or `@media (hover: none)`):
- Interactive elements must meet 44×44px minimum tap target
- Use CSS to enlarge controls on touch devices rather than making desktop controls permanently large
- Controls hidden on desktop via hover-reveal should be always-visible on touch devices
