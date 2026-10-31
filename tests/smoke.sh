#!/usr/bin/env bash
set -euo pipefail
: "${TEST_IMAGE:?TEST_IMAGE is required}"

# No-password startup must fail closed, specifically with the entrypoint's code 1.
set +e
timeout --kill-after=5s 10s docker run --rm "$TEST_IMAGE"
status=$?
set -e
if [[ "$status" -ne 1 ]]; then
  echo "Expected exit 1 without a password; got $status" >&2
  exit 1
fi

name=nas-webterm-ci-smoke
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$name" \
  -p 127.0.0.1:17681:7681 \
  -e TTYD_USER=ci \
  -e TTYD_PASS=ci-only-smoke-password \
  --security-opt no-new-privileges:true \
  --pids-limit 256 \
  "$TEST_IMAGE"

ready=false
for _ in {1..30}; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:17681/ || true)
  if [[ "$code" == 401 ]]; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  docker logs "$name"
  echo 'Terminal did not require authentication or did not become ready.' >&2
  exit 1
fi

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
  -u ci:ci-only-smoke-password http://127.0.0.1:17681/)
[[ "$code" == 200 ]] || { echo "Authenticated request failed: $code" >&2; exit 1; }
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
  -u ci:wrong-password http://127.0.0.1:17681/)
[[ "$code" == 401 ]] || { echo "Incorrect password was not rejected: $code" >&2; exit 1; }

docker exec "$name" sh -c 'command -v ttyd && command -v bash && command -v ssh && command -v tmux'
docker exec "$name" sh -n /usr/local/bin/entrypoint.sh
docker exec "$name" /usr/local/bin/healthcheck.sh
docker exec "$name" sh -c 'test -s /usr/share/nas-webterm/index.html && grep -q nt-webterm-controls /usr/share/nas-webterm/index.html'
if [[ "${RUN_BROWSER_TESTS:-0}" == 1 ]]; then
  pnpm exec playwright test
fi
echo 'Authentication, frontend, and installed-tool smoke tests passed.'
