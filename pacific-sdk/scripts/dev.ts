import * as chokidar from 'chokidar';
import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const UI_HTML_ENTRYPOINT_JS = 'src/ui/ui.tsx';
const CODE_JS_ENTRYPOINT_JS = 'src/code/code.ts';
const UI_HTML_TEMPORARY_JS = 'dist/.temp/ui.js';
const UI_HTML_TEMPORARY_CSS = 'dist/.temp/css/ui.css';
const UI_HTML_EXITPOINT_HTML = 'dist/ui.html';
const CODE_JS_EXITPOINT_JS = 'dist/code.js';

type Environment = 'development' | 'production';

async function buildHTML() {
  const css = await fs.readFile(UI_HTML_TEMPORARY_CSS, 'utf-8');
  const js = await fs.readFile(UI_HTML_TEMPORARY_JS, 'utf-8');

  const html = `
		<html>
			<head>
				<!-- https://fonts.google.com/specimen/JetBrains+Mono -->
				<link rel="preconnect" href="https://fonts.googleapis.com">
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
				<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
				<style>${css}</style>
			</head>
			<body>
				<div id="root"></div>
				<script type="module">${js}</script>
			</body>
		</html>
	`;

  await fs.writeFile(UI_HTML_EXITPOINT_HTML, html, 'utf-8');
}

async function build(args: { NODE_ENV: Environment }) {
  const START = Date.now(); // DEBUG
  const react = await esbuild.context({
    bundle: true,
    define: { 'process.env.NODE_ENV': JSON.stringify(args.NODE_ENV) },
    entryPoints: [UI_HTML_ENTRYPOINT_JS],
    legalComments: 'none',
    loader: {
      '.jpg': 'dataurl', // Asset
      '.mp4': 'dataurl', // Asset
      '.png': 'dataurl', // Asset
      '.svg': 'dataurl', // Asset
      '.tsx': 'tsx',
      '.woff2': 'dataurl', // Asset
    },
    //// minify:    args.NODE_ENV === "production",
    minify: false,
    outfile: UI_HTML_TEMPORARY_JS,
    sourcemap: args.NODE_ENV === 'development' ? 'inline' : false,
    target: 'es2017',
  });
  const figma = await esbuild.context({
    bundle: true,
    define: { 'process.env.NODE_ENV': JSON.stringify(args.NODE_ENV) },
    entryPoints: [CODE_JS_ENTRYPOINT_JS],
    legalComments: 'none',
    //// minify:        args.NODE_ENV === "production",
    minify: false,
    outfile: CODE_JS_EXITPOINT_JS,
    sourcemap: args.NODE_ENV === 'development' ? 'inline' : false,
    target: 'es2017',
  });

  await react.rebuild();
  await figma.rebuild();
  await buildHTML();

  if (args.NODE_ENV === 'development') {
    const watcher = chokidar.watch('src/**/*');
    watcher.on('change', async (filename) => {
      // https://twitter.com/Steve8708/status/1696937040598741435
      await new Promise((resolve) => setTimeout(resolve, 500)); // DEBUG

      const START = Date.now(); // DEBUG
      await react.rebuild();
      await figma.rebuild();
      await buildHTML();
      const END = Date.now(); // DEBUG
      console.log(
        `⚡️ ${path.relative(process.cwd(), filename)} ${END - START}ms`
      );
    });
    const END = Date.now(); // DEBUG
    console.log(`⚡️ ${END - START}ms`);
    return;
  }

  react.dispose();
  figma.dispose();
  const END = Date.now(); // DEBUG
  console.log(`⚡️ ${END - START}ms`);
}

if (
  process.env.NODE_ENV !== 'development' &&
  process.env.NODE_ENV !== 'production'
) {
  throw new Error(`Invalid NODE_ENV: ${process.env}`);
}
build({ NODE_ENV: process.env.NODE_ENV });
