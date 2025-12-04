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
    public function register_routes(): void {
        // Get all features
        $this->register_route('/features', WP_REST_Server::READABLE, [$this, 'get_features']);

        // Get categories
        $this->register_route('/features/categories', WP_REST_Server::READABLE, [$this, 'get_categories']);

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
    public function get_features(WP_REST_Request $request) {
        $registry = $this->container->resolve('feature.registry');
        $features = $registry->get_all_sorted();

        $category = $request->get_param('category');
        if ($category) {
            $features = array_filter($features, function($feature) use ($category) {
                return $feature->get_category() === $category;
            });
        }

        $data = array_map(function($feature) {
            return $feature->to_array();
        }, $features);

        return $this->success(array_values($data));
    }

    /**
     * Get feature categories
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_categories(WP_REST_Request $request) {
        $registry = $this->container->resolve('feature.registry');
        $categories = $registry->get_categories();

        $data = [];
        foreach ($categories as $id => $category) {
            $data[] = array_merge(['id' => $id], $category);
        }

        return $this->success($data);
    }

    /**
     * Get single feature
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_feature(WP_REST_Request $request) {
        $id = $request->get_param('id');
        $registry = $this->container->resolve('feature.registry');

        $feature = $registry->get($id);

        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        return $this->success($feature->to_array());
    }

    /**
     * Update feature
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_feature(WP_REST_Request $request) {
        $id = $request->get_param('id');
        $enabled = $request->get_param('enabled');

        $registry = $this->container->resolve('feature.registry');
        $feature = $registry->get($id);

        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        if ($enabled !== null) {
            if ($enabled) {
                $feature->enable();
            } else {
                $feature->disable();
            }
        }

        return $this->success([
            'feature' => $feature->to_array(),
            'message' => __('Feature updated successfully.', 'yayboost'),
        ]);
    }

    /**
     * Update feature settings
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_feature_settings(WP_REST_Request $request) {
        $id = $request->get_param('id');
        $settings = $request->get_json_params();

        $registry = $this->container->resolve('feature.registry');
        $feature = $registry->get($id);

        if (!$feature) {
            return $this->error(__('Feature not found.', 'yayboost'), 404);
        }

        $feature->update_settings($settings);

        return $this->success([
            'feature' => $feature->to_array(),
            'message' => __('Settings updated successfully.', 'yayboost'),
        ]);
    }
}
