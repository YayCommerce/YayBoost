import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { SettingsFormData } from '@/lib/schema';

type SwatchValue = string;
type DisplayOn = string;

interface SwatchItem {
  value: SwatchValue;
  label: string;
  state: string;
  color?: string;
  image?: string;
}

interface VariantSwatchesProps {
  list?: SwatchItem[];
  value?: SwatchValue | null;
  displayOn?: DisplayOn | null; // display on shop/categoris => displayOn: 'shop'
  onSelect: (value: SwatchValue) => void;
}

interface ImageStyleOptions {
  image: string;
  position: string;
  size?: string;
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

const getSwatchSize = (size?: string, customSize?: string) => {
  const smallSize = 28;
  const mediumSize = 36;
  const largeSize = 44;
  switch (size) {
    case 'small':
      return `${smallSize}px`;
    case 'medium':
      return `${mediumSize}px`;
    case 'large':
      return `${largeSize}px`;
    default:
      return `${customSize}px`;
  }
};

const getSwatchDesign = (design: string) => {
  switch (design) {
    case 'design_1':
      return 'yay-swatches-swatch--design-1';
    case 'design_2':
      return 'yay-swatches-swatch--design-2';
    case 'design_3':
      return 'yay-swatches-swatch--design-3';
    case 'design_4':
      return 'yay-swatches-swatch--design-4';
    case 'design_5':
      return 'yay-swatches-swatch';
    case 'design_6':
      return 'yay-swatches-swatch--design-6';
    default:
      return 'yay-swatches-swatch--design-3';
  }
};

function getPreviewImageBySize(size?: string) {
  switch (size) {
    case 'thumbnail':
      return window.yaySwatches.preview_image_url_small;
    case 'medium':
      return window.yaySwatches.preview_image_url_medium;
    case 'large':
    default:
      return window.yaySwatches.preview_image_url;
  }
}

export function getImageStyle({ image, position, size }: ImageStyleOptions): CSSProperties {
  let imagePosition = 'center';
  let imageSize = 'cover';

  switch (position) {
    case 'top':
      imagePosition = 'center top';
      break;
    case 'bottom':
      imagePosition = 'center bottom';
      break;
    case 'center':
      imagePosition = 'center center';
      imageSize = 'contain';
      break;
    default:
      break;
  }

  return {
    backgroundImage: `url(${image})`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent',
    backgroundPosition: imagePosition,
    backgroundSize: imageSize,
  };
}

const VariantSwatches: React.FC<VariantSwatchesProps> = ({
  list = [],
  value = null,
  displayOn = null,
  onSelect,
}) => {
  const { control, watch } = useFormContext<SettingsFormData>();
  const swatchCustomize = watch('swatch_customize_settings');
  const soldoutCustomize = watch('sold_out_customize_settings');
  const collecttionCustomize = watch('collection_customize_settings');
  const [limit, setLimit] = useState<number>(
    Number(collecttionCustomize?.numberSwatches) ?? list.length,
  );
  useEffect(() => {
    setLimit(Number(collecttionCustomize?.numberSwatches) ?? list.length);
  }, [
    collecttionCustomize?.numberSwatches,
    list.length,
    collecttionCustomize?.limit,
    collecttionCustomize?.actionPlus,
  ]);

  // Add tooltip tippy
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.tippy && wrapperRef.current) {
      const swatches = wrapperRef.current.querySelectorAll(
        '.yay-swatches-attribute-term[data-tippy-text]',
      );
      const options = {
        animation: swatchCustomize.swatchTooltipAnimation ? 'shift-toward' : 'fade',
        animateFill: false,
        duration: 250,
        arrow: swatchCustomize.swatchTooltipArrow || false,
        arrowType: 'sharp',
        theme: swatchCustomize.swatchTooltipBoxShadow ? 'shadow' : '',
        allowHTML: swatchCustomize.swatchTooltipImage ? true : false,
        content(reference: Element) {
          const text = reference.getAttribute('data-tippy-text') || '';
          const img = reference.getAttribute('data-tooltip-img');

          if (displayOn === 'shop') {
            return text;
          }
          if (swatchCustomize.swatchTooltipImage && img) {
            const wrapper = document.createElement('div');
            wrapper.style.textAlign = 'center';
            wrapper.innerHTML = `
              <img src="${img}" style="display:block; margin:0 auto 6px; max-width:150px; height:auto;" />
              <span>${text}</span>
            `;
            return wrapper;
          }

          return text;
        },
      };
      window.tippy(swatches, options);
    }

