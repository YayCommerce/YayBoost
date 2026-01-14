/**
 * Display Position Multi-Select Component
 *
 * Multi-select component for choosing positions across multiple WooCommerce page types.
 * Displays options grouped by page type with checkboxes.
 */

import { useCallback, useMemo } from 'react';
import { __ } from '@wordpress/i18n';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import {
  type FiltersByPage,
  type PageType,
  type PositionsByPage,
  getGroupedOptions,
} from './constants';

export interface DisplayPositionMultiSelectProps {
  /** Page types to show options for */
  pageTypes: PageType[];
  /** Current selected positions by page type */
  value: PositionsByPage;
  /** Callback when selection changes */
  onChange: (value: PositionsByPage) => void;
  /** Optional: Filter positions per page type */
  allowedPositions?: FiltersByPage | null;
  /** Additional className for container */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Display Position Multi-Select
 *
 * A multi-select component for WooCommerce display positions across pages.
 *
 * @example
 * // Select positions on product and shop pages
 * <DisplayPositionMultiSelect
 *   pageTypes={['product', 'shop']}
 *   value={positions}
 *   onChange={setPositions}
 * />
 *
 * @example
 * // With filtered positions
 * <DisplayPositionMultiSelect
 *   pageTypes={['product', 'shop', 'cart']}
 *   value={positions}
 *   onChange={setPositions}
 *   allowedPositions={{
 *     product: ['below_product_title', 'below_price'],
 *     shop: null, // all shop positions
 *     cart: ['before_cart_totals'],
 *   }}
 * />
 */
export function DisplayPositionMultiSelect({
  pageTypes,
  value,
  onChange,
  allowedPositions = null,
  className = '',
  disabled = false,
}: DisplayPositionMultiSelectProps) {
  const groupedOptions = useMemo(
    () => getGroupedOptions(pageTypes, allowedPositions),
    [pageTypes, allowedPositions],
  );

  const handleToggle = useCallback(
    (pageType: PageType, positionValue: string, checked: boolean) => {
      const currentPagePositions = value[pageType] || [];

      let newPagePositions: string[];
      if (checked) {
        newPagePositions = [...currentPagePositions, positionValue];
      } else {
        newPagePositions = currentPagePositions.filter((p) => p !== positionValue);
      }

      onChange({
        ...value,
        [pageType]: newPagePositions,
      });
    },
    [value, onChange],
  );

  const isChecked = useCallback(
    (pageType: PageType, positionValue: string): boolean => {
      return value[pageType]?.includes(positionValue) ?? false;
    },
    [value],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {Object.entries(groupedOptions).map(([pageType, group]) => (
        <div key={pageType} className="space-y-2">
          <Label className="text-sm font-medium">{group.label}</Label>
          <div className="flex flex-col gap-2 pl-1">
            {group.options.map((option) => {
              const id = `position-${pageType}-${option.value}`;
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={isChecked(pageType as PageType, option.value)}
                    onCheckedChange={(checked) =>
                      handleToggle(pageType as PageType, option.value, checked === true)
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get selected positions count across all pages
 */
export function getSelectedCount(value: PositionsByPage): number {
  return Object.values(value).reduce((sum, positions) => sum + (positions?.length || 0), 0);
}
