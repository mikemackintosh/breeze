import { cva } from 'class-variance-authority';

const baseCard = "rounded-lg border bg-card text-card-foreground shadow-sm";

export const cardVariants = {
  root: baseCard,
  header: "flex flex-col space-y-1.5 p-6",
  title: "text-xl font-semibold leading-none tracking-tight",
  description: "text-sm text-muted-foreground",
  content: "p-6 pt-0",
  footer: "flex items-center p-6 pt-0",
};

export const interactiveCardVariants = cva(
  baseCard + ' transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'hover:border-primary hover:shadow-md cursor-pointer',
        subtle: 'hover:bg-accent hover:shadow cursor-pointer',
        bordered: 'border-2 hover:border-primary hover:shadow-md cursor-pointer',
      }
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);