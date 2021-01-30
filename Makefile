DEPLOY = \
	build/index.html \
	build/worker.js \
	build/app.webmanifest \
	build/icon.png

NPM = node_modules/

build/main.js: $(wildcard *.js)
	@echo Building $@
	@mkdir -p $(@D)
	@npx rollup main.js \
	  | npx terser --mangle --compress > $@

build/worker.js: worker.js build/index.html $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed "s/INDEXHASH/`md5 -q build/index.html`/" $< \
	  | npx terser --mangle --compress > $@

build/app.webmanifest: app.webmanifest
	@echo Building $@
	@cp $< $@

build/icon.png: icon.png
	@echo Building $@
	@cp $< $@

build/index.css: $(wildcard *.scss)
	@echo Building $@
	@mkdir -p $(@D)
	@npx sass --style=compressed index.scss > $@

build/index.html: index.html build/index.css build/main.js $(NPM)
	@echo Building $@
	@npx juice \
	  --apply-style-tags false \
	  --remove-style-tags false \
	  $< $@

$(NPM):
	@echo Installing node packages
	@npm install

all: $(DEPLOY)

clean:
	@echo Cleaning
	@$(RM) -r build/*

.PHONY: all clean
