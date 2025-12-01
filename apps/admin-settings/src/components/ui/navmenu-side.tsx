import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface SideNavMenuListProps extends React.ComponentProps<'ul'> {
  asChild?: boolean;
}

const SideNavMenuList = React.forwardRef<HTMLUListElement, SideNavMenuListProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'ul';
    return (
      <Comp
        data-slot="side-navigation-menu-list"
        className={cn(
          'flex list-none flex-row items-center justify-center gap-1 sm:flex-col',
          className,
        )}
        {...props}
        ref={ref}
      />
    );
  },
);

interface SideNavMenuItemProps extends React.ComponentProps<'li'> {
  asChild?: boolean;
}

const SideNavMenuItem = React.forwardRef<HTMLLIElement, SideNavMenuItemProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'li';
    return (
      <Comp
        data-slot="side-navigation-menu-item"
        className={cn(
          'hover:text-primary text-foreground transition-background flex h-10 w-full cursor-default items-center gap-1.5 rounded-md pl-3 text-sm transition-colors outline-none focus-visible:ring-[1.5px]',
          'data-[state=active]:text-primary data-[state=active]:hover:text-primary-accent data-[state=active]:bg-background data-[state=active]:focus-visible:text-primary-accent',
          'data-[active=true]:text-primary data-[active=true]:hover:text-primary-accent data-[active=true]:bg-background data-[active=true]:focus-visible:text-primary-accent',
          className,
        )}
        {...props}
        ref={ref}
      />
    );
  },
);

export { SideNavMenuList, SideNavMenuItem };
