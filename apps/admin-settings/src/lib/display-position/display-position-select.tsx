/**
 * Display Position Select Component
 *
 * Reusable select component for choosing WooCommerce display positions.
 * Supports filtering to specific positions per feature.
 */

import { __ } from '@wordpress/i18n';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  type PageType,
  type PositionOption,
  POSITION_USE_BLOCK,
  getPositionOptions,
} from './constants';

export interface DisplayPositionSelectProps {
  /** Page type to show positions for */
  pageType: PageType;
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Optional: Limit to specific position values (null = all) */
  allowedPositions?: string[] | null;
  /** Whether to include "Use Gutenberg Block" option */
  includeUseBlock?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className for trigger */
  className?: string;
  /** Trigger size */
  size?: 'sm' | 'default';
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Display Position Select
 *
 * A reusable select component for WooCommerce display positions.
 *
 * @example
 * // Show all product page positions
 * <DisplayPositionSelect
 *   pageType="product"
 *   value={position}
 *   onValueChange={setPosition}
 * />
 *
 * @example
 * // Show only specific positions with "Use Block" option
 * <DisplayPositionSelect
 *   pageType="product"
 *   value={position}
 *   onValueChange={setPosition}
 *   allowedPositions={['below_product_title', 'below_price']}
 *   includeUseBlock
 * />
 */
export function DisplayPositionSelect({
  pageType,
  value,
  onValueChange,
  allowedPositions = null,
  includeUseBlock = false,
  placeholder,
  className = 'w-64',
  size = 'default',
  disabled = false,
}: DisplayPositionSelectProps) {
  const positions = getPositionOptions(pageType, allowedPositions, includeUseBlock);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className} size={size}>
        <SelectValue placeholder={placeholder || __('Select position', 'yayboost')} />
      </SelectTrigger>
      <SelectContent>
        {positions.map((position) => (
          <SelectItem key={position.value} value={position.value}>
            {position.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Check if a position value is the "Use Block" option
 */
export function isUseBlockPosition(value: string): boolean {
  return value === POSITION_USE_BLOCK;
}
