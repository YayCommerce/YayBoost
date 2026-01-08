import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { Button, PanelBody, Spinner } from "@wordpress/components";
import { useState, useEffect } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";

function formatPrice(price, currency) {
  if (!price) return "";
  
  const symbol = currency?.symbol || "$";
  const position = currency?.position || "left";
  
  if (position === "right") {
    return `${price}${symbol}`;
  }
  return `${symbol}${price}`;
}

/**
 * Get real WooCommerce products
 * @returns {object} Products and loading state
 */
function useRealProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from WooCommerce REST API
    apiFetch({
      path: "/wc/store/products?per_page=6&orderby=popularity",
    })
      .then((response) => {
        const formattedProducts = response.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.prices?.price || product.price,
          regular_price: product.prices?.regular_price || product.regular_price,
          sale_price: product.prices?.sale_price || product.sale_price,
          currency: product.prices?.currency_code ? {
            code: product.prices.currency_code,
            symbol: product.prices.currency_symbol,
            minorUnit: product.prices.currency_minor_unit,
            position: product.prices.currency_prefix ? "left" : "right",
          } : null,
          image: product.images?.[0]?.src || "",
          url: product.permalink,
        }));
        setProducts(formattedProducts);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      });
  }, []);

  return { products, loading };
}

/**
 * Render product grid (matches product-grid.php structure)
 * @param {array} products Products data
 * @returns {JSX.Element} Product grid
 */
function renderProductGrid(products) {
  return (
    <div className="yayboost-recommendations__grid">
      {products.map((product) => {
        const hasDiscount = product.regular_price && product.price < product.regular_price;
        
        return (
          <div key={product.id} className="yayboost-recommendations__item" data-product-id={product.id}>
            <div className="yayboost-recommendations__item-image">
              <a href={product.url}>
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="yayboost-recommendations__no-image">
                    {__("No image", "yayboost")}
                  </div>
                )}
              </a>
            </div>
            <div className="yayboost-recommendations__item-content">
              <h4 className="yayboost-recommendations__item-title">
                <a href={product.url}>{product.name}</a>
              </h4>
              <div className="yayboost-recommendations__item-price">
                {hasDiscount && (
                  <del>{formatPrice(product.regular_price, product.currency)}</del>
                )}{" "}
                <span className={hasDiscount ? "sale-price" : ""}>
                  {formatPrice(product.price, product.currency)}
                </span>
              </div>
              <div className="yayboost-recommendations__item-actions">
                <button className="yayboost-recommendations__add-to-cart">
                  {__("Add to cart", "yayboost")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Edit({ attributes }) {
  const blockProps = useBlockProps({
    className:
      "yayboost-recommendations-block-wrapper yayboost-recommendations-block-wrapper--preview",
  });

  // Fetch real products
  const { products, loading } = useRealProducts();

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", "yayboost")}>
          <p style={{ marginBottom: "12px", fontSize: "13px", color: "#6b7280" }}>
            {__(
              "This block displays product recommendations based on rules configured in the feature settings.",
              "yayboost"
            )}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href =
                "/wp-admin/admin.php?page=yayboost#/features/smart_recommendations";
            }}
          >
            {__("Go to settings page", "yayboost")}
          </Button>
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
          <div className="yayboost-recommendations yayboost-recommendations--grid">
            <div className="yayboost-recommendations__header">
              <h3 className="yayboost-recommendations__title">
                {__("Pairs perfectly with", "yayboost")}
              </h3>
            </div>
            <div className="yayboost-recommendations__content">
              {loading ? (
                <div className="yayboost-recommendations__loading">
                  <div className="yayboost-recommendations__spinner"></div>
                  <p>{__("Loading products...", "yayboost")}</p>
                </div>
              ) : (
                renderProductGrid(products)
              )}
            </div>
          </div>
      </div>
    </>
  );
}