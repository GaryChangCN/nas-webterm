#!/bin/sh
set -eu
code=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 http://127.0.0.1:7681/)
[ "$code" = 401 ]
