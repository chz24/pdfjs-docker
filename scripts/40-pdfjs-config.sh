#!/bin/sh
set -eu
node /opt/pdfjs/configure.mjs
nginx -t

