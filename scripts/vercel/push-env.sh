#!/bin/sh
# Copies the app's variables from .env.local to the linked Vercel project (production + preview).
# SITE_URL is forced to the public domain. Secrets are marked sensitive when the CLI supports it.
set -e
cd "$(dirname "$0")/../.."
SENS=""; vercel env add --help 2>&1 | grep -q -- "--sensitive" && SENS="--sensitive"
val() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }
for name in DATABASE_URL DATABASE_SSL ADMIN_PASSWORD_HASH AUTH_SECRET S3_BUCKET S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
  v=$(val "$name"); if [ -z "$v" ]; then echo "SKIP $name (empty)"; continue; fi
  flag=""; case $name in DATABASE_URL|ADMIN_PASSWORD_HASH|AUTH_SECRET|S3_SECRET_ACCESS_KEY) flag=$SENS;; esac
  for env in production preview; do
    printf '%s' "$v" | vercel env add "$name" "$env" $flag --yes >/dev/null 2>&1 && echo "ok   $name $env" || echo "FAIL $name $env"
  done
done
for env in production preview; do
  printf '%s' "https://geekraj.com" | vercel env add SITE_URL "$env" --yes >/dev/null 2>&1 && echo "ok   SITE_URL $env" || echo "FAIL SITE_URL $env"
done
vercel env ls
