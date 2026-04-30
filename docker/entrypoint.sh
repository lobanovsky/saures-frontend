#!/bin/sh
set -e

# Substitute API_BASE in api.js at startup so the image can be reused
# across environments by passing SAURES_API_URL env var.
#
# Default: http://localhost:8080
API_URL="${SAURES_API_URL:-http://localhost:8080}"

sed -i "s|const API_BASE = '.*'|const API_BASE = '${API_URL}'|g" \
    /usr/share/nginx/html/js/api.js

exec nginx -g "daemon off;"
