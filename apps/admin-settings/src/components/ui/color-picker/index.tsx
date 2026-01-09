import './color-picker.css';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopySimpleIcon } from '@phosphor-icons/react';
import {
  ColorPalette,
  __experimentalInputControl as InputControl,
  Button as WPButton,
  ColorPicker as WPColorPicker,
} from '@wordpress/components';

import { __, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ColorPickerProps {
  value?: string;
  defaultColor?: string;
  onChangeColor?: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ColorPicker({
  value,
  defaultColor = '#ffffff',
  onChangeColor,
  className,
  disabled = false,
}: ColorPickerProps) {
  const colors = [
    { name: 'Black', color: '#181818' },
    { name: 'White', color: '#F5F5F5' },
    { name: 'Red', color: '#E7210A' },
    { name: 'Orange', color: '#F54A00' },
    { name: 'Green', color: '#5EA500' },
    { name: 'Blue', color: '#165CFB' },
    { name: 'Yellow', color: '#FDC700' },
  ];

  const displayColor = value || defaultColor;
  const inputValue = displayColor.replace(/^#/, '').slice(0, 6);

  const [copied, setCopied] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleOpenAutoFocus = (event: Event) => {
    const isColorInPalette = colors.some((color) => color.color === displayColor);

    if (!isColorInPalette) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
  };

  const handleChange = (newColor?: string) => {
    if (!newColor) return;
    const normalized = newColor.startsWith('#') ? newColor : `#${newColor}`;
    const trimmed = normalized.replace(/^#/, '').slice(0, 6);
    const finalColor = `#${trimmed}`;
    onChangeColor?.(finalColor);
  };

  const handleInputChange = (nextValue?: string) => {
    const raw = nextValue ?? '';
    const truncated = raw.slice(0, 6);
    const candidate = `#${truncated}`;
    const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(candidate);

    if (isValidHex) {
      onChangeColor?.(candidate);
    } else {
      onChangeColor?.('#000000');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayColor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleClear = () => {
    onChangeColor?.(defaultColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-8.5 w-[110px] cursor-pointer justify-start rounded-sm p-1 hover:bg-[#F9F9F9]',
            className,
          )}
        >
          <span
            className="h-6.5 w-6.5 rounded-[4px] border"
            style={{ backgroundColor: displayColor }}
          />
          <span className="text-start font-normal">{displayColor}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-fit min-w-[200px] px-1 py-3"
        align="start"
        sideOffset={5}
        onOpenAutoFocus={handleOpenAutoFocus}
        ref={contentRef}
      >
        <div className="flex flex-col gap-2">
          <div className="px-2">
            <ColorPalette
              colors={colors}
              value={displayColor}
              onChange={(newColor = '#000000') => handleChange(newColor)}
              disableCustomColors={true}
              clearable={false}
              className="yay-wp-color-palette"
            />
          </div>

          <WPColorPicker
            className="yay-wp-color-picker"
            color={displayColor}
            onChange={handleChange}
            enableAlpha={false}
            defaultValue={defaultColor}
            copyFormat="hex"
          />

          <div className="flex items-center justify-between gap-3 px-3">
            <div className="flex items-center gap-2">
              <InputControl
                __next40pxDefaultSize
                prefix={<span className="ml-3">#</span>}
                value={inputValue}
                onChange={handleInputChange}
                className="yay-wp-color-input"
              />
              <WPButton onClick={handleCopy}>
                {copied ? <CheckIcon size={24} /> : <CopySimpleIcon size={24} />}
              </WPButton>
            </div>
            <Button
              className="w-fit cursor-pointer"
              variant="outline"
              type="button"
              onClick={handleClear}
            >
              {__('Reset', 'yayboost')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
