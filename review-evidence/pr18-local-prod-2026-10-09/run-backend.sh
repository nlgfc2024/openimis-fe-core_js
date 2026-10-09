#!/usr/bin/env bash
set -eu
export LOAD_ENV='' MODE=prod DEBUG=false SITE_ROOT=api
export OPENIMIS_CONF=/tmp/mlatho-local-prod/backend/openimis.json
export DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=local_auth DB_NAME=mlatho_auth_validation DB_PASSWORD=''
export HOSTS=localhost,localhost:8443 PROTOS=http,https SITE_URL=localhost:8443
export PYTHONPATH=/tmp/mlatho-auth-backend:/tmp/mlatho-local-prod/backend/openIMIS
export SECRET_KEY="$(cat /tmp/mlatho-local-prod/secret-key)"
export EMAIL_BACKEND=django.core.mail.backends.locmem.EmailBackend SCHEDULER_AUTOSTART=False
export USER_AGENT_CSRF_BYPASS='' OPENSEARCH_DSL_AUTOSYNC=False
cd /tmp/mlatho-local-prod/backend/openIMIS
exec /home/yutaka/MSR_2026/mlatho/backend/openimis-be_py/.venv/bin/python "$@"
