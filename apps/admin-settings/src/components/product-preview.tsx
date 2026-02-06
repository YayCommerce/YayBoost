/**
 * Product Page Preview
 *
 * Shared preview component for features displayed on the product page.
 * Layout single product: two columns (image gallery left, details right).
 * All mock elements are blurred, children render at the slot matching currentPosition and stay sharp.
 */

import { __ } from '@wordpress/i18n';

import { cn } from '@/lib/utils';

/** Product page position values (must match display-position constants) */
const PRODUCT_SLOT_ORDER = [
  'below_product_title',
  'below_price',
  'below_short_description',
  'above_add_to_cart_button',
  'below_add_to_cart_button',
  'below_meta',
] as const;

export interface ProductPreviewProps {
  /** Current display position – children are rendered in this slot */
  currentPosition: string;
  /** Content to show in the active slot (not blurred) */
  children: React.ReactNode;
  /** Optional class for the root container */
  className?: string;
}

const blurClass = 'select-none pointer-events-none';

export function ProductPreview({ currentPosition, children, className }: ProductPreviewProps) {
  const renderSlot = (slot: (typeof PRODUCT_SLOT_ORDER)[number]) => {
    const isActive = currentPosition === slot;
    return (
      isActive && (
        <div key={slot} className="min-h-10 rounded-md py-2 transition-all duration-200">
          <div className="relative z-10">{children}</div>
        </div>
      )
    );
  };

  return (
    <div
      className={cn(
        'border-border bg-card text-card-foreground min-w-[320px] overflow-hidden rounded-xl border shadow-sm',
        className,
      )}
      aria-label={__('Product page preview', 'yayboost')}
    >
      {/* Two-column layout: gallery left, details right */}
      <div className="grid grid-cols-[minmax(120px,180px)_1fr] gap-4 p-4">
        {/* Left column: product images */}
        <div className="flex w-full min-w-0 flex-col gap-2">
          {/* Main product image - blurred */}
          <div
            className={cn('bg-muted aspect-square w-full overflow-hidden rounded-lg', blurClass)}
          >
            <div className="text-muted-foreground/50 flex h-full w-full items-center justify-center text-xs">
              image
            </div>
          </div>
          {/* Thumbnail row (4) - blurred */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'bg-muted aspect-square w-full max-w-[52px] flex-1 overflow-hidden rounded-md',
                  blurClass,
                )}
                aria-hidden
              />
            ))}
          </div>
        </div>

        {/* Right column: product details */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Title - blurred */}
          <div className={cn('bg-muted mb-0.5 h-7 w-4/5 max-w-[200px] rounded', blurClass)} />

          {renderSlot('below_product_title')}

          {renderSlot('below_price')}

          {/* Short description / excerpt - blurred */}
          <div className="mt-1 flex flex-col flex-wrap">
            <div className={cn('bg-muted my-1.5 h-3 w-full max-w-[280px] rounded', blurClass)} />
            <div className={cn('bg-muted my-0.5 h-3 w-full max-w-[240px] rounded', blurClass)} />
            <div className={cn('bg-muted my-0.5 h-3 w-4/5 max-w-[200px] rounded', blurClass)} />
          </div>

          {renderSlot('below_short_description')}

          {renderSlot('above_add_to_cart_button')}

          {/* Quantity + Add to cart row - blurred */}
          <div className="my-1 flex flex-wrap items-center gap-2">
            <div
              className={cn('border-input bg-muted h-10 w-14 rounded border', blurClass)}
              aria-hidden
            />
            <div
              className={cn('bg-muted h-10 max-w-[140px] min-w-[120px] rounded-md', blurClass)}
              aria-hidden
            />
          </div>

          {renderSlot('below_add_to_cart_button')}

          {/* Product meta (SKU, Category, Tags, etc.) - blurred */}
          <div className="border-border flex flex-col gap-1 border-t pt-3">
            <div className={cn('bg-muted h-3.5 w-full max-w-[180px] rounded', blurClass)} />
            <div className={cn('bg-muted h-3.5 w-full max-w-[160px] rounded', blurClass)} />
            <div className={cn('bg-muted h-3.5 w-full max-w-[140px] rounded', blurClass)} />
            <div className={cn('bg-muted h-3.5 w-full max-w-[120px] rounded', blurClass)} />
          </div>

          {renderSlot('below_meta')}
        </div>
      </div>
    </div>
  );
}
