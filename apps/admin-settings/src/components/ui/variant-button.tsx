import React, { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { SettingsFormData } from '@/lib/schema';

type ButtonValue = string;
type DisplayOn = string;
interface ButtonItem {
  value: ButtonValue;
  state: string;
}

interface VariantButtonProps {
  list?: ButtonItem[];
  value?: ButtonValue | null;
  displayOn?: DisplayOn | null; // display on shop/categoris => displayOn: 'shop'
  onSelect: (value: ButtonValue) => void;
}

const getSwatchesDisabledStyle = (style?: string, showHideOptions?: string) => {
  switch (showHideOptions) {
    case 'show':
      switch (style) {
        case 'cross':
          return 'yay-swatches-disabled';
        case 'gray_out':
          return 'yay-swatches-disabled-grayout';
        case 'opacity':
          return 'yay-swatches-disabled-opacity';
        case 'no_effect':
          return 'yay-swatches-no-effect';
        default:
          return 'yay-swatches-disabled';
      }
    case 'show_disable':
      switch (style) {
        case 'cross':
          return 'yay-swatches-disabled yay-swatches-non-interactive';
        case 'gray_out':
          return 'yay-swatches-disabled-grayout yay-swatches-non-interactive';
        case 'opacity':
          return 'yay-swatches-disabled-opacity yay-swatches-non-interactive';
        case 'no_effect':
          return 'yay-swatches-no-effect yay-swatches-non-interactive';
        default:
          return 'yay-swatches-disabled yay-swatches-non-interactive';
      }
    default:
      return '';
  }
};

const getButtonFontSize = (size?: string) => {
  switch (size) {
    case 'small':
      return '12px';
    case 'medium':
      return '14px';
    case 'large':
      return '16px';
    default:
      return '14px';
  }
};

const getButtonPadding = (size?: string) => {
  switch (size) {
    case 'small':
      return '7px 12px';
    case 'medium':
      return '11px 16px';
    case 'large':
      return '15px 25px';
    default:
      return '11px 16px';
  }
};

const VariantButton: React.FC<VariantButtonProps> = ({
  list = [],
  value = null,
  displayOn = null,
  onSelect,
}) => {
  const { watch } = useFormContext<SettingsFormData>();
  const buttonCustomize = watch('button_customize_settings');
  const soldoutCustomize = watch('sold_out_customize_settings');
  const collecttionCustomize = watch('collection_customize_settings');
  const [limit, setLimit] = useState<number>(
    Number(collecttionCustomize?.numberButton) ?? list.length,
  );
  useEffect(() => {
    setLimit(Number(collecttionCustomize?.numberButton) ?? list.length);
  }, [
    collecttionCustomize?.numberButton,
    list.length,
    collecttionCustomize?.limit,
    collecttionCustomize?.actionPlus,
  ]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={wrapperRef}
      className="yay-variant-wrapper"
      style={
        {
          '--yay-swatches-button-border': buttonCustomize.borderNormalColor,
          '--yay-swatches-button': buttonCustomize.buttonNormalColor,
          '--yay-swatches-button-text': buttonCustomize.textNormalColor,
          '--yay-swatches-button-font-size':
            displayOn === 'shop'
              ? getButtonFontSize(collecttionCustomize?.buttonSize)
              : getButtonFontSize(buttonCustomize.buttonSize),
          '--yay-swatches-button-padding':
            displayOn === 'shop'
              ? getButtonPadding(collecttionCustomize?.buttonSize)
              : getButtonPadding(buttonCustomize.buttonSize),
          '--yay-swatches-button-border-radius': buttonCustomize.borderRadius,
          '--yay-swatches-button-border-active': buttonCustomize.borderActiveColor,
          '--yay-swatches-button-text-active': buttonCustomize.textActiveColor,
          '--yay-swatches-button-active': buttonCustomize.buttonActiveColor,
          '--yay-swatches-button-border-hover': buttonCustomize.borderHoverColor,
          '--yay-swatches-button-text-hover': buttonCustomize.textHoverColor,
          '--yay-swatches-button-hover': buttonCustomize.buttonHoverColor,
          '--yay-swatches-button-border-width': buttonCustomize.borderWidth,
          '--yay-swatches-disabled-cross-color':
            displayOn === 'shop'
              ? collecttionCustomize?.collectionCrossColor
              : soldoutCustomize.soldOutCrossColor,
          '--yay-swatches-disabled-opacity-percentage':
            displayOn === 'shop'
              ? collecttionCustomize?.collectionOpacityPercentage
              : soldoutCustomize.soldOutOpacityPercentage,
        } as React.CSSProperties
      }
    >
      {list.map((item, index) => {
        const isHidden =
          collecttionCustomize?.limit === 'show' && displayOn === 'shop' && index >= limit;

        return (
          <span
            key={`button_${item.value}`}
            className={`yay-swatches-attribute-term yay-swatches-button ${value === item.value ? 'yay-swatches-active' : ''} ${
              item.state === 'disabled'
                ? displayOn === 'shop'
                  ? getSwatchesDisabledStyle(
                      collecttionCustomize?.collectionShowStyle,
                      collecttionCustomize?.collectionShowHideOptions,
                    )
                  : getSwatchesDisabledStyle(
                      soldoutCustomize.soldOutShowStyle,
                      soldoutCustomize.soldOutShowHideOptions,
                    )
                : ''
            } ${isHidden ? 'yay-swatches-pl-hiden' : ''} `}
            onClick={() => onSelect(item.value)}
          >
            {item.value}
          </span>
        );
      })}

      {collecttionCustomize?.limit === 'show' &&
        displayOn === 'shop' &&
        list.length > (Number(collecttionCustomize?.numberButton) ?? 0) &&
        limit < list.length && (
          <span
            className="yay-swatches--plus-btn yay-swatches-button"
            onClick={() => {
              if (collecttionCustomize?.actionPlus === 'show') {
                setLimit(list.length);
              }
            }}
          >
            +
            {list.length -
              ((Number(collecttionCustomize?.numberButton) < 0
                ? 0
                : Number(collecttionCustomize?.numberButton)) ?? 0)}
          </span>
        )}
    </div>
  );
};

export default VariantButton;
