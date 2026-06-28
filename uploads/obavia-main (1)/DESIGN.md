# Design

## Product Summary

OBAVIA is a private luxury vehicle rental house with a brand-led public site and product-style member and admin surfaces. The design language should feel like a private bank and a members club, with enough practical structure to support booking and operations.

## Color Palette

Primary palette is fixed by the brand brief.

- Deep ink black: `#121212`
- Warm ivory: `#F5F0E6`
- Muted antique gold: `#b89b5e`
- Soft ink: `#2b2824`
- Hairline border on dark: `rgba(184, 155, 94, 0.34)`
- Hairline border on ivory: `rgba(18, 18, 18, 0.16)`

Gold is an accent for linework, monogram strokes, selected states, and small metadata. It should not become a large filled surface.

## Typography

Use a high-contrast editorial serif for headings and a restrained sans for UI, forms, labels, and tables.

- Display: `Cormorant Garamond`, `Bodoni 72`, `Georgia`, serif
- UI and body: `Montserrat`, `Avenir Next`, `Helvetica Neue`, Arial, sans-serif
- Labels: small uppercase sans, modest tracking, never long uppercase paragraphs

Hero headings should be elegant and wide, not cramped. Body copy should stay short and readable.

## Layout

The site alternates between dark editorial sections and warm ivory product surfaces. Section transitions should feel like chapters, not stacked cards. Use thin dividers, fixed aspect ratios, and large margins.

Cards are allowed for fleet items, membership tiers, bookings, metrics, and dashboards. Do not place cards inside larger decorative cards.

## Components

- Brand mark: interlocking O arcs in antique gold or ink.
- Navigation: slim horizontal bar, centered monogram, understated links.
- Buttons: rectangular, 4px radius, thin border, no shadows.
- Form controls: flat fields, thin borders, visible labels, strong focus outline.
- Vehicle cards: image first, then brand, class name, "or similar", and minimal specs.
- Dashboards: operational density with thin borders, no SaaS-blue status colors.
- Tier badges: single ring, double ring with dot, and black medallion with gold O.

## Motion

Use subtle GSAP reveals for hierarchy and image presence. Motion should be fade-through or small translate/scale only. Respect `prefers-reduced-motion`.

## Imagery

Use dark executive vehicle photography, stone or classical architecture, and warm evening light. Avoid sports-car emphasis, visible rental-counter environments, discount cues, and loud city nightlife.
