/**
 * Smart Recommendations - Save component
 * Returns null because this is a dynamic block rendered via render.php
 */

import { useInnerBlocksProps, useBlockProps } from "@wordpress/block-editor";

export default function QuerySave({ attributes: { tagName: Tag = "div" } }) {
  const blockProps = useBlockProps.save();
  const innerBlocksProps = useInnerBlocksProps.save(blockProps);
  return <Tag {...innerBlocksProps} />;
}
