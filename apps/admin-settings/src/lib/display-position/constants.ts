/**
 * Display Position Constants
 *
 * Mirrors the PHP DisplayPositionService for admin UI.
 * Single source of truth for WooCommerce page positions.
 */

import { __ } from '@wordpress/i18n';

/** Page type constants */
export const PAGE_PRODUCT = 'product' as const;
export const PAGE_SHOP = 'shop' as const;
export const PAGE_CART = 'cart' as const;
export const PAGE_CHECKOUT = 'checkout' as const;

/** Special position for Gutenberg block usage */
export const POSITION_USE_BLOCK = 'use_block' as const;

export type PageType = typeof PAGE_PRODUCT | typeof PAGE_SHOP | typeof PAGE_CART | typeof PAGE_CHECKOUT;

export interface PositionOption {
  value: string;
  label: string;
}

/** Product page positions */
export const PRODUCT_PAGE_POSITIONS: PositionOption[] = [
  { value: 'below_product_title', label: __('Below product title', 'yayboost') },
  { value: 'below_price', label: __('Below price', 'yayboost') },
  { value: 'above_add_to_cart_button', label: __('Above Add to Cart button', 'yayboost') },
  { value: 'below_add_to_cart_button', label: __('Below Add to Cart button', 'yayboost') },
  { value: 'below_short_description', label: __('Below short description', 'yayboost') },
  { value: 'below_meta', label: __('Below product meta', 'yayboost') },
];

/** Shop/category page positions */
export const SHOP_PAGE_POSITIONS: PositionOption[] = [
  { value: 'before_shop_loop_item', label: __('Before product item', 'yayboost') },
  { value: 'before_shop_loop_item_title', label: __('Before product title', 'yayboost') },
  { value: 'after_shop_loop_item_title', label: __('After product title', 'yayboost') },
  { value: 'after_shop_loop_item', label: __('After product item', 'yayboost') },
  { value: 'after_shop_loop_item_late', label: __('After product item (late)', 'yayboost') },
];

/** Cart page positions */
export const CART_PAGE_POSITIONS: PositionOption[] = [
  { value: 'before_cart', label: __('Before cart', 'yayboost') },
  { value: 'before_cart_table', label: __('Before cart table', 'yayboost') },
  { value: 'after_cart_table', label: __('After cart table', 'yayboost') },
  { value: 'before_cart_totals', label: __('Before cart totals', 'yayboost') },
  { value: 'after_cart_totals', label: __('After cart totals', 'yayboost') },
  { value: 'proceed_to_checkout', label: __('Near proceed to checkout', 'yayboost') },
  { value: 'after_cart', label: __('After cart', 'yayboost') },
];

/** Checkout page positions */
export const CHECKOUT_PAGE_POSITIONS: PositionOption[] = [
  { value: 'before_checkout_form', label: __('Before checkout form', 'yayboost') },
  { value: 'before_checkout_billing_form', label: __('Before billing form', 'yayboost') },
  { value: 'after_checkout_billing_form', label: __('After billing form', 'yayboost') },
  { value: 'before_checkout_shipping_form', label: __('Before shipping form', 'yayboost') },
  { value: 'after_checkout_shipping_form', label: __('After shipping form', 'yayboost') },
  { value: 'before_order_notes', label: __('Before order notes', 'yayboost') },
  { value: 'after_order_notes', label: __('After order notes', 'yayboost') },
  { value: 'review_order_before_payment', label: __('Before payment section', 'yayboost') },
  { value: 'review_order_after_payment', label: __('After payment section', 'yayboost') },
  { value: 'after_checkout_form', label: __('After checkout form', 'yayboost') },
];

/** Use Block option */
export const USE_BLOCK_OPTION: PositionOption = {
  value: POSITION_USE_BLOCK,
  label: __('Use Gutenberg Block', 'yayboost'),
};

/** Map page types to their positions */
const PAGE_POSITIONS_MAP: Record<PageType, PositionOption[]> = {
  [PAGE_PRODUCT]: PRODUCT_PAGE_POSITIONS,
  [PAGE_SHOP]: SHOP_PAGE_POSITIONS,
  [PAGE_CART]: CART_PAGE_POSITIONS,
  [PAGE_CHECKOUT]: CHECKOUT_PAGE_POSITIONS,
};

/**
 * Get positions for a page type with optional filtering
 *
 * @param pageType - The page type (product, shop, cart, checkout)
 * @param filter - Optional array of position values to include (null = all)
 * @param includeUseBlock - Whether to include the "Use Block" option
 * @returns Array of position options
 */
export function getPositionOptions(
  pageType: PageType,
  filter?: string[] | null,
  includeUseBlock = false,
): PositionOption[] {
  const allPositions = PAGE_POSITIONS_MAP[pageType] || [];

  let positions = filter
    ? allPositions.filter((pos) => filter.includes(pos.value))
    : allPositions;

  if (includeUseBlock) {
    positions = [...positions, USE_BLOCK_OPTION];
  }

  return positions;
}

/**
 * Get all position values for a page type (for Zod schema)
 *
 * @param pageType - The page type
 * @param filter - Optional filter
 * @param includeUseBlock - Whether to include use_block
 * @returns Array of position value strings
 */
export function getPositionValues(
  pageType: PageType,
  filter?: string[] | null,
  includeUseBlock = false,
): string[] {
  return getPositionOptions(pageType, filter, includeUseBlock).map((p) => p.value);
}
