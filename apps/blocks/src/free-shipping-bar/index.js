/**
 * Free Shipping Bar Block - Editor Registration
 */

import { registerBlockType } from '@wordpress/blocks';
import { shipping as icon } from '@wordpress/icons';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';
import './editor.scss';

registerBlockType(metadata.name, {
  icon,
  edit: Edit,
  save: () => null, // Dynamic block - rendered via render.php
});

