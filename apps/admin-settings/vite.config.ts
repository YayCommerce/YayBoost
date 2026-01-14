import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
// import analyze from "rollup-plugin-analyzer"
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import pluginExternal, { Options } from 'vite-plugin-external';

process.env = {
  ...process.env,
  ...loadEnv(process.env.mode || 'development', process.cwd()),
};

const terserOptions = {
  format: {
    comments: /translators:/i,
  },
  compress: {
    passes: 2,
  },
  mangle: {
    reserved: ['__', '_n', '_nx', '_x'],
  },
};

const externalOptions = {
  interop: 'auto',

  development: {
    externals: {
      '@wordpress/hooks': 'wp.hooks',
      '@wordpress/i18n': 'wp.i18n',
    },
  },

  production: {
    externals: {
      // React externalized - using WordPress's bundled React
      // This requires WordPress 6.4+ which bundles React 18.2.0
      'react': 'React',
      'react-dom': 'ReactDOM',
      'react-dom/client': 'ReactDOM',
      '@wordpress/hooks': 'wp.hooks',
      '@wordpress/i18n': 'wp.i18n',
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  root: './src',

  plugins: [
    TanStackRouterVite({
      routesDirectory: './routes',
      generatedRouteTree: './routeTree.gen.ts',
      routeFileIgnorePrefix: '-',
      quoteStyle: 'single',
    }),
    react({ jsxRuntime: 'classic' }),
    tailwindcss(),
    pluginExternal(externalOptions),
    // visualizer({ template: 'network', emitFile: true, filename: 'stats.html' }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    terserOptions: terserOptions,
    manifest: false,
    emptyOutDir: true,
    outDir: path.resolve('../../assets', 'dist'),
    assetsDir: '',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        chunkFileNames: 'chunks/[name]-[hash].js',
        manualChunks(id) {
          // React core - externalized to WordPress's React
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // TanStack libraries (router + query)
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack';
          }
          // Radix UI primitives
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          // Form libraries (react-hook-form + zod)
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/@hookform')) {
            return 'vendor-forms';
          }
        },
      },
      plugins: [
        // Uncomment for bundle analysis:
        // visualizer({ filename: 'bundle-stats.html', gzipSize: true, brotliSize: true }),
      ],
    },
  },
  server: {
    cors: true,
    strictPort: true,
    port: 3000,
    origin: `${process.env.VITE_SERVER_ORIGIN}`,
    hmr: {
      port: 3000,
      host: 'localhost',
      protocol: 'ws',
    },
  },
});
