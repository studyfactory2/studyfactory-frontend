#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

MODE="${1:-}"
DIST_DIR="${2:-}"
RELEASE_ID="${3:-}"
RELEASE_PREFIX='_releases'
WORK_DIR=''

export AWS_PAGER=''

fail() {
  echo "Frontend publication failed: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "${WORK_DIR}" && -d "${WORK_DIR}" ]]; then
    case "${WORK_DIR}" in
      "${TMPDIR:-/tmp}"/studyfactory-frontend-publish.*)
        rm -rf -- "${WORK_DIR}"
        ;;
      *)
        echo "Refusing to remove unexpected temporary path: ${WORK_DIR}" >&2
        ;;
    esac
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

require_value() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "${name} is required."
}

validate_inputs() {
  [[ $# -eq 3 ]] ||
    fail "usage: publish.sh <deploy|rollback> <dist-directory> <release-sha>"
  [[ "${MODE}" == 'deploy' || "${MODE}" == 'rollback' ]] ||
    fail "mode must be deploy or rollback."
  [[ -d "${DIST_DIR}" ]] || fail "release directory is missing: ${DIST_DIR}"
  [[ "${RELEASE_ID}" =~ ^[0-9a-f]{40}$ ]] ||
    fail "release id must be a full lowercase 40-character Git commit SHA."

  DIST_DIR="$(cd -- "${DIST_DIR}" && pwd -P)"

  [[ -f "${DIST_DIR}/index.html" ]] || fail "release has no index.html."
  [[ -f "${DIST_DIR}/version.json" ]] || fail "release has no version.json."
  [[ -f "${DIST_DIR}/sw.js" ]] || fail "release has no sw.js."
  [[ -z "$(find "${DIST_DIR}" -type l -print -quit)" ]] ||
    fail "release contains a symbolic link."
  [[ -z "$(find "${DIST_DIR}" -type f -name '.env*' -print -quit)" ]] ||
    fail "release contains an environment file."
  [[ ! -e "${DIST_DIR}/${RELEASE_PREFIX}" ]] ||
    fail "release contains the reserved ${RELEASE_PREFIX} path."

  local built_commit
  built_commit="$(jq -er '.commit | strings | select(length > 0)' "${DIST_DIR}/version.json")" ||
    fail "version.json has no valid commit."
  [[ "${built_commit}" == "${RELEASE_ID}" ]] ||
    fail "version.json commit does not match release ${RELEASE_ID}."

  require_value S3_BUCKET_NAME
  require_value EXPECTED_AWS_ACCOUNT_ID
  require_value CLOUDFRONT_DISTRIBUTION_ID
  require_value PUBLIC_URL

  [[ "${EXPECTED_AWS_ACCOUNT_ID}" =~ ^[0-9]{12}$ ]] ||
    fail "EXPECTED_AWS_ACCOUNT_ID must be a 12-digit AWS account id."
  [[ "${S3_BUCKET_NAME}" != s3://* ]] ||
    fail "S3_BUCKET_NAME must be a bucket name, not an s3:// URL."
  [[ "${S3_BUCKET_NAME}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
    fail "S3_BUCKET_NAME does not look valid."
  [[ "${CLOUDFRONT_DISTRIBUTION_ID}" =~ ^[A-Z0-9]{8,32}$ ]] ||
    fail "CLOUDFRONT_DISTRIBUTION_ID does not look valid."

  PUBLIC_URL="${PUBLIC_URL%/}"
  [[ "${PUBLIC_URL}" =~ ^https://[A-Za-z0-9.-]+$ ]] ||
    fail "PUBLIC_URL must be an HTTPS origin without a path, query, or fragment."
}

upload_file() {
  local source_file="$1"
  local object_key="$2"
  local cache_control="$3"
  local content_type

  content_type="$(content_type_for "${source_file}")"

  aws s3 cp \
    "${source_file}" \
    "s3://${S3_BUCKET_NAME}/${object_key}" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    --only-show-errors \
    --cache-control "${cache_control}" \
    --content-type "${content_type}"
}

content_type_for() {
  case "$1" in
    *.html) echo 'text/html; charset=utf-8' ;;
    *.css) echo 'text/css; charset=utf-8' ;;
    *.js | *.mjs) echo 'text/javascript; charset=utf-8' ;;
    *.json) echo 'application/json; charset=utf-8' ;;
    *.webmanifest) echo 'application/manifest+json; charset=utf-8' ;;
    *.svg) echo 'image/svg+xml' ;;
    *.png) echo 'image/png' ;;
    *.jpg | *.jpeg) echo 'image/jpeg' ;;
    *.webp) echo 'image/webp' ;;
    *.gif) echo 'image/gif' ;;
    *.ico) echo 'image/x-icon' ;;
    *.woff) echo 'font/woff' ;;
    *.woff2) echo 'font/woff2' ;;
    *.txt) echo 'text/plain; charset=utf-8' ;;
    *) echo 'application/octet-stream' ;;
  esac
}

