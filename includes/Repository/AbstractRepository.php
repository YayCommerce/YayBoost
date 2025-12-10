<?php
/**
 * Abstract Repository Base Class
 *
 * @package YayBoost
 */

namespace YayBoost\Repository;

use YayBoost\Database\EntityTable;

/**
 * Base repository for entity CRUD operations
 */
abstract class AbstractRepository {
    /**
     * Feature ID this repository belongs to
     *
     * @var string
     */
    protected $feature_id;

    /**
     * Entity type (e.g., 'bump', 'bundle')
     *
     * @var string
     */
    protected $entity_type;

    /**
     * Allowed columns for ORDER BY to prevent SQL injection
     *
     * @var array
     */
    protected $allowed_orderby = [ 'id', 'name', 'status', 'priority', 'created_at', 'updated_at' ];

    /**
     * Get table name
     *
     * @return string
     */
    protected function get_table(): string {
        return EntityTable::get_table_name();
    }

    /**
     * Find entity by ID
     *
     * @param int $id
     * @return array|null
     */
    public function find(int $id): ?array {
        global $wpdb;

        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->get_table()} WHERE id = %d AND feature_id = %s AND entity_type = %s",
                $id,
                $this->feature_id,
                $this->entity_type
            ),
            ARRAY_A
        );

        if ( ! $result) {
            return null;
        }

        return $this->hydrate( $result );
    }

    /**
     * Get all entities
     *
     * @param array $args Query arguments
     * @return array
     */
    public function get_all(array $args = []): array {
        global $wpdb;

        $defaults = [
            'status'  => null,
            'orderby' => 'priority',
            'order'   => 'ASC',
            'limit'   => 100,
            'offset'  => 0,
        ];

        $args = wp_parse_args( $args, $defaults );

        $where = $wpdb->prepare(
            'feature_id = %s AND entity_type = %s',
            $this->feature_id,
            $this->entity_type
        );

        if ($args['status']) {
            $where .= $wpdb->prepare( ' AND status = %s', $args['status'] );
        }

        // Validate orderby column against whitelist to prevent SQL injection
        $orderby_column  = in_array( $args['orderby'], $this->allowed_orderby, true ) ? $args['orderby'] : 'priority';
        $order_direction = strtoupper( $args['order'] ) === 'DESC' ? 'DESC' : 'ASC';
        $orderby         = "{$orderby_column} {$order_direction}";

        $sql = "SELECT * FROM {$this->get_table()}
                WHERE {$where}
                ORDER BY {$orderby}
                LIMIT %d OFFSET %d";

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $results = $wpdb->get_results(
            $wpdb->prepare( $sql, $args['limit'], $args['offset'] ),
            ARRAY_A
        );

        return array_map( [ $this, 'hydrate' ], $results ?: [] );
    }

    /**
     * Get active entities
     *
     * @return array
     */
    public function get_active(): array {
        return $this->get_all( [ 'status' => 'active' ] );
    }

    /**
     * Create new entity
     *
     * @param array $data
     * @return int|false Entity ID or false on failure
     */
    public function create(array $data) {
        global $wpdb;

        $insert_data = [
            'feature_id'  => $this->feature_id,
            'entity_type' => $this->entity_type,
            'name'        => sanitize_text_field( $data['name'] ?? '' ),
            'settings'    => wp_json_encode( $this->sanitize_settings( $data['settings'] ?? [] ) ),
            'status'      => $this->sanitize_status( $data['status'] ?? 'active' ),
            'priority'    => (int) ($data['priority'] ?? 10),
            'created_at'  => current_time( 'mysql' ),
            'updated_at'  => current_time( 'mysql' ),
        ];

        $result = $wpdb->insert( $this->get_table(), $insert_data );

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Update entity
     *
     * @param int   $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool {
        global $wpdb;

        $update_data = [
            'updated_at' => current_time( 'mysql' ),
        ];

        if (isset( $data['name'] )) {
            $update_data['name'] = sanitize_text_field( $data['name'] );
        }

        if (isset( $data['settings'] )) {
            $update_data['settings'] = wp_json_encode( $this->sanitize_settings( $data['settings'] ) );
        }

        if (isset( $data['status'] )) {
            $update_data['status'] = $this->sanitize_status( $data['status'] );
        }

        if (isset( $data['priority'] )) {
            $update_data['priority'] = (int) $data['priority'];
        }

        $result = $wpdb->update(
            $this->get_table(),
            $update_data,
            [
                'id'          => $id,
                'feature_id'  => $this->feature_id,
                'entity_type' => $this->entity_type,
            ]
        );

        return $result !== false;
    }

    /**
     * Delete entity
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool {
        global $wpdb;

        $result = $wpdb->delete(
            $this->get_table(),
            [
                'id'          => $id,
                'feature_id'  => $this->feature_id,
                'entity_type' => $this->entity_type,
            ]
        );

        return $result !== false;
    }

    /**
     * Count entities
     *
     * @param string|null $status
     * @return int
     */
    public function count(?string $status = null): int {
        global $wpdb;

        $where = $wpdb->prepare(
            'feature_id = %s AND entity_type = %s',
            $this->feature_id,
            $this->entity_type
        );

        if ($status) {
            $where .= $wpdb->prepare( ' AND status = %s', $status );
        }

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$this->get_table()} WHERE {$where}"
        );
    }

    /**
     * Hydrate row data (decode JSON settings)
     *
     * @param array $row
     * @return array
     */
    protected function hydrate(array $row): array {
        if (isset( $row['settings'] ) && is_string( $row['settings'] )) {
            $row['settings'] = json_decode( $row['settings'], true ) ?: [];
        }

        $row['id']       = (int) $row['id'];
        $row['priority'] = (int) $row['priority'];

        return $row;
    }

    /**
     * Sanitize settings array recursively
     *
     * @param array $settings
     * @return array
     */
    protected function sanitize_settings(array $settings): array {
        $sanitized = [];

        foreach ($settings as $key => $value) {
            $key = sanitize_key( $key );

            if (is_array( $value )) {
                $sanitized[ $key ] = $this->sanitize_settings( $value );
            } elseif (is_bool( $value )) {
                $sanitized[ $key ] = $value;
            } elseif (is_int( $value )) {
                $sanitized[ $key ] = (int) $value;
            } elseif (is_float( $value )) {
                $sanitized[ $key ] = (float) $value;
            } else {
                $sanitized[ $key ] = sanitize_text_field( (string) $value );
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize status value
     *
     * @param string $status
     * @return string
     */
    protected function sanitize_status(string $status): string {
        $allowed = [ 'active', 'inactive', 'draft' ];
        return in_array( $status, $allowed, true ) ? $status : 'active';
    }
}
