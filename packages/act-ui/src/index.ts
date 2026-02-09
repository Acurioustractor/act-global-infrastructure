// Components
export * from "./components";

// Utilities
export { cn } from "./utils/cn";

// ACT Brand colors for reference
export const ACT_COLORS = {
  // Primary brand colors
  primary: "#2D5016", // ACT Green
  secondary: "#8B4513", // Earth Brown
  accent: "#D4AF37", // Harvest Gold

  // Project-specific colors
  projects: {
    empathyLedger: {
      primary: "#7C3AED", // Purple
      light: "#EDE9FE",
    },
    justiceHub: {
      primary: "#2563EB", // Blue
      light: "#DBEAFE",
    },
    theHarvest: {
      primary: "#D97706", // Amber
      light: "#FEF3C7",
    },
    actFarm: {
      primary: "#16A34A", // Green
      light: "#DCFCE7",
    },
    goods: {
      primary: "#EA580C", // Orange
      light: "#FFEDD5",
    },
    actPlacemat: {
      primary: "#0891B2", // Cyan
      light: "#CFFAFE",
    },
    actStudio: {
      primary: "#059669", // Emerald
      light: "#D1FAE5",
    },
  },
} as const;

// Project types
export type ACTProject =
  | "empathyLedger"
  | "justiceHub"
  | "theHarvest"
  | "actFarm"
  | "goods"
  | "actPlacemat"
  | "actStudio";
