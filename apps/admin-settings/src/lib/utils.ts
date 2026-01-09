import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (file: string) => {
  return window.yayboostData?.urls?.images + '/' + file;
};

export { __ } from '@wordpress/i18n';
