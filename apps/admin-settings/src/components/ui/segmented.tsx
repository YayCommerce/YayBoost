import * as React from 'react';
import * as SegmentedPrimitive from '@radix-ui/react-toggle-group';
import { ToggleGroupSingleProps } from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const segmentedVariants = cva('', {
  variants: {
    shape: {
      default: 'rounded-[100px]',
      custom: 'rounded-md',
    },
    size: {
      default: 'h-9 min-w-9',
      sm: 'h-8  min-w-8',
      lg: 'h-10 min-w-10',
    },
  },
  defaultVariants: {
    shape: 'default',
    size: 'default',
  },
});

const SegmentedContext = React.createContext<VariantProps<typeof segmentedVariants>>({
  size: 'default',
  shape: 'default',
});

type SegmentedProps = Omit<ToggleGroupSingleProps, 'type'> & VariantProps<typeof segmentedVariants>;
function Segmented({ className, size, shape, children, ...props }: SegmentedProps) {
  return (
    <SegmentedPrimitive.Root
      data-slot="toggle-group"
      data-size={size}
      type="single"
      className={cn(
        segmentedVariants({ size, shape }),
        'bg-muted inline-flex w-fit items-center justify-center gap-2.5 p-[4px] text-[#495057]',
        className,
      )}
      {...props}
    >
      <SegmentedContext.Provider value={{ size, shape }}>{children}</SegmentedContext.Provider>
    </SegmentedPrimitive.Root>
  );
}

function SegmentedItem({
  className,
  children,
  size,
  shape,
  ...props
}: React.ComponentProps<typeof SegmentedPrimitive.Item> & VariantProps<typeof segmentedVariants>) {
  const context = React.useContext(SegmentedContext);

  return (
    <SegmentedPrimitive.Item
      data-slot="toggle-group-item"
      data-size={context.size || size}
      data-shape={shape ?? context.shape ?? 'default'}
      className={cn(
        "data-[state=on]:bg-background data-[state=on]:text-foreground hover:bg-muted dark:data-[state=on]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=on]:border-input dark:data-[state=on]:bg-input/30 dark:text-muted-foreground inline-flex h-full cursor-pointer items-center justify-center gap-1.5 border border-transparent px-3 py-[9px] text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[shape=custom]:w-[120px] data-[shape=custom]:rounded-sm data-[shape=default]:rounded-[100px] data-[state=on]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </SegmentedPrimitive.Item>
  );
}

export { Segmented, SegmentedItem };
