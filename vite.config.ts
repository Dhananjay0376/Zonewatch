import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const inlineAssetsPlugin = () => ({
  name: 'inline-assets',
  transformIndexHtml(html, ctx) {
    if (!ctx.bundle) return html;
    let cssContent = '';
    let jsContent = '';
    for (const [fileName, asset] of Object.entries(ctx.bundle)) {
      const anyAsset = asset as any;
      if (fileName.endsWith('.css') && 'source' in anyAsset) {
        cssContent += anyAsset.source;
        delete ctx.bundle[fileName];
      } else if (fileName.endsWith('.js') && 'code' in anyAsset && anyAsset.isEntry) {
        jsContent += anyAsset.code;
        delete ctx.bundle[fileName];
      }
    }
    html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]+\.css"[^>]*>/g, '');
    html = html.replace(/<link rel="modulepreload"[^>]*href="[^"]+\.js"[^>]*>/g, '');
    html = html.replace(/<script type="module"[^>]*src="[^"]*assets\/index-[^"]+\.js"[^>]*><\/script>/g, '');
    
    if (cssContent) {
      html = html.replace(
        '</head>',
        `<style>${cssContent}</style></head>`
      );
    }
    if (jsContent) {
      html = html.replace(
        '</body>',
        `<script type="module">${jsContent}</script></body>`
      );
    }
    return html;
  }
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), inlineAssetsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
