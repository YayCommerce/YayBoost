/**
 * FBT Checkbox Block - Editor Component
 */
import { __ } from "@wordpress/i18n";
import { InspectorControls, RichText, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";

const Edit = (props) => {
  const { attributes, setAttributes, context } = props;
  const { labelText, showLabel, checked } = attributes;
  const { postId } = context || {};

  const blockProps = useBlockProps({
    className: "wp-block-yayboost-fbt-checkbox",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost")} initialOpen={true}>
          <ToggleControl
            label={__("Show Label", "yayboost")}
            checked={showLabel}
            onChange={(value) => setAttributes({ showLabel: value })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <label className="yayboost-fbt-checkbox-label">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="yayboost-fbt-checkbox-input"
            data-product-id={postId || 0}
          />
          {showLabel && (
            <RichText
              tagName="span"
              className="yayboost-fbt-checkbox-text"
              value={labelText}
              onChange={(value) => setAttributes({ labelText: value ?? "" })}
              placeholder={__("Select product", "yayboost")}
              keepPlaceholderOnFocus={true}
            />
          )}
        </label>
      </div>
    </>
  );
};

export default Edit;

