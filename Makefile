# Copyright 2021 James Deery
# Released under the MIT licence, https://opensource.org/licenses/MIT

DEPLOY = \
	build/index.html \
	build/worker.js \
	app.webmanifest \
	build/icon.png

DEPLOY_DIR = deploy/

NPM = node_modules/

index.html: build/index.css js/main.js

js/main.js: $(filter-out js/main.js,$(wildcard js/*.js)) build/shaders.js build/font.js
	@touch $@

build/shaders.js: $(wildcard shaders/*.vert) $(wildcard shaders/*.frag)
	@echo Building $@
	@mkdir -p $(@D)
	@for i in $^; do \
	  printf "export const $$(basename $${i} | tr . _) = \`"; \
	  sed 's/\/\/.*$$//g' $$i \
	   | perl -0pe 's/([\n;,{}()\[\]=+\-*\/])[ \t\r\n]+/$$1/g'; \
	  echo "\`;"; \
	done > $@

build/font.js: font.png
	@echo Building $@
	@mkdir -p $(@D)
	@echo "export const font = 'data:image/png;base64,$$(npx imagemin $^ | base64)';" > $@

build/main.js: js/main.js $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx rollup $< \
	  | npx terser --mangle --toplevel --compress > $@

build/worker.js: js/worker.js build/index.html $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed "s/INDEXHASH/`md5 -q build/index.html`/" $< \
	  | npx terser --mangle --compress > $@

css/index.scss: $(filter-out css/index.scss,$(wildcard css/*.scss)) build/font.scss
	@touch $@

build/font.scss: stealth57.woff2
	@echo Building $@
	@mkdir -p $(@D)
	@echo "@font-face {\n\
	    font-family: 'stealth57';\n\
	    src: url('data:font/woff2;base64,$$(base64 $^)') format('woff2');\n\
	}" > $@

build/index.css: css/index.scss $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx sass --style=compressed $< > $@

build/index.html: index.html build/index.css build/main.js $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed -e 's/"build\/index.css"/"index.css"/' $< \
	 | sed -e 's/"js\/main.js"/"main.js"/' \
	 | sed -e 's/^ *//' \
	 | perl -0pe 's/>[ \t\r\n]+</></g' > $@.tmp
	@npx juice \
	  --apply-style-tags false \
	  --remove-style-tags false \
	  $@.tmp $@
	@rm $@.tmp

build/icon.png: icon.png
	@echo Building $@
	@npx imagemin $< > $@

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
