/**
 * Free Shipping Bar - Editor Component
 * Uses buildBarHtml() from helpers.js to render preview
 */

import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody } from "@wordpress/components";
import { buildBarHtml } from "./helpers";

// Mock data for preview
const mockData = {
  threshold: 100,
  current: 75,
  remaining: 25,
  progress: 75,
  achieved: false,
  message: __("Add $25.00 more for free shipping!", "yayboost"),
  show_coupon_message: false,
};

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className:
      "yayboost-shipping-bar-block-wrapper yayboost-shipping-bar-block-wrapper--preview",
  });

  // Get HTML from buildBarHtml helper (reuses same logic as frontend)
  const previewHtml = buildBarHtml(mockData);

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
        {previewHtml ? (
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
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
              {__(
                "Settings not available. Please configure the feature.",
                "yayboost"
              )}
            </small>
          </div>
        )}
      </div>
    </>
  );
}
