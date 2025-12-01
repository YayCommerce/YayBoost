import * as React from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import { cn } from '@/lib/utils';

import { focusVariants } from './variants/focus.variants';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        focusVariants(),
        'peer border-input dark:bg-input/30 hover:border-ring focus-visible:hover:border-ring-accent focus-visible:border-ring disabled:border-input size-4.5 shrink-0 rounded-[4px] border shadow-xs transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f2f5f9]',
        'data-[state=checked]:bg-primary data-[state=checked]:hover:border-primary-accent data-[state=checked]:hover:bg-primary-accent dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground data-[state=checked]:disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" weight="bold" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
