/**
 * Free Shipping Bar - Editor Component
 * Uses ServerSideRender to display the same output as frontend
 */

import { __ } from "@wordpress/i18n";
import { useBlockProps } from "@wordpress/block-editor";
import ServerSideRender from "@wordpress/server-side-render";

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className: "yayboost-shipping-bar-block-wrapper",
  });

  return (
    <div {...blockProps}>
      <ServerSideRender
        block="yayboost/free-shipping-bar"
        attributes={attributes}
        EmptyResponsePlaceholder={() => (
          <div
            style={{
              padding: "20px",
              background: "#f0f9ff",
              border: "1px dashed #3b82f6",
              borderRadius: "8px",
              textAlign: "center",
              color: "#1e40af",
            }}
          >
            🚚 {__("Free Shipping Bar Preview", "yayboost")}
            <br />
            <small>
              {__("Enable the feature to see the preview.", "yayboost")}
            </small>
          </div>
        )}
      />
    </div>
  );
}
