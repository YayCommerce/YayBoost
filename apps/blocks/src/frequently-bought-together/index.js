/**
 * Frequently Bought Together Block - Editor Registration
 * Based on WishlistItems pattern
 */

import { registerBlockType } from "@wordpress/blocks";
import { shoppingCart as icon } from "@wordpress/icons";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";
import "./style.scss";

// Register inner blocks
import "./inner-blocks/fbt-checkbox";

registerBlockType(metadata.name, {
  icon,
  edit: Edit,
  save: Save,
});
