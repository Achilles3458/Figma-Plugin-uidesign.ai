.PHONY: dist

ts_lint:
	npx tsc --noEmit --skipLibCheck --watch

dev_sass:
	npx sass src/ui/sass/sass.sass:dist/.temp/css/ui.css \
		--no-source-map \
		--watch

dist_sass:
	npx sass src/ui/sass/sass.sass:dist/.temp/css/ui.css \
		--no-source-map

dev:
	make dev_sass &
	NODE_ENV=development npx tsx scripts/dev.ts

dist:
	make dist_sass && \
	NODE_ENV=production npx tsx scripts/dev.ts

dist_zip:
	make dist && \
	zip artifacts/uidesignai_sdk.zip manifest.json dist/ui.html dist/code.js

# npm adduser
publish:
	npx tsx scripts/lib.ts
	cd npm_package && npm publish --access public