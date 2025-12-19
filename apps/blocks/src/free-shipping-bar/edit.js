/**
 * Free Shipping Bar - Editor Component
 * Uses ServerSideRender to display the same output as frontend
 */

import { __ } from "@wordpress/i18n";
import ServerSideRender from "@wordpress/server-side-render";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody } from "@wordpress/components";

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className: "yayboost-shipping-bar-block-wrapper",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost")}>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href =
                "/wp-admin/admin.php?page=yayboost#/features/free_shipping_bar";
            }}
          >
            {__("Go to settings page", "yayboost")}
          </Button>
        </PanelBody>
      </InspectorControls>
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
    </>
  );
}
