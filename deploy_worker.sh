#!/usr/bin/env bash

CONFIG_PATH=src/js/$1/wrangler.toml

shift 1
if npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
  npx wrangler login
fi
npx wrangler deploy --config $CONFIG_PATH $@