<?php
/**
 * Feature REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;

/**
 * Handles feature-related API endpoints
 */
class FeatureController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes() {
        // Get all features
        $this->register_route('/features', WP_REST_Server::READABLE, [$this, 'get_features']);

        // Get single feature
        $this->register_route('/features/(?P<id>[a-zA-Z0-9_-]+)', WP_REST_Server::READABLE, [$this, 'get_feature']);

        // Update feature status
        $this->register_route('/features/(?P<id>[a-zA-Z0-9_-]+)', WP_REST_Server::EDITABLE, [$this, 'update_feature']);

        // Update feature settings
        $this->register_route('/features/(?P<id>[a-zA-Z0-9_-]+)/settings', WP_REST_Server::EDITABLE, [$this, 'update_feature_settings']);
    }

    /**
     * Get all features
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_features($request) {
        $registry = $this->container->resolve('feature.registry');
        $features = $registry->get_all();

        $data = array_map(function($feature) {
            return [
                'id' => $feature->get_id(),
                'name' => $feature->get_name(),
                'description' => $feature->get_description(),
                'enabled' => $feature->is_enabled(),
            ];
        }, $features);

        return $this->success($data);
    }

    /**
     * Get single feature
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_feature($request) {
        $id = $request->get_param('id');
        $registry = $this->container->resolve('feature.registry');
        
        $feature = $registry->get($id);
        
        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        return $this->success([
            'id' => $feature->get_id(),
            'name' => $feature->get_name(),
            'description' => $feature->get_description(),
            'enabled' => $feature->is_enabled(),
        ]);
    }

    /**
     * Update feature
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_feature($request) {
        $id = $request->get_param('id');
        $enabled = $request->get_param('enabled');

        $registry = $this->container->resolve('feature.registry');
        $feature = $registry->get($id);

        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        if ($enabled) {
            $feature->enable();
        } else {
            $feature->disable();
        }

        return $this->success([
            'id' => $feature->get_id(),
            'enabled' => $feature->is_enabled(),
            'message' => __('Feature updated successfully.', 'yayboost'),
        ]);
    }

    /**
     * Update feature settings
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_feature_settings($request) {
        $id = $request->get_param('id');
        $settings = $request->get_json_params();

        $registry = $this->container->resolve('feature.registry');
        $feature = $registry->get($id);

        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        // Update feature settings
        if (method_exists($feature, 'update_settings')) {
            $feature->update_settings($settings);
        }

        return $this->success([
            'message' => __('Settings updated successfully.', 'yayboost'),
        ]);
    }
}

