import { cva } from 'class-variance-authority';

export const focusVariants = cva(
  'focus-visible:ring-offset-2 focus-visible:ring-[1.5px] aria-invalid:ring-destructive aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        primary: '',
        destructive: 'ring-destructive hover:ring-destructive-accent',
        warning: 'ring-warning hover:ring-warning-accent',
        success: 'ring-success hover:ring-success-accent',
        none: 'focus-visible:ring-offset-0 focus-visible:ring-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);
