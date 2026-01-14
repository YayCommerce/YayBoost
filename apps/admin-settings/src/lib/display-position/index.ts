/**
 * Display Position Module
 *
 * Provides utilities and components for WooCommerce display positions.
 */

// Constants and types
export {
  PAGE_PRODUCT,
  PAGE_SHOP,
  PAGE_CART,
  PAGE_CHECKOUT,
  POSITION_USE_BLOCK,
  PRODUCT_PAGE_POSITIONS,
  SHOP_PAGE_POSITIONS,
  CART_PAGE_POSITIONS,
  CHECKOUT_PAGE_POSITIONS,
  USE_BLOCK_OPTION,
  getPositionOptions,
  getPositionValues,
  type PageType,
  type PositionOption,
} from './constants';

// Components
export {
  DisplayPositionSelect,
  isUseBlockPosition,
  type DisplayPositionSelectProps,
} from './display-position-select';
