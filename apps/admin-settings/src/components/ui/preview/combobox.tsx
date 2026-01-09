import { cn } from '@/lib/utils';

import { Button } from '../button';
import { PopoverTrigger } from '../popover';

function ComboboxTrigger({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        className={cn(
          'hover:bg-accent focus-visible:border-ring focus-visible:hover:border-ring-accent [&_svg:not([class*="text-"])]:text-muted-foreground w-fit min-w-[300px] justify-between font-normal shadow-none [&_svg:not([class*="text-"])]:transition-colors',
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    </PopoverTrigger>
  );
}

function ComboboxCheckbox({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-input data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground pointer-events-none size-4 shrink-0 rounded-[4px] border transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ComboboxTrigger, ComboboxCheckbox };
