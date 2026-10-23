import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const embeddedFiles = {
  '__PEN_GAME_BENCH__': 'public/assets/bench/Worn Wooden Desk with Doodles.png',
  '__PEN_GAME_BLACK_PEN__': 'public/assets/pens/Transparent Barrel Black Grip Pen.png',
  '__PEN_GAME_BLUE_PEN__': 'public/assets/pens/Transparent Blue Retractable Pen.png',
} as const;

function singleHtmlBundle(): Plugin {
  return {
    name: 'pen-game-single-html',
    apply: 'build',
    enforce: 'post',
    transform(code, id) {
      if (!id.replace(/\\?.*$/, '').endsWith('/src/assetsManager.ts')) return null;
      return code
        .replace(/(['"])\/assets\/bench\/Worn Wooden Desk with Doodles\\.png\\1/g, "'__PEN_GAME_BENCH__'")
        .replace(/(['"])\/assets\/pens\/Transparent Barrel Black Grip Pen\\.png\\1/g, "'__PEN_GAME_BLACK_PEN__'")
        .replace(/(['"])\/assets\/pens\/Transparent Blue Retractable Pen\\.png\\1/g, "'__PEN_GAME_BLUE_PEN__'");
    },
    generateBundle(_options, bundle) {
      const dataUrls: Record<string, string> = {};
      for (const [token, file] of Object.entries(embeddedFiles)) {
        const bytes = readFileSync(resolve(root, file));
        dataUrls[token] = `data:image/png;base64,${bytes.toString('base64')}`;
      }

      let htmlAsset = bundle['index.html'];
      if (!htmlAsset || htmlAsset.type !== 'asset') {
        this.error('Single HTML build expected index.html output.');
      }
      let html = String(htmlAsset.source);

      // Inline the built JavaScript bundle into the HTML document.
      html = html.replace(/<script\\b([^>]*?)src=["']([^"']+)["']([^>]*)><\\/script>/gi, (_match, _before, src) => {
        const fileName = decodeURIComponent(String(src).split('/').pop() || '');
        const chunk = Object.values(bundle).find(
          (item) => item.type === 'chunk' && item.fileName === fileName
        );
        if (!chunk || chunk.type !== 'chunk') {
          this.error(`Could not inline JavaScript chunk: ${src}`);
        }
        return `<script type="module">\\n${chunk.code}\\n</script>`;
      });

      // Inline every emitted stylesheet as a style element.
      html = html.replace(/<link\\b([^>]*?)href=["']([^"']+\\.css(?:\\?[^"']*)?)["']([^>]*)>/gi, (_match, _before, href) => {
        const fileName = decodeURIComponent(String(href).split('/').pop()?.split('?')[0] || '');
        const css = Object.values(bundle).find(
          (item) => item.type === 'asset' && item.fileName === fileName
        );
        if (!css || css.type !== 'asset') {
          this.error(`Could not inline CSS asset: ${href}`);
        }
        return `<style>\\n${String(css.source)}\\n</style>`;
      });

      // Embed the favicon and remove web-app links that require separate files.
      const icon = readFileSync(resolve(root, 'icon.svg'), 'utf8');
      const iconData = `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`;
      html = html.replace(/<link\\b[^>]*rel=["']icon["'][^>]*>/gi, `<link rel="icon" type="image/svg+xml" href="${iconData}">`);
      html = html.replace(/<link\\b[^>]*rel=["']manifest["'][^>]*>/gi, '');
      html = html.replace(/<link\\b[^>]*(?:fonts\\.googleapis\\.com|fonts\\.gstatic\\.com)[^>]*>/gi, '');

      // Inline the bundled default desk and pen images directly into JS.
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          for (const [token, dataUrl] of Object.entries(dataUrls)) {
            item.code = item.code.split(token).join(dataUrl);
          }
        }
      }

      htmlAsset.source = html;
      for (const fileName of Object.keys(bundle)) {
        if (fileName !== 'index.html') delete bundle[fileName];
      }
    },
  };
}

export default defineConfig({
  // The 6.0 app is emitted as a single self-contained HTML file.
  base: './',
  plugins: [react(), singleHtmlBundle()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
