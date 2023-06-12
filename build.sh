#!/bin/sh

ENV="dev"

./node_modules/.bin/webpack --config webpack.dev.js --progress --color $@