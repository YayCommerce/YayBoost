/**
 * Smart Recommendations Block - Editor Registration
 */

import { registerBlockType } from '@wordpress/blocks';
import { connection as icon } from '@wordpress/icons';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';
import Save from './save';

registerBlockType(metadata.name, {
  icon,
  edit: Edit,
  save: Save,
});
