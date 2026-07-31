# Bugfix Requirements Document

## Introduction

After the print-layout-redesign spec was implemented, the print output is constrained to a single page. The PDF preview shows "of 1" in the page indicator, meaning all character sheet content (identity, characteristics, skills, talents, equipment, spells, etc.) is being crammed into one page instead of properly paginating across multiple pages as designed. The print-layout-redesign was specifically designed to produce a multi-page document (Page 1: Identity & Skills, Page 2: Combat & Equipment, Page 3+: Optional sections), so this is a regression introduced by those changes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user triggers print (Ctrl+P or browser Print) THEN the system renders all character sheet content on a single page, ignoring `page-break-after: always` and `break-after: page` CSS directives on the `.pageBreak` class

1.2 WHEN the print layout contains multiple page divs with explicit page break CSS THEN the browser's print engine does not paginate the output into separate pages

1.3 WHEN the character has enough data to fill multiple pages (skills, talents, weapons, spells, etc.) THEN the PDF preview shows "of 1" page, with all content scaled down or overflowing onto one page

### Expected Behavior (Correct)

2.1 WHEN the user triggers print THEN the system SHALL render the character sheet across multiple pages, with Page 1 (Identity & Skills) and Page 2 (Combat & Equipment) separated by explicit page breaks

2.2 WHEN page break CSS (`page-break-after: always` / `break-after: page`) is applied to page wrapper divs THEN the browser's print engine SHALL honour those directives and start new pages at those boundaries

2.3 WHEN optional sections exist (spells, companions, enterprises, etc.) THEN the system SHALL allow content to flow onto Page 3+ with natural page overflow

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the print layout is viewed on screen (not printing) THEN the system SHALL CONTINUE TO hide the print wrapper via `display: none`

3.2 WHEN printing THEN the system SHALL CONTINUE TO display the parchment-themed decorative styling (backgrounds, borders, corner ornaments, heraldic glyphs)

3.3 WHEN printing THEN the system SHALL CONTINUE TO show section boxes with `break-inside: avoid` to prevent sections from being split across page boundaries

3.4 WHEN printing THEN the system SHALL CONTINUE TO render page footers with character name and page numbers on each page

3.5 WHEN the character has no optional data (empty spells, companions, etc.) THEN the system SHALL CONTINUE TO omit those conditional sections from the output
