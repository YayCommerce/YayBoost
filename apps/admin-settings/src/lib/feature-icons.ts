/**
 * Static Icon Map for Features
 *
 * This file contains ONLY the icons used by features and categories.
 * DO NOT use wildcard imports like `* as PhosphorIcons` - it imports ALL 7000+ icons.
 *
 * To add a new icon:
 * 1. Import the specific icon from '@phosphor-icons/react'
 * 2. Add it to the iconMap with kebab-case key matching PHP feature icon property
 */

import type { Icon } from '@phosphor-icons/react';
import {
  Chat,
  Clock,
  CreditCard,
  DotsThreeOutline,
  Gift,
  HourglassHigh,
  Lightning,
  MagnifyingGlass,
  PlusCircle,
  Record,
  Scroll,
  SealPercent,
  ShoppingCart,
  Truck,
  Users,
} from '@phosphor-icons/react';

/**
 * Icon map keyed by kebab-case icon names (matching PHP feature definitions)
 */
export const iconMap: Record<string, Icon> = {
  // Feature icons
  lightning: Lightning,
  truck: Truck,
  'hourglass-high': HourglassHigh,
  'plus-circle': PlusCircle,
  users: Users,
  gift: Gift,
  'shopping-cart': ShoppingCart,
  chat: Chat,
  record: Record,
  scroll: Scroll,

  // Category icons
  'credit-card': CreditCard,
  search: MagnifyingGlass,
  clock: Clock,
  'more-horizontal': DotsThreeOutline,
  'seal-percent': SealPercent,
};

/**
 * Default fallback icon when icon name not found in map
 */
export const DefaultIcon = Lightning;

/**
 * Get icon component by kebab-case name
 * @param iconName - kebab-case icon name (e.g., 'shopping-cart')
 * @returns Icon component or default Lightning icon
 */
export function getIcon(iconName: string): Icon {
  return iconMap[iconName] || DefaultIcon;
}

// Re-export commonly used icons for direct imports
export { MagnifyingGlass };
