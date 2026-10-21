#!/bin/sh
set -eu
# Fixed wrapper; untrusted document bytes are only stdin, never shell code.
umask 077
ulimit -f 10240
# Tectonic may lock its dependency cache even on a cache hit. Each compile gets
# its own disposable copy; candidate input can never alter the trusted image.
cp -R /opt/tectonic-cache /tmp/tectonic-cache
export TECTONIC_CACHE_DIR=/tmp/tectonic-cache
cat > /work/resume.tex
tectonic "$@" --bundle https://relay.fullyjustified.net/default_bundle_v33.tar --outdir /work /work/resume.tex >/dev/null 2>&1
cat /work/resume.pdf
