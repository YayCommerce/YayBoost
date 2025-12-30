/**
 * Frequently Bought Together Block - Save Component
 * Renders inner blocks for editor persistence
 * Based on WishlistItems pattern
 */
import { useInnerBlocksProps, useBlockProps } from "@wordpress/block-editor";

export default function Save({ attributes: { tagName: Tag = "div" } }) {
  const blockProps = useBlockProps.save();
  const innerBlocksProps = useInnerBlocksProps.save(blockProps);
  return <Tag {...innerBlocksProps} />;
}
