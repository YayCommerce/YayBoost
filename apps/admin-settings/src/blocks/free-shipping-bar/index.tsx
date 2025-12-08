import { useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

registerBlockType('yayboost/free-shipping-bar', {
  title: __('Free Shipping Bar', 'yayboost'),
  description: __('Display a free shipping progress bar.', 'yayboost'),
  icon: 'cart',
  category: 'widgets',
  edit: () => {
    const blockProps = useBlockProps({
      className: 'yayboost-shipping-bar-block-editor',
    });

    // Preview data (similar to actual render)
    const previewData = {
      message: __('Add $25.00 more for free shipping!', 'yayboost'),
      progress: 60,
      achieved: false,
    };

    return (
      <div {...blockProps}>
        <div className="yayboost-shipping-bar-block-preview">
          <div className="yayboost-shipping-bar">
            <div className="yayboost-shipping-bar__message">{previewData.message}</div>
            {!previewData.achieved && (
              <div className="yayboost-shipping-bar__progress">
                <div
                  className="yayboost-shipping-bar__progress-fill"
                  style={{ width: `${previewData.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
        <p className="yayboost-shipping-bar-block-note">
          {__(
            'This block will display the actual free shipping progress based on cart contents.',
            'yayboost',
          )}
        </p>
      </div>
    );
  },
  save: () => null,
});
