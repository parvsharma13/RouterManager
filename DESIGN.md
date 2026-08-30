# Design System

## Theme

A restrained Material 3 Android product interface designed for quick checks in ordinary home lighting. The surface is quiet and highly legible; cobalt identifies actions and current navigation, while cyan is reserved for live network information. Material roles, state layers, adaptive navigation, and motion patterns govern the component system.

## Colour

- Background/surface: cool near-white `oklch(0.975 0.008 255)`; dark `oklch(0.145 0.018 258)`.
- Tonal elevation: five `surface-container` roles replace decorative shadows and arbitrary card colours.
- Ink: deep navy `oklch(0.20 0.035 258)`; dark `oklch(0.95 0.01 255)`.
- Primary: cobalt `oklch(0.56 0.20 258)`; dark `oklch(0.68 0.17 252)`.
- Primary container: a low-chroma cobalt surface for selected states and bounded network status.
- Network information: cyan `oklch(0.68 0.14 220)`.
- Success, warning, and danger always pair colour with an icon and text label.

## Typography

Use Android's Roboto/system sans-serif stack and Material 3 type roles: headline large for page context, title medium for sections and rows, body medium for explanations, and label large/medium for controls and metadata. Technical values use tabular numerals where useful. UI labels never use tracked uppercase text.

## Layout

- Phone: persistent four-item bottom navigation; 16px page gutters; full-width grouped lists and detail routes.
- Tablet and desktop: 232px navigation rail and content up to 1040px.
- Account for top and bottom safe areas. Keep primary actions above bottom navigation.
- Use cards only for bounded status modules. Settings and devices use separated rows on `surface-container-low` rather than nested cards.

## Components

- Touch targets are at least 48dp; primary actions are 52dp.
- Use Material shape roles: 4px extra-small, 8px small, 12px medium, 16px large, 28px extra-large, and full pills.
- Filled actions use primary; secondary actions use primary/secondary containers; navigation selections use a 64×32dp active indicator.
- Hover, focus, pressed, selected, disabled, loading, and error states use consistent state layers.
- Status rows combine icon, plain-language label, technical detail, and optional chevron.
- Loading uses shape-matched skeletons. Empty states explain the next useful action.
- Destructive or disruptive router actions require explicit confirmation.
- Unsupported writes render a visible read-only explanation instead of a disabled control without context.

## Motion

Use Material fade-through for route changes, container scale/fade for dialogs, a sliding thumb for switches, active-indicator transitions for navigation, and shimmer for loading placeholders. Feedback is 100–150ms; state/navigation changes are 180–250ms using Material standard/decelerate easing. Reduced-motion mode removes transforms and shortens transitions to an immediate crossfade.
