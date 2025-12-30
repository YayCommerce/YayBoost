/**
 * FBT Checkbox Block - Save Component
 * Renders checkbox with Interactive API directives
 * Note: This is a dynamic block, but we need to save the structure for inner blocks
 */
export default function Save({ attributes, context }) {
  const { labelText, showLabel } = attributes;
  const { postId } = context || {};

  return (
    <div className="wp-block-yayboost-fbt-checkbox">
      <label className="yayboost-fbt-checkbox-label">
        <input
          type="checkbox"
          className="yayboost-fbt-checkbox-input"
          data-product-id={postId || 0}
          data-wp-on--click="actions.toggleProduct"
          data-wp-bind--checked="selectors.isProductSelected"
        />
        {showLabel && labelText && (
          <span className="yayboost-fbt-checkbox-text">{labelText}</span>
        )}
      </label>
    </div>
  );
}

