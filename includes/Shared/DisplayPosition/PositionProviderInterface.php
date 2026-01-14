<?php
/**
 * Position Provider Interface
 *
 * Contract for page-specific position configurations.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

/**
 * Interface for position providers
 */
interface PositionProviderInterface {

	/**
	 * Get all available positions for this page type
	 *
	 * @return array<string, array{hook: string, priority: int, label: string}>
	 */
	public function get_all(): array;
}
