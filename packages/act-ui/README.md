# @act/ui

Shared UI components for the ACT ecosystem projects.

## Installation

```bash
npm install @act/ui
# or
pnpm add @act/ui
# or link locally during development
npm link ../act-global-infrastructure/packages/act-ui
```

## Usage

```tsx
import { Button, Card, Badge, cn, ACT_COLORS } from "@act/ui";

// Use components
<Button variant="act">Get Started</Button>
<Button variant="actOutline">Learn More</Button>

// Project-specific badges
<Badge variant="empathyLedger">Empathy Ledger</Badge>
<Badge variant="justiceHub">JusticeHub</Badge>
<Badge variant="theHarvest">The Harvest</Badge>
<Badge variant="actFarm">ACT Farm</Badge>

// Use utility
<div className={cn("base-class", isActive && "active-class")}>
  Content
</div>

// Access brand colors
const projectColor = ACT_COLORS.projects.empathyLedger.primary;
```

## Components

### Button

```tsx
import { Button } from "@act/ui";

<Button variant="default">Default</Button>
<Button variant="act">ACT Brand</Button>
<Button variant="actOutline">ACT Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🌱</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@act/ui";

<Card>
  <CardHeader>
    <CardTitle>Project Title</CardTitle>
    <CardDescription>Project description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
import { Badge } from "@act/ui";

// Standard variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>

// Project-specific variants
<Badge variant="empathyLedger">Empathy Ledger</Badge>
<Badge variant="justiceHub">JusticeHub</Badge>
<Badge variant="theHarvest">The Harvest</Badge>
<Badge variant="actFarm">ACT Farm</Badge>
<Badge variant="goods">Goods</Badge>
<Badge variant="actPlacemat">ACT Placemat</Badge>
<Badge variant="actStudio">ACT Studio</Badge>
```

## Brand Colors

Access ACT brand colors programmatically:

```tsx
import { ACT_COLORS } from "@act/ui";

// Primary brand colors
ACT_COLORS.primary    // #2D5016 (ACT Green)
ACT_COLORS.secondary  // #8B4513 (Earth Brown)
ACT_COLORS.accent     // #D4AF37 (Harvest Gold)

// Project colors
ACT_COLORS.projects.empathyLedger.primary  // #7C3AED
ACT_COLORS.projects.empathyLedger.light    // #EDE9FE
// ... etc for each project
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

## Linking for Local Development

To use this package in a local project during development:

```bash
# In this package directory
npm link

# In your project directory
npm link @act/ui
```

Or use path aliases in your project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@act/ui": ["../act-global-infrastructure/packages/act-ui/src"]
    }
  }
}
```

## Tailwind CSS Integration

This package uses Tailwind CSS. Make sure your project's `tailwind.config.js` includes the package:

```js
module.exports = {
  content: [
    // ... your content
    "./node_modules/@act/ui/**/*.{js,ts,jsx,tsx}",
  ],
  // ... rest of config
}
```
