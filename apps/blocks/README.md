# YayBoost Blocks

Block structure is separated between Blocks (standard) and Slots (WooCommerce).

## Structure

```
apps/blocks/
├── package.json          # Blocks (standard wp-scripts)
├── src/
│   └── free-shipping-bar/
│       └── ...
└── slots/
    ├── package.json      # Slots (WooCommerce dependency extraction)
    ├── webpack.config.js
    └── src/
        └── free-shipping-bar-slot/
            └── ...
```

## Setup

### 1. Install dependencies for Blocks:

```bash
cd apps/blocks
npm install
```

### 2. Install dependencies for Slots:

```bash
cd apps/blocks/slots
npm install
```

## Build Commands

### Build Blocks:

```bash
cd apps/blocks
npm run build
```

### Build Slots:

```bash
cd apps/blocks/slots
npm run build
```

### Build all:

```bash
cd apps/blocks
npm run build:all
```

## Dev Commands

### Dev Blocks:

```bash
cd apps/blocks
npm run dev
```

### Dev Slots:

```bash
cd apps/blocks/slots
npm run dev
```

### Dev all (simultaneously):

```bash
cd apps/blocks
npm run dev:all
```

## Notes

- Blocks use standard `@wordpress/scripts` (no WooCommerce dependency extraction needed)
- Slots use `@woocommerce/dependency-extraction-webpack-plugin` to handle WooCommerce packages
- Slots can import helpers from blocks via `@blocks` alias (configured in `slots/webpack.config.js`)
