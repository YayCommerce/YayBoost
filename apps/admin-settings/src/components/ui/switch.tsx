import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import { focusVariants } from './variants/focus.variants';

const switchVariants = cva('', {
  variants: {
    size: {
      default: 'h-6 w-11',
      sm: 'h-5 w-9',
      lg: 'h-7 w-13',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function Switch({
  className,
  size,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        focusVariants(),
        switchVariants({ size }),
        'peer dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=unchecked]:bg-input data-[state=unchecked]:hover:bg-input-accent',
        'data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-size={size ?? 'default'}
        className={cn(
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full shadow-sm ring-0 transition-transform data-[size=default]:size-5 data-[size=lg]:size-6 data-[size=sm]:size-4 data-[state=checked]:translate-x-full data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
