import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Special relationship badge variants 
export const relationshipBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
  {
    variants: {
      type: {
        family: "bg-relationship-family/20 text-relationship-family border-relationship-family",
        friend: "bg-relationship-friend/20 text-relationship-friend border-relationship-friend",
        rival: "bg-relationship-rival/20 text-relationship-rival border-relationship-rival",
        enemy: "bg-relationship-enemy/20 text-relationship-enemy border-relationship-enemy",
      },
    },
    defaultVariants: {
      type: "family",
    },
  }
);