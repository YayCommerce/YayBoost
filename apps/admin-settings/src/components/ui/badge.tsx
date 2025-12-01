import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border h-5 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        outline:
          'bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        ghost: 'hover:bg-[#F2F5F9] text-foreground bg-transparent focus-visible:text-primary',
        link: 'text-foreground hover:text-primary underline-offset-4 hover:underline',
        muted: 'bg-muted text-muted-foreground hover:bg-muted-accent',

        primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-accent',
        'primary-soft': 'border-transparent bg-primary/6 text-primary hover:text-primary-accent',
        'primary-outline':
          'border border-primary text-primary hover:border-primary-accent hover:text-primary-accent',

        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive-accent ring-destructive/50 hover:ring-destructive-accent/50',
        'destructive-soft':
          'border-transparent bg-destructive/6 text-destructive hover:text-destructive-accent ring-destructive/50 hover:ring-destructive-accent/50',
        'destructive-outline':
          'border border-destructive text-destructive hover:border-destructive-accent hover:text-destructive-accent ring-destructive/50 hover:ring-destructive-accent/50',

        success:
          'border-transparent bg-success text-success-foreground hover:bg-success-accent ring-success/50 hover:ring-success-accent/50',
        'success-soft':
          'border-transparent bg-success/6 text-success hover:text-success-accent ring-success/50 hover:ring-success-accent/50',
        'success-outline':
          'border border-success text-success hover:border-success-accent hover:text-success-accent ring-success/50 hover:ring-success-accent/50',

        warning:
          'border-transparent bg-warning text-warning-foreground hover:bg-warning-accent ring-warning/50 hover:ring-warning-accent/50',
        'warning-soft':
          'border-transparent bg-warning/6 text-warning hover:text-warning-accent ring-warning/50 hover:ring-warning-accent/50',
        'warning-outline':
          'border border-warning text-warning hover:border-warning-accent hover:text-warning-accent ring-warning/50 hover:ring-warning-accent/50',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
