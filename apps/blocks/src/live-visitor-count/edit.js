/**
 * Live Visitor Count - Editor Component
 * Only works on single product pages
 * Config loaded from PHP via wp_localize_script (yayboostLiveVisitorCount)
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody, Notice } from "@wordpress/components";
import { useSelect } from "@wordpress/data";

function getConfig() {
  const data = window.yayboostLiveVisitorCount || {};

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
  const trackingMode = settings.tracking_mode || "real-tracking";
  const style = settings.style?.style || "style_1";
  const textColor = settings.style?.text_color || "#a74c3c";
  const backgroundColor = settings.style?.background_color || "#fff3f3";
  const text =
    settings.display?.text || "👁️ {count} visitors are viewing this page";
  const icon = settings.display?.icon || "eye";
  const minimumCountDisplay =
    parseInt(settings.real_tracking?.minimum_count_display) || 1;

  // Use count = 1 for editor preview
  const count = 1;

  // Check minimum count display for real-tracking mode
  if (trackingMode === "real-tracking" && count < minimumCountDisplay) {
    return "";
  }

  const textWithCount = text.replace(
    "{count}",
    `<span id="yayboost-lvc-number">${count}</span>`
  );

  if ( style === 'style_2' ) {
    return `<div class="yayboost-lvc yayboost-lvc-style-2" style="color: ${textColor}; background-color: ${backgroundColor};">${textWithCount}</div>`;
  }

  if (style === "style_3") {
    return `<div class="yayboost-lvc yayboost-lvc-style-3"><div class="yayboost-lvc-text" style="color: ${textColor}; background-color: ${backgroundColor};">${textWithCount}</div><div class="yayboost-lvc-icon">${iconHtml} <span id="yayboost-lvc-number">${count}</span></div></div>`;
  }
  
  return `<div class="yayboost-lvc yayboost-lvc-style-1" style="color: ${textColor};">${textWithCount}</div>`;

}

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className: "yayboost-lvc-block-wrapper yayboost-lvc-block-wrapper--preview",
  });

  const config = getConfig();

  // Check if we're on a product page or editing a single product template
  const { currentPostType, isSingleProductTemplate } = useSelect((select) => {
    // Check if we're in the post editor (editing a product)
    const postType = select("core/editor")?.getCurrentPostType?.();

    // Check if we're in the site editor (editing a template)
    const editSiteStore = select("core/edit-site");
    let isSingleProductTemplate = false;

    if (editSiteStore) {
      const templateId = editSiteStore.getEditedPostId?.();
      if (templateId) {
        // Check if template ID contains 'single-product'
        // Template IDs can be like '/wp_template/WooCommerce-Theme//single-product'
        isSingleProductTemplate =
          typeof templateId === "string" &&
          templateId.includes("single-product");
      }
    }

    return {
      currentPostType: postType || null,
      isSingleProductTemplate,
    };
  }, []);

  const isProductPage =
    currentPostType === "product" || isSingleProductTemplate;

  const previewContent = getPreviewContent(config);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost")}>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href =
                "/wp-admin/admin.php?page=yayboost#/features/live_visitor_count";
            }}
          >
            {__("Go to settings page", "yayboost")}
          </Button>
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        {!isProductPage && (
          <Notice status="warning" isDismissible={false}>
            {__(
              "This block only works on single product pages. Please use it only in product page templates.",
              "yayboost"
            )}
          </Notice>
        )}
        {isProductPage && (
          <div
            dangerouslySetInnerHTML={{
              __html: previewContent || __("Preview not available", "yayboost"),
            }}
          />
        )}
      </div>
    </>
  );
}