archive_marker_exists() {
  aws s3api head-object \
    --bucket "${S3_BUCKET_NAME}" \
    --key "${RELEASE_PREFIX}/${RELEASE_ID}/_complete.json" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    >/dev/null 2>&1
}

validate_archive_marker() {
  local marker_file="${WORK_DIR}/archive-marker-${RELEASE_ID}.json"

  archive_marker_exists ||
    fail "release archive ${RELEASE_ID} has no completion marker."
  aws s3 cp \
    "s3://${S3_BUCKET_NAME}/${RELEASE_PREFIX}/${RELEASE_ID}/_complete.json" \
    "${marker_file}" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    --only-show-errors
  jq -e \
    --arg commit "${RELEASE_ID}" \
    '.complete == true and .commit == $commit' \
    "${marker_file}" \
    >/dev/null || fail "release archive ${RELEASE_ID} has an invalid completion marker."
}

archive_release() {
  local archive_key="${RELEASE_PREFIX}/${RELEASE_ID}"
  local marker_file="${WORK_DIR}/next-archive-marker.json"

  if archive_marker_exists; then
    validate_archive_marker
    echo "Release archive ${RELEASE_ID} already exists and is complete."
    return
  fi

  echo "Archiving release ${RELEASE_ID}..."
  aws s3 cp \
    "${DIST_DIR}/" \
    "s3://${S3_BUCKET_NAME}/${archive_key}/" \
    --recursive \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    --only-show-errors \
    --cache-control 'no-store'

  local required_file
  for required_file in index.html version.json sw.js; do
    aws s3api head-object \
      --bucket "${S3_BUCKET_NAME}" \
      --key "${archive_key}/${required_file}" \
      --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
      >/dev/null || fail "archive is missing ${required_file}."
  done

  jq -n \
    --arg commit "${RELEASE_ID}" \
    '{commit: $commit, complete: true}' \
    >"${marker_file}"
  upload_file \
    "${marker_file}" \
    "${archive_key}/_complete.json" \
    'no-store'
  validate_archive_marker
}

