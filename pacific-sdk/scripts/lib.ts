import * as esbuild from "esbuild"

async function run() {
	await esbuild.build({
		bundle:      true,
		define:      { "process.env.NODE_ENV": JSON.stringify("production") },
		entryPoints: ["src/code/draw.ts"],
		minify:      true,
		outfile:     "npm_package/lib.js",
		platform:    "node",
		sourcemap:   false,
		target:      "es2017",
	})
}
run()
