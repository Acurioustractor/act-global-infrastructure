# The Harvest Site Plan Explorer — Implementation Plan

## Goal
Build a full-screen interactive site plan viewer in the ACT Command Center (`apps/command-center`) for The Harvest pitch to the property owners. It needs toggleable layers showing different stages of the plan, zoom/pan for detail, and clickable zones with rich info panels.

## Where It Lives
- **Route**: `apps/command-center/src/app/projects/the-harvest/page.tsx` — dedicated Harvest pitch page
- **Component**: `apps/command-center/src/components/project/harvest-site-plan.tsx` — the full-screen explorer
- **Navigation**: Linked from the project detail page for "the-harvest" and potentially from the top nav as a direct link

## Architecture

### 1. Create `HarvestSitePlan` component
A full-viewport (`h-screen`) component with these sections:

**Top bar** (fixed, ~60px):
- Title: "The Harvest — Site Plan"
- Layer toggle pills: `Current State` | `Stage 1: Activate` | `Stage 2: Integrate` | `Master Plan`
- Multiple layers can be toggled ON simultaneously (checkbox-style, not radio)
- Each layer has an opacity slider (or just toggle on/off with blend)
- Zoom controls: +/- buttons and reset
- Back button to return to project page

**Main canvas** (fills remaining viewport):
- CSS transform-based zoom/pan (no heavy library needed)
  - Scroll wheel = zoom in/out
  - Click-drag = pan
  - Pinch-to-zoom on touch devices
  - Min zoom 0.5x, max zoom 4x
- Base layer: aerial/site photo or architect base drawing (placeholder initially)
- Overlay layers rendered as absolutely positioned `<img>` elements with CSS opacity transitions
- Layers stack: base → current-state → stage-1 → stage-2 → master-plan

**Clickable hotspot zones** (overlaid on the canvas):
- Defined as percentage-based rectangles (like FloorPlanViewer in The Harvest Website)
- Zones: The Pavilion, The Shed, The Gardens, Main Building, The Classroom, The Lawn, Entry/Parking
- Each zone has: name, description, stage info, planned use, capacity
- Hover: subtle highlight + tooltip
- Click: slide-out detail panel from the right side

**Detail panel** (slide-out, right side):
- Zone name, description, planned use
- Which stage it activates in
- Capacity / size info
- Placeholder for photos
- Close button

### 2. Create the route page
`apps/command-center/src/app/projects/the-harvest/page.tsx`:
- Full-screen layout (no padding, no scrolling — the component IS the page)
- Imports and renders `HarvestSitePlan`

### 3. Zone data
Hardcoded data file at `apps/command-center/src/data/harvest-zones.ts`:
- Zone definitions with coordinates, names, descriptions, stage associations
- Layer definitions (name, color, description)

## Implementation Details

### Zoom/Pan
Pure CSS transforms + React state. No external library:
```
transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`
```
- `onWheel` for scroll zoom (with `e.preventDefault()`)
- `onPointerDown/Move/Up` for drag-to-pan
- Touch: use pointer events which handle both mouse and touch

### Layer System
Each layer is a full-size image positioned absolutely over the base:
```tsx
{layers.map(layer => (
  <img
    key={layer.id}
    src={layer.imageSrc}
    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
    style={{ opacity: activeLayer === layer.id ? 1 : 0 }}
  />
))}
```
Initially these will use colored placeholder overlays until real images are added.

### Styling
Follow existing command-center patterns:
- Dark theme with `glass-card` and `glass-card-sm` classes
- White/opacity text colors
- Indigo/amber/emerald accent colors
- `cn()` utility for conditional classes

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/data/harvest-zones.ts` | Zone + layer data definitions |
| CREATE | `src/components/project/harvest-site-plan.tsx` | Full-screen explorer component |
| CREATE | `src/app/projects/the-harvest/page.tsx` | Route page |

## No External Dependencies
Everything uses what's already in the project: React 19, Tailwind, Lucide icons, `cn()` utility. No new packages needed.

## Placeholder Strategy
- Base layer: a subtle grid pattern with zone outlines (like FloorPlanViewer does)
- Stage overlays: semi-transparent colored overlays showing which zones activate per stage
- All ready for you to drop in real images at `public/harvest/` later

## Future Enhancements (not in this PR)
- Real aerial photo as base layer
- Architect overlay images per stage
- Photo galleries per zone
- Animation between stages
- Mobile-optimized drawer instead of side panel
