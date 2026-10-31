#!/bin/sh
set -eu

USER_NAME="${TTYD_USER:-terminal}"
PASS="${TTYD_PASS:-}"
if [ -z "$USER_NAME" ] || [ -z "$PASS" ]; then
    echo '[webterm] Both TTYD_USER and TTYD_PASS must be non-empty.' >&2
    exit 1
fi
case "$USER_NAME" in
    *:*) echo '[webterm] TTYD_USER must not contain a colon.' >&2; exit 1 ;;
esac

mkdir -p /root/.ssh /share
chmod 700 /root/.ssh
export HISTFILE=/root/.ssh/.bash_history

echo '[webterm] Starting authenticated terminal on port 7681.'
exec ttyd \
    --port 7681 \
    --interface 0.0.0.0 \
    --credential "${USER_NAME}:${PASS}" \
    --writable \
    --check-origin \
    --max-clients 4 \
    --ping-interval 30 \
    --client-option 'titleFixed=NAS WebTerm' \
    --client-option 'fontSize=15' \
    --client-option 'theme={"background":"#101418","foreground":"#e6edf3"}' \
    bash -l
