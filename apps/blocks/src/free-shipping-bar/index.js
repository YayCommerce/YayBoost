/**
 * Free Shipping Bar Block - Editor Registration
 */

import { registerBlockType } from '@wordpress/blocks';
import { shipping as icon } from '@wordpress/icons';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';

registerBlockType(metadata.name, {
  icon,
  edit: Edit,
  save: () => null, // Dynamic block - rendered via render.php
});

const registerCartCheckoutFilter = () => {
	if ( window.wc?.blocksCheckout?.registerCheckoutFilters ) {
		const { registerCheckoutFilters } = window.wc.blocksCheckout;

		registerCheckoutFilters( 'yayboost/free-shipping-bar', {
			additionalCartCheckoutInnerBlockTypes: ( defaultValue ) => {
				// Add our custom block to all Cart/Checkout inner block areas
				if ( ! defaultValue.includes( 'yayboost/free-shipping-bar' ) ) {
					defaultValue.push( 'yayboost/free-shipping-bar' );
				}
				return defaultValue;
			},
		} );
	}
};

// Run on DOMContentLoaded to ensure wc.blocksCheckout is available
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', registerCartCheckoutFilter );
} else {
	registerCartCheckoutFilter();
}
