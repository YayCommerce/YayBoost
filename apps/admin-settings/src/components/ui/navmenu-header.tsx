import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface HeaderNavMenuListProps extends React.ComponentProps<'ul'> {
  asChild?: boolean;
  activeValue?: string;
}

const HeaderNavMenuList = React.forwardRef<HTMLUListElement, HeaderNavMenuListProps>(
  ({ className, asChild = false, activeValue, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'ul';
    const itemRefs = React.useRef<Record<string, HTMLLIElement | null>>({});
    const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });

    React.useEffect(() => {
      if (activeValue && itemRefs.current[activeValue]) {
        const el = itemRefs.current[activeValue];
        if (el) {
          const { offsetLeft, offsetWidth } = el;
          setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
        }
      }
    }, [activeValue, children]);

    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && typeof child.props?.value === 'string') {
        const value = child.props.value;

        return React.cloneElement(
          child as React.ReactElement & { ref?: React.Ref<HTMLLIElement> },
          {
            ref: (el: HTMLLIElement) => {
              itemRefs.current[value] = el;
            },
          },
        );
      }
      return child;
    });

    return (
      <Comp
        data-slot="header-navigation-menu-list"
        className={cn(
          'relative flex h-9 flex-1 list-none items-stretch justify-center gap-8',
          className,
        )}
        {...props}
        ref={ref}
      >
        {enhancedChildren}

        <div
          className="absolute bottom-0 h-[3px] bg-[#333333]"
          style={{
            width: `${indicatorStyle.width}px`,
            left: `${indicatorStyle.left}px`,
            transition: 'width 0.3s, left 0.3s, right 0.3s',
          }}
        />
      </Comp>
    );
  },
);

interface HeaderNavMenuItemProps extends React.ComponentProps<'li'> {
  asChild?: boolean;
}

const HeaderNavMenuItem = React.forwardRef<HTMLLIElement, HeaderNavMenuItemProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'li';
    return (
      <Comp
        data-slot="header-navigation-menu-item"
        className={cn(
          'transition-border-color flex cursor-default items-center gap-1.5 border-b-3 border-solid border-transparent text-sm text-[#000000E0] ring-offset-2 transition-colors outline-none hover:cursor-pointer hover:border-[#e6e8eb] focus-visible:ring-[1.5px]',
          'data-[state=active]:focus-visible:text-primary-accent text-shadow-[0_0_0.25px_currentcolor] data-[state=active]:text-[#333333]',
          'data-[active=true]:focus-visible:text-primary-accent text-shadow-[0_0_0.25px_currentcolor] data-[active=true]:text-[#333333]',
          className,
        )}
        {...props}
        ref={ref}
      />
    );
  },
);

export { HeaderNavMenuList, HeaderNavMenuItem };