    return () => {
      if (wrapperRef.current) {
        const swatches = wrapperRef.current.querySelectorAll('.yay-swatches-attribute-term');
        swatches.forEach((el: any) => {
          if (el._tippy) {
            el._tippy.destroy();
          }
        });
      }
    };
  }, [list, swatchCustomize]);

  return (
    <div
      ref={wrapperRef}
      className="yay-variant-wrapper"
      style={
        {
          '--yay-swatches-swatch-border': swatchCustomize.borderNormalColor,
          '--yay-swatches-swatch-border-active': swatchCustomize.borderActiveColor,
          '--yay-swatches-swatch-border-radius': `${swatchCustomize.swatchStyle == 'circle' ? '50%' : '4px'}`,
          '--yay-swatches-swatch-size':
            displayOn === 'shop'
              ? getSwatchSize(
                  collecttionCustomize?.swatchSize,
                  collecttionCustomize?.swatchCustomSize,
                )
              : getSwatchSize(swatchCustomize.swatchSize, swatchCustomize.swatchCustomSize),
          '--yay-swatch-image-position': swatchCustomize.imagePosition,
          '--yay-swatch-image-size': swatchCustomize.imageSize,
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
            key={`swatch_${item.value}`}
            className={`yay-swatches-attribute-term ${getSwatchDesign(swatchCustomize.swatchDesign)} ${value === item.value ? 'yay-swatches-active' : ''} ${item.state === 'disabled' ? (displayOn === 'shop' ? getSwatchesDisabledStyle(collecttionCustomize?.collectionShowStyle, collecttionCustomize?.collectionShowHideOptions) : getSwatchesDisabledStyle(soldoutCustomize.soldOutShowStyle, soldoutCustomize.soldOutShowHideOptions)) : ''} ${isHidden ? 'yay-swatches-pl-hiden' : ''}`}
            onClick={() => onSelect(item.value)}
            data-tippy-text={swatchCustomize.swatchTooltip === 'enable' ? item.label : undefined}
            {...(item.image
              ? {
                  'data-tooltip-img':
                    getPreviewImageBySize(
                      displayOn === 'shop'
                        ? collecttionCustomize?.pictureSize
                        : swatchCustomize.imageSize,
                    ) || item.image,
                }
              : {})}
          >
            {item.image ? (
              <span
                className={`yay-swatches-color ${value === item.value && swatchCustomize.tickSelected === 'enable' ? 'yay-swatches-tick-selected' : ''}`}
                style={getImageStyle({
                  image:
                    getPreviewImageBySize(
                      displayOn === 'shop'
                        ? collecttionCustomize?.pictureSize
                        : swatchCustomize.imageSize,
                    ) || item.image,
                  position: swatchCustomize.imagePosition,
                  size:
                    displayOn === 'shop'
                      ? collecttionCustomize?.pictureSize
                      : swatchCustomize.imageSize,
                })}
              ></span>
            ) : (
              <span
                className={`yay-swatches-color ${value === item.value && swatchCustomize.tickSelected === 'enable' ? 'yay-swatches-tick-selected' : ''}`}
                style={
                  {
                    background: item.color,
                    '--yay-swatches-tick-color': item.color === '#2196f3' ? '#fff' : '#000',
                  } as React.CSSProperties
                }
              ></span>
            )}
          </span>
        );
      })}
      {collecttionCustomize?.limit === 'show' &&
        displayOn === 'shop' &&
        list.length > (Number(collecttionCustomize?.numberSwatches) ?? 0) &&
        limit < list.length && (
          <span
            className="yay-swatches--plus-btn yay-swatches-swatch"
            onClick={() => {
              if (collecttionCustomize?.actionPlus === 'show') {
                setLimit(list.length);
              }
            }}
          >
            +
            {list.length -
              ((Number(collecttionCustomize?.numberSwatches) < 0
                ? 0
                : Number(collecttionCustomize?.numberSwatches)) ?? 0)}
          </span>
        )}
    </div>
  );
};

export default VariantSwatches;
