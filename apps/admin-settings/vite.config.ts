import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
// import analyze from "rollup-plugin-analyzer"
// import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from "vite";
import pluginExternal, { Options } from "vite-plugin-external";

process.env = {
  ...process.env,
  ...loadEnv(process.env.mode || "development", process.cwd()),
};

const terserOptions = {
  output: {
    comments: /translators:/i,
  },
  compress: {
    passes: 2,
  },
  mangle: {
    reserved: ["__", "_n", "_nx", "_x"],
  },
};

const externalOptions: Options = {
  /** @type 'auto' */
  interop: "auto",

  development: {
    externals: {
      "@wordpress/hooks": "wp.hooks",
      "@wordpress/i18n": "wp.i18n",
    },
  },

  production: {
    externals: {
      "@wordpress/hooks": "wp.hooks",
      "@wordpress/i18n": "wp.i18n",
      react: "React",
      "react-dom": "ReactDOM",
      "react-dom/client": "ReactDOM",
      "@wordpress/components": "wp.components",
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  root: "./src",

  plugins: [
    react({ jsxRuntime: "classic" }),
    tailwindcss(),
    pluginExternal(externalOptions),
    // visualizer({ template: 'network', emitFile: true, filename: 'stats.html' }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "terser",
    terserOptions: terserOptions,
    manifest: false,
    emptyOutDir: true,
    outDir: path.resolve("../../assets", "dist"),
    assetsDir: "",
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/main.tsx"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
      plugins: [
        // analyze({ summaryOnly: true, limit:10 }),
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
      host: "localhost",
      protocol: "ws",
    },
  },
});
