DEPLOY = \
	build/index.html \
	build/worker.js \
	app.webmanifest \
	icon.png

DEPLOY_DIR = deploy/

NPM = node_modules/

index.html: build/index.css

build/shaders.js: $(wildcard shaders/*.vert) $(wildcard shaders/*.frag)
	@echo Building $@
	@for i in $^; do \
	  printf "export const $$(basename $${i} | tr . _) = \`"; \
	  perl -0pe 's/([\n;,{}()\[\]=+\-*\/])[ \t\r\n]+/$$1/g' $$i; \
	  echo "\`;"; \
	done > $@

build/font.js: font.png
	@echo Building $@
	@echo "export const font = 'data:image/png;base64,$$(npx imagemin $^ | base64)';" > $@

gl-renderer.js: build/shaders.js build/font.js

build/main.js: $(wildcard *.js) $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx rollup main.js \
	  | npx terser --mangle --compress > $@

build/worker.js: worker.js build/index.html $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed "s/INDEXHASH/`md5 -q build/index.html`/" $< \
	  | npx terser --mangle --compress > $@

build/font.scss: stealth57.woff2
	@echo Building $@
	@echo "@font-face {\n\
	    font-family: 'stealth57';\n\
	    src: url('data:font/woff2;base64,$$(base64 $^)') format('woff2');\n\
	}" > $@

build/index.css: $(wildcard *.scss) build/font.scss $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx sass --style=compressed index.scss > $@

build/index.html: index.html build/index.css build/main.js $(NPM)
	@echo Building $@
	@sed -e 's/"build\/index.css"/"index.css"/' $< > $@.tmp
	@npx juice \
	  --apply-style-tags false \
	  --remove-style-tags false \
	  $@.tmp $@
	@rm $@.tmp

$(NPM):
	@echo Installing node packages
	@npm install

all: $(DEPLOY)

clean:
	@echo Cleaning
	@$(RM) -r build/*

run: index.html $(NPM)
	@npx ws --log.format dev

deploy: $(DEPLOY)
	@echo Deploying
	@mkdir -p $(DEPLOY_DIR)
	@rm -rf $(DEPLOY_DIR)/*
	@cp $^ $(DEPLOY_DIR)

.PHONY: all run deploy clean
