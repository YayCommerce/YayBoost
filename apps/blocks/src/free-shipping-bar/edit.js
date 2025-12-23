/**
 * Free Shipping Bar - Editor Component
 * Uses buildBarHtml() from helpers.js to render preview
 * Config loaded from PHP via wp_localize_script (yayboostShippingBar)
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody } from "@wordpress/components";
import { buildBarHtml } from "./helpers";

/**
 * Get config from localized data or fallback to defaults
 * @returns {object} Config object with settings, templates, thresholdInfo
 */
function getConfig() {
  const data = window.yayboostShippingBar || {};

  return {
    ...data,
    thresholdInfo: {
      min_amount: 100,
      requires_coupon: false,
      requires_type: "min_amount",
    },
  };
}

/**
 * Get mock bar data for preview
 * Uses threshold from real config if available
 * @param {object} config Config object
 * @returns {object} Mock bar data
 */
function getMockBarData(config) {
  const threshold = config.thresholdInfo?.min_amount || 100;
  const current = Math.round(threshold * 0.75); // 75% progress
  const remaining = threshold - current;

  return {
    threshold,
    current,
    remaining,
    progress: 75,
    achieved: false,
    message: (
      config.settings?.messageProgress ||
      "Add {remaining} more for free shipping!"
    ).replace("{remaining}", `$${remaining.toFixed(2)}`),
    show_coupon_message: false,
  };
}

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className:
      "yayboost-shipping-bar-block-wrapper yayboost-shipping-bar-block-wrapper--preview",
  });

  // Get config from PHP localized data (real settings) or fallback
  const config = getConfig();

  // Get mock bar data using real threshold
  const mockData = getMockBarData(config);

  // Build HTML using real config (templates, settings)
  const previewHtml = buildBarHtml(mockData, config);

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
