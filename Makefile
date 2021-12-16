# Copyright 2021 James Deery
# Released under the MIT licence, https://opensource.org/licenses/MIT

DEPLOY = \
	build/index.html \
	build/worker.js \
	app.webmanifest \
	build/icon.png

CACHE_FILES = \
	build/index.html \
	build/icon.png \
	app.webmanifest

DEPLOY_DIR = deploy/

NPM = node_modules/

ifeq ($(shell uname -s),Darwin)
	BASE64 = base64
	MD5 = md5
else
	BASE64 = base64 -w0
	MD5 = md5sum
endif


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
	@echo "export const font = 'data:image/png;base64,$$(npx imagemin $^ -p optipng | $(BASE64))';" > $@

build/main.js: js/main.js $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx rollup $< \
	  | npx terser --mangle --toplevel --compress > $@

build/worker.js: js/worker.js $(CACHE_FILES) $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed "s/INDEXHASH/$$(cat $(CACHE_FILES) | $(MD5))/" $< \
	  | npx terser --mangle --compress > $@

css/index.scss: $(filter-out css/index.scss,$(wildcard css/*.scss)) build/font.scss
	@touch $@

build/font.scss: m8stealth57.woff2
	@echo Building $@
	@mkdir -p $(@D)
	@printf "@font-face {\n\
	    font-family: 'm8stealth57';\n\
	    src: url('data:font/woff2;base64,$$($(BASE64) $^)') format('woff2');\n\
	}" > $@

build/index.css: css/index.scss $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@npx sass --style=compressed $< > $@

build/index.html: index.html build/index.css build/main.js favicon.png $(NPM)
	@echo Building $@
	@mkdir -p $(@D)
	@sed -e 's/"build\/index.css"/"index.css"/' $< \
	 | sed -e 's/"js\/main.js"/"main.js"/' \
	 | sed -e 's|"favicon.png"|"data:image/png;base64,'$$(npx imagemin favicon.png -p optipng | $(BASE64))'"|' \
	 | sed -e 's/^ *//' \
	 | perl -0pe 's/>[ \t\r\n]+</></g' > $@.tmp
	@npx juice \
	  --apply-style-tags false \
	  --remove-style-tags false \
	  $@.tmp $@
	@rm $@.tmp

build/icon.png: icon.png
	@echo Building $@
	@npx imagemin $< -p optipng > $@

cert/cert.conf: $(NPM)
	@echo Building $@
	@mkdir -p cert
	@echo "[req]\n\
	distinguished_name=dn\n\
	req_extensions=ext\n\
	prompt=no\n\
	[dn]\n\
	CN=DevCert\n\
	OU=DEV\n\
	[ext]\n\
	keyUsage=nonRepudiation,digitalSignature,keyEncipherment\n\
	basicConstraints=critical,CA:TRUE,pathlen:0\n\
	subjectAltName=DNS:localhost,$$(\
	  npx ws --list-network-interfaces \
	   | grep '^-' \
	   | sed -E 's/^- .+: ([0-9.]+)$$/IP:\1/g' \
	   | sed -E 's/^- .+: (.+)$$/DNS:\1/g' \
	   | paste -sd ',' -)" > $@

cert/private-key.pem:
	@echo Building $@
	@mkdir -p cert
	@openssl genrsa -out $@ 2048

cert/server.csr: cert/private-key.pem cert/cert.conf
	@echo Building $@
	@openssl req \-new \
	  -nodes \
	  -sha256 \
	  -key cert/private-key.pem \
	  -config cert/cert.conf \
	  -out $@

cert/server.crt: cert/private-key.pem cert/cert.conf cert/server.csr
	@echo Building $@
	@openssl x509 \
	  -req \
	  -sha256 \
	  -days 90 \
	  -in cert/server.csr \
	  -signkey cert/private-key.pem \
	  -extfile cert/cert.conf \
	  -extensions ext \
	  -out $@

$(NPM):
	@echo Installing node packages
	@npm ci

all: $(DEPLOY)

clean:
	@echo Cleaning
	@rm -r build/*

ifeq ($(HTTPS),true)
run: index.html cert/private-key.pem cert/server.crt $(NPM)
	@npx ws \
		--log.format dev \
		--rewrite '/worker.js -> /js/worker.js' \
		--blacklist /cert/private-key.pem \
		--key cert/private-key.pem \
		--cert cert/server.crt
else
run: index.html $(NPM)
	@npx ws \
		--log.format dev \
		--rewrite '/worker.js -> /js/worker.js' \
		--blacklist /cert/private-key.pem
endif

deploy: $(DEPLOY)
	@echo Deploying
	@mkdir -p $(DEPLOY_DIR)
	@rm -rf $(DEPLOY_DIR)/*
	@cp $^ $(DEPLOY_DIR)

.PHONY: all run deploy clean