publish_live_files() {
  local file relative_path
  local immutable_cache='public,max-age=31536000,immutable'
  local revalidate_cache='public,max-age=0,must-revalidate'
  local shell_cache='no-cache,no-store,max-age=0,must-revalidate'

  echo 'Publishing immutable assets...'
  if [[ -d "${DIST_DIR}/assets" ]]; then
    while IFS= read -r -d '' file; do
      relative_path="${file#"${DIST_DIR}/"}"
      upload_file "${file}" "${relative_path}" "${immutable_cache}"
    done < <(find "${DIST_DIR}/assets" -type f -print0)
  fi

  while IFS= read -r -d '' file; do
    relative_path="${file#"${DIST_DIR}/"}"
    upload_file "${file}" "${relative_path}" "${immutable_cache}"
  done < <(find "${DIST_DIR}" -maxdepth 1 -type f -name 'workbox-*.js' -print0)

  echo 'Publishing revalidated static files...'
  while IFS= read -r -d '' file; do
    relative_path="${file#"${DIST_DIR}/"}"
    case "${relative_path}" in
      assets/* | workbox-*.js | index.html | manifest.webmanifest | registerSW.js | version.json | sw.js)
        continue
        ;;
    esac
    upload_file "${file}" "${relative_path}" "${revalidate_cache}"
  done < <(find "${DIST_DIR}" -type f -print0)

  echo 'Publishing the application shell...'
  if [[ -f "${DIST_DIR}/manifest.webmanifest" ]]; then
    upload_file "${DIST_DIR}/manifest.webmanifest" 'manifest.webmanifest' "${shell_cache}"
  fi
  if [[ -f "${DIST_DIR}/registerSW.js" ]]; then
    upload_file "${DIST_DIR}/registerSW.js" 'registerSW.js' "${shell_cache}"
  fi
  upload_file "${DIST_DIR}/version.json" 'version.json' "${shell_cache}"
  upload_file "${DIST_DIR}/index.html" 'index.html' "${shell_cache}"

  # A service worker can claim open clients immediately, so it must be the
  # final live object published after every dependency and shell file exists.
  upload_file "${DIST_DIR}/sw.js" 'sw.js' "${shell_cache}"
}

invalidate_cloudfront() {
  local invalidation_id

  invalidation_id="$(
    aws cloudfront create-invalidation \
      --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
      --paths '/*' \
      --query 'Invalidation.Id' \
      --output text
  )"
  [[ -n "${invalidation_id}" && "${invalidation_id}" != 'None' ]] ||
    fail "CloudFront did not return an invalidation id."

  echo "Waiting for CloudFront invalidation ${invalidation_id}..."
  aws cloudfront wait invalidation-completed \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --id "${invalidation_id}" ||
    fail 'invalidation did not finish; files may already be live, so inspect the pilot URL before retrying.'
}

fetch_public() {
  local path="$1"
  local body_file="$2"
  local header_file="$3"

  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --max-time "${SMOKE_TIMEOUT_SECONDS:-20}" \
    --retry 2 \
    --retry-all-errors \
    --retry-delay 2 \
    --header 'Cache-Control: no-cache' \
    --header 'Pragma: no-cache' \
    --dump-header "${header_file}" \
    --output "${body_file}" \
    "${PUBLIC_URL}${path}"
}

assert_no_cache_header() {
  local header_file="$1"
  local public_path="$2"

  tr -d '\r' <"${header_file}" |
    grep -qiE '^cache-control:.*(no-cache|no-store|max-age=0)' ||
    fail "${public_path} is missing no-cache response headers."
}

smoke_release() {
  local body_file header_file deployed_commit

  echo "Smoke-testing ${PUBLIC_URL}..."

  body_file="${WORK_DIR}/version.json"
  header_file="${WORK_DIR}/version.headers"
  fetch_public "/version.json?release=${RELEASE_ID}" "${body_file}" "${header_file}"
  deployed_commit="$(jq -er '.commit | strings | select(length > 0)' "${body_file}")" ||
    fail "public version.json is not valid release JSON."
  [[ "${deployed_commit}" == "${RELEASE_ID}" ]] ||
    fail "public version.json is not release ${RELEASE_ID}."

  body_file="${WORK_DIR}/index.html"
  header_file="${WORK_DIR}/index.headers"
  fetch_public "/index.html?release=${RELEASE_ID}" "${body_file}" "${header_file}"
  cmp --silent "${DIST_DIR}/index.html" "${body_file}" ||
    fail "public index.html does not match release ${RELEASE_ID}."
  assert_no_cache_header "${header_file}" "${PUBLIC_URL}/index.html"

  body_file="${WORK_DIR}/login.html"
  header_file="${WORK_DIR}/login.headers"
  fetch_public '/login' "${body_file}" "${header_file}"
  tr -d '\r' <"${header_file}" | grep -qiE '^content-type:[[:space:]]*text/html' ||
    fail "${PUBLIC_URL}/login did not return HTML."
  cmp --silent "${DIST_DIR}/index.html" "${body_file}" ||
    fail "${PUBLIC_URL}/login did not return this release's index.html."
  assert_no_cache_header "${header_file}" "${PUBLIC_URL}/login"

  body_file="${WORK_DIR}/api-branches.json"
  header_file="${WORK_DIR}/api-branches.headers"
  fetch_public '/api/branches' "${body_file}" "${header_file}"
  tr -d '\r' <"${header_file}" | grep -qiE '^content-type:[[:space:]]*application/json' ||
    fail "${PUBLIC_URL}/api/branches did not return JSON."
  jq -e . "${body_file}" >/dev/null ||
    fail "${PUBLIC_URL}/api/branches returned invalid JSON."

  body_file="${WORK_DIR}/sw.js"
  header_file="${WORK_DIR}/sw.headers"
  fetch_public "/sw.js?release=${RELEASE_ID}" "${body_file}" "${header_file}"
  cmp --silent "${DIST_DIR}/sw.js" "${body_file}" ||
    fail "public sw.js does not match release ${RELEASE_ID}."
  assert_no_cache_header "${header_file}" "${PUBLIC_URL}/sw.js"
}

require_command aws
require_command curl
require_command jq
require_command find
require_command cmp
require_command grep
require_command tr

validate_inputs "$@"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/studyfactory-frontend-publish.XXXXXX")"

if [[ "${MODE}" == 'deploy' ]]; then
  archive_release
else
  validate_archive_marker
fi

publish_live_files
invalidate_cloudfront
smoke_release

echo "Frontend release ${RELEASE_ID} is live and verified."
