<?php
/**
 * Entity REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Repository\EntityRepository;
use YayBoost\Utils\Price;

/**
 * Handles entity CRUD API endpoints for features
 */
class EntityController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // List entities for a feature
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities',
            WP_REST_Server::READABLE,
            [ $this, 'get_entities' ]
        );

        // Create entity
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities',
            WP_REST_Server::CREATABLE,
            [ $this, 'create_entity' ]
        );

        // Get single entity
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities/(?P<id>\d+)',
            WP_REST_Server::READABLE,
            [ $this, 'get_entity' ]
        );

        // Update entity
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities/(?P<id>\d+)',
            WP_REST_Server::EDITABLE,
            [ $this, 'update_entity' ]
        );

        // Delete entity
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities/(?P<id>\d+)',
            WP_REST_Server::DELETABLE,
            [ $this, 'delete_entity' ]
        );

        // Bulk operations
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities/bulk',
            WP_REST_Server::EDITABLE,
            [ $this, 'bulk_action' ]
        );

        // Reorder entities
        $this->register_route(
            '/features/(?P<feature_id>[a-zA-Z0-9_-]+)/entities/reorder',
            WP_REST_Server::EDITABLE,
            [ $this, 'reorder_entities' ]
        );
    }

    /**
     * Get repository for feature
     *
     * @param string $feature_id
     * @param string $entity_type
     * @return EntityRepository
     */
    protected function get_repository(string $feature_id, string $entity_type = 'default'): EntityRepository {
        return new EntityRepository( $feature_id, $entity_type );
    }

    /**
     * Get entity type from request
     *
     * @param WP_REST_Request $request
     * @return string
     */
    protected function get_entity_type(WP_REST_Request $request): string {
        return $request->get_param( 'entity_type' ) ?: 'default';
    }

    /**
     * Get entities list
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_entities(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );

        $repository = $this->get_repository( $feature_id, $entity_type );

        $args = [
            'status'  => $request->get_param( 'status' ),
            'orderby' => $request->get_param( 'orderby' ) ?: 'priority',
            'order'   => $request->get_param( 'order' ) ?: 'ASC',
            'limit'   => $request->get_param( 'per_page' ) ?: 100,
            'offset'  => $request->get_param( 'offset' ) ?: 0,
        ];

        $entities = $repository->get_all( $args );
        $total    = $repository->count( $args['status'] );

        if ( $feature_id === 'order_bump' && $entity_type === 'bump' ) {
            $entities = $this->enrich_entities( $entities );
        }

        return $this->success(
            [
                'items' => $entities,
                'total' => $total,
            ]
        );
    }

    /**
     * Enrich entities with product_name and price_display for list display.
     *
     * @param array $entities List of entities (each with id, name, settings, status, etc.)
     * @return array
     */
    protected function enrich_entities( array $entities ): array {
        foreach ( $entities as &$entity ) {
            $settings   = isset( $entity['settings'] ) && is_array( $entity['settings'] ) ? $entity['settings'] : [];
            $product_id = isset( $settings['product_id'] ) ? $settings['product_id'] : null;

            $product_name  = null;
            $regular_price = null;

            if ( $product_id && function_exists( 'wc_get_product' ) ) {
                $product = wc_get_product( $product_id );
                if ( $product && is_a( $product, 'WC_Product' ) ) {
                    $product_name  = $product->get_name();
                    $regular_price = (float) $product->get_regular_price();
                    if ( $regular_price === 0.0 && $product->get_regular_price() === '' ) {
                        $regular_price = (float) $product->get_price();
                    }
                }
            }

            if ( $regular_price === null && isset( $settings['regular_price'] ) ) {
                $regular_price = (float) $settings['regular_price'];
            }
            if ( $regular_price === null ) {
                $regular_price = 0.0;
            }

            $settings['product_name'] = $product_name;

            $pricing_type  = $settings['pricing_type'] ?? $settings['discount_type'] ?? 'percent';
            $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : (isset( $settings['discount_value'] ) ? (float) $settings['discount_value'] : 0);
            $entity_price  = Price::get_discounted_price( $regular_price, $pricing_type, $pricing_value );

            // Decode HTML entities (e.g. &#8363; for ₫) so frontend displays the symbol, not literal entity
            $currency                  = function_exists( 'get_woocommerce_currency_symbol' ) ? get_woocommerce_currency_symbol() : '$';
            $currency                  = html_entity_decode( $currency, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
            $settings['price_display'] = $currency . number_format( (float) $entity_price, 2 );
            $settings['price']         = $entity_price;

            $entity['settings'] = $settings;
        }//end foreach

        return $entities;
    }

    /**
     * Get single entity
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_entity(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );
        $id          = (int) $request->get_param( 'id' );

        $repository = $this->get_repository( $feature_id, $entity_type );
        $entity     = $repository->find( $id );

        if ( ! $entity) {
            return $this->error( __( 'Entity not found.', 'yayboost' ), 404 );
        }

        return $this->success( $entity );
    }

    /**
     * Create entity
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function create_entity(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );

        $data = [
            'name'     => sanitize_text_field( $request->get_param( 'name' ) ?: '' ),
            'settings' => $request->get_param( 'settings' ) ?: [],
            'status'   => sanitize_text_field( $request->get_param( 'status' ) ?: 'active' ),
            'priority' => (int) ($request->get_param( 'priority' ) ?: 10),
        ];

        $repository = $this->get_repository( $feature_id, $entity_type );
        $id         = $repository->create( $data );

        if ( ! $id) {
            return $this->error( __( 'Failed to create entity.', 'yayboost' ), 500 );
        }

        $entity = $repository->find( $id );

        return $this->success(
            [
                'entity'  => $entity,
                'message' => __( 'Entity created successfully.', 'yayboost' ),
            ]
        );
    }

    /**
     * Update entity
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_entity(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );
        $id          = (int) $request->get_param( 'id' );

        $repository = $this->get_repository( $feature_id, $entity_type );

        if ( ! $repository->find( $id )) {
            return $this->error( __( 'Entity not found.', 'yayboost' ), 404 );
        }

        $data = [];

        if ($request->has_param( 'name' )) {
            $data['name'] = sanitize_text_field( $request->get_param( 'name' ) );
        }

        if ($request->has_param( 'settings' )) {
            $data['settings'] = $request->get_param( 'settings' );
        }

        if ($request->has_param( 'status' )) {
            $data['status'] = sanitize_text_field( $request->get_param( 'status' ) );
        }

        if ($request->has_param( 'priority' )) {
            $data['priority'] = (int) $request->get_param( 'priority' );
        }

        $result = $repository->update( $id, $data );

        if ( ! $result) {
            return $this->error( __( 'Failed to update entity.', 'yayboost' ), 500 );
        }

        $entity = $repository->find( $id );

        return $this->success(
            [
                'entity'  => $entity,
                'message' => __( 'Entity updated successfully.', 'yayboost' ),
            ]
        );
    }

    /**
     * Delete entity
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function delete_entity(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );
        $id          = (int) $request->get_param( 'id' );

        $repository = $this->get_repository( $feature_id, $entity_type );

        if ( ! $repository->find( $id )) {
            return $this->error( __( 'Entity not found.', 'yayboost' ), 404 );
        }

        $result = $repository->delete( $id );

        if ( ! $result) {
            return $this->error( __( 'Failed to delete entity.', 'yayboost' ), 500 );
        }

        return $this->success(
            [
                'message' => __( 'Entity deleted successfully.', 'yayboost' ),
            ]
        );
    }

    /**
     * Bulk action (activate, deactivate, delete)
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function bulk_action(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );
        $action      = $request->get_param( 'action' );
        $ids         = $request->get_param( 'ids' ) ?: [];

        if (empty( $ids ) || ! is_array( $ids )) {
            return $this->error( __( 'No entities selected.', 'yayboost' ), 400 );
        }

        $repository = $this->get_repository( $feature_id, $entity_type );
        $count      = 0;

        switch ($action) {
            case 'activate':
                $count = $repository->bulk_update_status( $ids, 'active' );
                break;

            case 'deactivate':
                $count = $repository->bulk_update_status( $ids, 'inactive' );
                break;

            case 'delete':
                $count = $repository->bulk_delete( $ids );
                break;

            default:
                return $this->error( __( 'Invalid action.', 'yayboost' ), 400 );
        }

        return $this->success(
            [
                'count'   => $count,
                'message' => sprintf(
                    /* translators: %d: number of entities */
                    __( '%d entities updated.', 'yayboost' ),
                    $count
                ),
            ]
        );
    }

    /**
     * Reorder entities
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function reorder_entities(WP_REST_Request $request) {
        $feature_id  = $request->get_param( 'feature_id' );
        $entity_type = $this->get_entity_type( $request );
        $order       = $request->get_param( 'order' ) ?: [];

        if (empty( $order ) || ! is_array( $order )) {
            return $this->error( __( 'Invalid order data.', 'yayboost' ), 400 );
        }

        $repository = $this->get_repository( $feature_id, $entity_type );
        $repository->reorder( $order );

        return $this->success(
            [
                'message' => __( 'Order updated successfully.', 'yayboost' ),
            ]
        );
    }
}
