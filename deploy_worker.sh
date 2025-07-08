#!/usr/bin/env bash

cp -rf src/js/$1/wrangler.toml ./

shift 1

npx wrangler deploy $@

rm ./wrangler.toml