import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import type { OutputAsset } from 'rollup';

const inlineCSSPlugin = () => ({
  name: 'inline-css',
  transformIndexHtml(html, ctx) {
    if (!ctx.bundle) return html;
    let cssContent = '';
    for (const [fileName, asset] of Object.entries(ctx.bundle)) {
      const typedAsset = asset as OutputAsset;
      if (fileName.endsWith('.css') && 'source' in typedAsset) {
        cssContent += typedAsset.source;
        delete ctx.bundle[fileName];
      }
    }
    html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]+\.css"[^>]*>/g, '');
    if (cssContent) {
      return html.replace(
        '</head>',
        `<style>${cssContent}</style></head>`
      );
    }
    return html;
  }
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), inlineCSSPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('motion') || id.includes('framer-motion')) {
                return 'framework';
              }
              if (id.includes('lucide-react')) {
                return 'lucide';
              }
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
