/**
 * Frequently Bought Together Block - Editor Component
 */
import { useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { useInstanceId } from "@wordpress/compose";
import { useEffect } from "@wordpress/element";
import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

const DEFAULT_QUERY = {
  perPage: -1, // -1 means no pagination (show all items)
  pages: 0,
  offset: 0,
  postType: "product",
  order: "asc",
  orderBy: "title",
  search: "",
  exclude: [],
  inherit: false,
  taxQuery: {},
  isFBTQuery: true,
};

const DEFAULT_ATTRIBUTES = {
  query: DEFAULT_QUERY,
  displayLayout: {
    type: "flex",
    columns: 4,
    shrinkColumns: true,
  },
  currentProductId: 0,
};

const INNER_BLOCKS_PRODUCT_TEMPLATE = [
  "woocommerce/product-template",
  {},
  [
    [
      "woocommerce/product-image",
      {
        imageSizing: "thumbnail",
      },
    ],
    [
      "core/post-title",
      {
        textAlign: "center",
        level: 3,
        fontSize: "medium",
        style: {
          spacing: {
            margin: {
              bottom: "0.75rem",
              top: "0",
            },
          },
        },
        isLink: true,
        __woocommerceNamespace: "woocommerce/product-title",
      },
    ],
    [
      "woocommerce/product-price",
      {
        textAlign: "center",
        fontSize: "small",
      },
    ],
    [
      "woocommerce/product-button",
      {
        textAlign: "center",
        fontSize: "small",
      },
    ],
  ],
];

const INNER_BLOCKS_TEMPLATE = [INNER_BLOCKS_PRODUCT_TEMPLATE];

const Edit = (props) => {
  const { attributes, setAttributes } = props;
  const { queryId } = attributes;

  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: INNER_BLOCKS_TEMPLATE,
  });

  const instanceId = useInstanceId(Edit);

  useEffect(() => {
    if (!Number.isFinite(queryId)) {
      setAttributes({ queryId: Number(instanceId) });
    }
  }, [queryId, instanceId, setAttributes]);

  useEffect(() => {
    setAttributes({
      ...DEFAULT_ATTRIBUTES,
      query: {
        ...DEFAULT_ATTRIBUTES.query,
      },
      ...attributes,
    });
  }, [setAttributes]);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost")}>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href =
                "/wp-admin/admin.php?page=yayboost#/features/frequently_bought_together";
            }}
          >
            {__("Go to settings page", "yayboost")}
          </Button>
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div {...innerBlocksProps} />
      </div>
    </>
  );
};

export default Edit;
