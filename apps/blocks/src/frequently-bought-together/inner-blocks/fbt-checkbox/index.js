/**
 * FBT Checkbox Block - Editor Registration
 */

import { registerBlockType } from '@wordpress/blocks';
import { yesAlt as icon } from '@wordpress/icons';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.scss';

registerBlockType(metadata.name, {
  icon,
  edit: Edit,
  save: Save,
});

