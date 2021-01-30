DEPLOY = \
	build/index.html \
	build/worker.js \
	app.webmanifest \
	icon.png

DEPLOY_DIR = deploy/

NPM = node_modules/

index.html: build/index.css

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

build/index.css: $(wildcard *.scss) $(NPM)
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
	@npx http-server

deploy: $(DEPLOY)
	@echo Deploying
	@mkdir -p $(DEPLOY_DIR)
	@rm -rf $(DEPLOY_DIR)/*
	@cp $^ $(DEPLOY_DIR)

.PHONY: all run deploy clean
