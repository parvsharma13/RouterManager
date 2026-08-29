# Design System

## Theme

A restrained, cool-neutral Android product interface designed for quick checks in ordinary home lighting. The surface is quiet and highly legible; cobalt identifies actions and current navigation, while cyan is reserved for live network information.

## Colour

- Background: cool near-white `oklch(0.975 0.006 255)`; dark `oklch(0.145 0.018 258)`.
- Surface: white `oklch(0.995 0.003 255)`; dark `oklch(0.185 0.02 258)`.
- Ink: deep navy `oklch(0.20 0.035 258)`; dark `oklch(0.95 0.01 255)`.
- Primary: cobalt `oklch(0.56 0.20 258)`; dark `oklch(0.68 0.17 252)`.
- Network information: cyan `oklch(0.68 0.14 220)`.
- Success, warning, and danger always pair colour with an icon and text label.

## Typography

Use Android's system sans-serif stack. Page titles are 24px/32px semibold, section headings 16px/24px semibold, body 14–16px with at least 1.45 line height, and technical values use tabular numerals where useful. UI labels never use tracked uppercase text.

## Layout

- Phone: persistent four-item bottom navigation; 16px page gutters; full-width grouped lists and detail routes.
- Tablet and desktop: 232px navigation rail and content up to 1040px.
- Account for top and bottom safe areas. Keep primary actions above bottom navigation.
- Use cards only for bounded status modules. Settings and devices use separated rows rather than nested cards.

## Components

- Touch targets are at least 48dp; primary actions are 52dp.
- Primary surfaces use 16px radii, controls 12px, pills fully rounded.
- Status rows combine icon, plain-language label, technical detail, and optional chevron.
- Loading uses shape-matched skeletons. Empty states explain the next useful action.
- Destructive or disruptive router actions require explicit confirmation.
- Unsupported writes render a visible read-only explanation instead of a disabled control without context.

## Motion

State transitions use 180–220ms ease-out. Motion communicates navigation, selection, refresh, or save completion only. Reduced-motion mode removes transforms and shortens transitions to an immediate crossfade.
