/**
 * Purchase Activity Count - Editor Component
 * Only works on single product pages
 * Config loaded from PHP via wp_localize_script (yayboostPurchaseActivityCount)
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody, Notice } from "@wordpress/components";
import { useSelect } from "@wordpress/data";

function getConfig() {
  const data = window.yayboostPurchaseActivityCount || {};

  return {
    ...data,
  };
}

/**
 * Generate preview content similar to PHP get_content() method
 * Uses count = 1 for editor preview
 */
function getPreviewContent(config) {
  const settings = config || {};
  const text =
    settings.display?.text || "{count} customers bought this product";

  // Use count = 1 for editor preview
  const count = 1;

  const textWithCount = text.replace("{count}", count);

  return `<div class="yayboost-pac">${textWithCount}</div>`;
}

export default function Edit({ attributes, context }) {
  const blockProps = useBlockProps({
    className: "yayboost-pac-block-wrapper yayboost-pac-block-wrapper--preview",
  });

  const config = getConfig();

  const previewContent = getPreviewContent(config);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost-sales-booster-for-woocommerce")}>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href =
                "/wp-admin/admin.php?page=yayboost#/features/purchase_activity_count";
            }}
          >
            {__("Go to settings page", "yayboost-sales-booster-for-woocommerce")}
          </Button>
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div
          dangerouslySetInnerHTML={{
            __html: previewContent || __("Preview not available", "yayboost-sales-booster-for-woocommerce"),
          }}
        />
      </div>
    </>
  );
}
