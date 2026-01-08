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
          'bg-background dark:bg-input/30 dark:border-input',
        ghost: 'text-foreground bg-transparent focus-visible:text-primary',
        link: 'text-foreground underline-offset-4',
        muted: 'bg-muted text-muted-foreground',

        primary: 'border-transparent bg-primary text-primary-foreground',
        'primary-soft': 'border-transparent bg-primary/6 text-primary',
        'primary-outline':
          'border border-primary text-primary',

        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        'destructive-soft':
          'border-transparent bg-destructive/6 text-destructive',
        'destructive-outline':
          'border border-destructive text-destructive',

        success:
          'border-transparent bg-success text-success-foreground',
        'success-soft':
          'border-transparent bg-success/6 text-success',
        'success-outline':
          'border border-success text-success',

        warning:
          'border-transparent bg-warning text-warning-foreground',
        'warning-soft':
          'border-transparent bg-warning/6 text-warning',
        'warning-outline':
          'border border-warning text-warning',
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
