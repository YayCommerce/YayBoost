import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (file: string) => {
  return window.yayboostData?.urls?.images + '/' + file;
};

export { __ } from '@wordpress/i18n';

/**
 * Convert WordPress date format to date-fns format
 * WordPress: F j, Y -> date-fns: MMMM d, yyyy
 *
 * @param wpFormat WordPress date format string (e.g., "F j, Y").
 * @return date-fns format string (e.g., "MMMM d, yyyy").
 */
export function convertWordPressDateFormatToDateFns(wpFormat: string): string {
  // WordPress to date-fns format mappings
  const formatMap: Record<string, string> = {
    d: 'dd', // Day with leading zero (01-31)
    j: 'd', // Day without leading zero (1-31)
    D: 'EEE', // Day name short (Mon)
    l: 'EEEE', // Day name full (Monday)
    m: 'MM', // Month with leading zero (01-12)
    n: 'M', // Month without leading zero (1-12)
    M: 'MMM', // Month name short (Jan)
    F: 'MMMM', // Month name full (January)
    Y: 'yyyy', // Year full (2024)
    y: 'yy', // Year short (24)
    H: 'HH', // Hour 24h with leading zero (00-23)
    G: 'H', // Hour 24h without leading zero (0-23)
    i: 'mm', // Minutes with leading zero (00-59)
    s: 'ss', // Seconds with leading zero (00-59)
    A: 'a', // AM/PM
    a: 'a', // am/pm
  };

  let result = '';
  let i = 0;

  while (i < wpFormat.length) {
    const char = wpFormat[i];

    // Handle escaped characters (backslash in WordPress)
    if (char === '\\' && i + 1 < wpFormat.length) {
      // Add the next character literally (wrapped in quotes for date-fns)
      result += "'" + wpFormat[i + 1] + "'";
      i += 2;
      continue;
    }

    // Map WordPress format to date-fns, or keep as-is
    if (formatMap[char]) {
      result += formatMap[char];
    } else {
      result += char;
    }
    i++;
  }

  return result;
}
