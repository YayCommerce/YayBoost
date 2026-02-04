<?php
/**
 * Entity Repository
 *
 * @package YayBoost
 */

namespace YayBoost\Repository;

/**
 * Generic repository for feature entities
 */
class EntityRepository extends AbstractRepository {
    /**
     * Constructor
     *
     * @param string $feature_id
     * @param string $entity_type
     */
    public function __construct(string $feature_id, string $entity_type) {
        $this->feature_id  = $feature_id;
        $this->entity_type = $entity_type;
    }

    /**
     * Find entities by settings value
     *
     * @param string $key   Settings key
     * @param mixed  $value Value to match
     * @return array
     */
    public function find_by_setting(string $key, $value): array {
        $all = $this->get_active();

        return array_filter(
            $all,
            function ($entity) use ($key, $value) {
                return isset( $entity['settings'][ $key ] ) && $entity['settings'][ $key ] === $value;
            }
        );
    }

    /**
     * Bulk update status
     *
     * @param array  $ids
     * @param string $status
     * @return int Number of updated rows
     */
    public function bulk_update_status(array $ids, string $status): int {
        global $wpdb;

        if (empty( $ids )) {
            return 0;
        }

        $ids          = array_map( 'intval', $ids );
        $placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "UPDATE {$this->get_table()}
                 SET status = %s, updated_at = %s
                 WHERE id IN ({$placeholders})
                 AND feature_id = %s
                 AND entity_type = %s",
                array_merge(
                    [ $status, current_time( 'mysql' ) ],
                    $ids,
                    [ $this->feature_id, $this->entity_type ]
                )
            )
        );

        return $result !== false ? (int) $result : 0;
    }

    /**
     * Bulk delete entities
     *
     * @param array $ids
     * @return int Number of deleted rows
     */
    public function bulk_delete(array $ids): int {
        global $wpdb;

        if (empty( $ids )) {
            return 0;
        }

        $ids          = array_map( 'intval', $ids );
        $placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$this->get_table()}
                 WHERE id IN ({$placeholders})
                 AND feature_id = %s
                 AND entity_type = %s",
                array_merge(
                    $ids,
                    [ $this->feature_id, $this->entity_type ]
                )
            )
        );

        return $result !== false ? (int) $result : 0;
    }

    /**
     * Reorder entities
     *
     * @param array $order Array of id => priority
     * @return bool
     */
    public function reorder(array $order): bool {
        global $wpdb;

        foreach ($order as $id => $priority) {
            $wpdb->update(
                $this->get_table(),
                [
                    'priority'   => (int) $priority,
                    'updated_at' => current_time( 'mysql' ),
                ],
                [
                    'id'          => (int) $id,
                    'feature_id'  => $this->feature_id,
                    'entity_type' => $this->entity_type,
                ]
            );
        }

        return true;
    }

    /**
     * Duplicate an entity
     *
     * @param int $id
     * @return int|false New entity ID or false on failure
     */
    public function duplicate(int $id) {
        $entity = $this->find( $id );

        if ( ! $entity) {
            return false;
        }

        return $this->create(
            [
                'name'     => $entity['name'] . ' (Copy)',
                'settings' => $entity['settings'],
                'status'   => 'inactive',
                'priority' => $entity['priority'] + 1,
            ]
        );
    }
}
