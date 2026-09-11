#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

MODE="${1:-}"
DIST_DIR="${2:-}"
RELEASE_ID="${3:-}"
RELEASE_PREFIX="${RELEASE_PREFIX:-_releases}"
DEPLOYMENT_PREFIX="${DEPLOYMENT_PREFIX:-_deploy}"
PUBLISH_WORK_DIR=""
CURRENT_RELEASE=""
LEGACY_SNAPSHOT_ID=""
TARGET_RELEASE=""
LIVE_MUTATION_STARTED=false

export AWS_PAGER=""

fail() {
  echo "Frontend publication failed: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "${PUBLISH_WORK_DIR}" && -d "${PUBLISH_WORK_DIR}" ]]; then
    case "${PUBLISH_WORK_DIR}" in
      "${TMPDIR:-/tmp}"/studyfactory-frontend-publish.*)
        rm -rf -- "${PUBLISH_WORK_DIR}"
        ;;
      *)
        echo "Refusing to remove unexpected temporary path: ${PUBLISH_WORK_DIR}" >&2
        ;;
    esac
  fi
}

handle_signal() {
  local signal_name="$1"
  local exit_status=143

  [[ "${signal_name}" != 'INT' ]] || exit_status=130
  echo "Received ${signal_name}." >&2
  set -e

  if [[ "${LIVE_MUTATION_STARTED}" == 'true' && -n "${CURRENT_RELEASE}" ]]; then
    echo "A live publication was in progress; restoring ${CURRENT_RELEASE} before exiting." >&2
    # Do not allow a second interrupt to stop the safety restoration halfway.
    trap '' INT TERM
    restore_previous_release "${CURRENT_RELEASE}" "${TARGET_RELEASE}"
  fi

  exit "${exit_status}"
}

trap cleanup EXIT
trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM

validate_release_id() {
  local release_id="$1"
  if [[ ! "${release_id}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{6,79}$ ]] ||
    [[ "${release_id}" == *".."* ]]; then
    fail "invalid release id: ${release_id}"
  fi
}

validate_prefix() {
  local name="$1"
  local value="$2"

  if [[ ! "${value}" =~ ^[A-Za-z0-9_][A-Za-z0-9._/-]*$ ]] ||
    [[ "${value}" == /* ]] || [[ "${value}" == */ ]] ||
    [[ "${value}" == *".."* ]]; then
    fail "${name} contains an unsafe S3 prefix: ${value}"
  fi
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

upload_file() {
  local source_file="$1"
  local object_key="$2"
  local cache_control="$3"
  local content_type metadata actual_cache_control actual_content_type

  content_type="$(content_type_for "${source_file}")"
  aws s3 cp \
    "${source_file}" \
    "s3://${S3_BUCKET_NAME}/${object_key}" \
    --only-show-errors \
    --cache-control "${cache_control}" \
    --content-type "${content_type}"

  metadata="$(
    aws s3api head-object \
      --bucket "${S3_BUCKET_NAME}" \
      --key "${object_key}" \
      --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
      --output json
  )"
  actual_cache_control="$(jq -r '.CacheControl // empty' <<<"${metadata}")"
  actual_content_type="$(jq -r '.ContentType // empty' <<<"${metadata}")"
  [[ "${actual_cache_control}" == "${cache_control}" ]] || {
    echo "S3 cache metadata mismatch for ${object_key}." >&2
    return 1
  }
  [[ "${actual_content_type}" == "${content_type}" ]] || {
    echo "S3 content type mismatch for ${object_key}." >&2
    return 1
  }
}

upload_if_present() {
  local relative_path="$1"
  local cache_control="$2"

  if [[ -f "${DIST_DIR}/${relative_path}" ]]; then
    upload_file \
      "${DIST_DIR}/${relative_path}" \
      "${relative_path}" \
      "${cache_control}"
  fi
}

publish_live_files() {
  local file relative_path
  local immutable_cache='public,max-age=31536000,immutable'
  local revalidate_cache='public,max-age=0,must-revalidate'
  local shell_cache='no-cache,no-store,max-age=0,must-revalidate'

  echo "Publishing immutable application assets..."
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

  echo "Publishing stable static files..."
  while IFS= read -r -d '' file; do
    relative_path="${file#"${DIST_DIR}/"}"
    case "${relative_path}" in
      assets/* | workbox-*.js | index.html | sw.js | registerSW.js | manifest.webmanifest | version.json)
        continue
        ;;
    esac
    upload_file "${file}" "${relative_path}" "${revalidate_cache}"
  done < <(find "${DIST_DIR}" -type f -print0)

  echo "Publishing the application shell..."
  upload_if_present 'manifest.webmanifest' "${shell_cache}"
  upload_if_present 'registerSW.js' "${shell_cache}"
  upload_if_present 'version.json' "${shell_cache}"
  upload_file "${DIST_DIR}/index.html" 'index.html' "${shell_cache}"

  # The service worker can claim open clients immediately. It must be the final
  # live object so it can never activate before the rest of its release exists.
  upload_file "${DIST_DIR}/sw.js" 'sw.js' "${shell_cache}"
}

archive_marker_exists() {
  local release_id="$1"
  aws s3api head-object \
    --bucket "${S3_BUCKET_NAME}" \
    --key "${RELEASE_PREFIX}/${release_id}/_complete.json" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    >/dev/null 2>&1
}

assert_archive_complete() {
  local release_id="$1"
  local marker_file="${PUBLISH_WORK_DIR}/marker-${release_id}.json"

  archive_marker_exists "${release_id}" ||
    fail "release archive ${release_id} is missing its completion marker."
  aws s3 cp \
    "s3://${S3_BUCKET_NAME}/${RELEASE_PREFIX}/${release_id}/_complete.json" \
    "${marker_file}" \
    --only-show-errors
  jq -e \
    --arg release "${release_id}" \
    '.complete == true and .release == $release' \
    "${marker_file}" \
    >/dev/null || fail "release archive ${release_id} has an invalid completion marker."
}

archive_release() {
  local source_dir="$1"
  local release_id="$2"
  local archive_key="${RELEASE_PREFIX}/${release_id}"
  local existing_key_count marker_file created_at

  if archive_marker_exists "${release_id}"; then
    assert_archive_complete "${release_id}"
    echo "Release archive ${release_id} already exists; leaving it immutable."
    return
  fi

  existing_key_count="$(
    aws s3api list-objects-v2 \
      --bucket "${S3_BUCKET_NAME}" \
      --prefix "${archive_key}/" \
      --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
      --max-keys 1 \
      --query 'KeyCount' \
      --output text
  )"
  [[ "${existing_key_count}" == "0" ]] ||
    fail "an incomplete archive already exists at ${archive_key}; inspect it manually."

  echo "Archiving release ${release_id}..."
  aws s3 cp \
    "${source_dir}/" \
    "s3://${S3_BUCKET_NAME}/${archive_key}/" \
    --recursive \
    --only-show-errors \
    --cache-control 'no-store'

  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  marker_file="${PUBLISH_WORK_DIR}/archive-marker.json"
  jq -n \
    --arg release "${release_id}" \
    --arg createdAt "${created_at}" \
    '{release: $release, createdAt: $createdAt, complete: true}' \
    >"${marker_file}"
  upload_file \
    "${marker_file}" \
    "${archive_key}/_complete.json" \
    'no-store'
}

read_current_release() {
  local pointer_key="${DEPLOYMENT_PREFIX}/current.json"
  local pointer_file="${PUBLISH_WORK_DIR}/current.json"
  local listing listed_key current_release

  listing="$(
    aws s3api list-objects-v2 \
      --bucket "${S3_BUCKET_NAME}" \
      --prefix "${pointer_key}" \
      --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
      --max-keys 1 \
      --output json
  )" || fail "the current release pointer could not be inspected."
  listed_key="$(jq -r '.Contents[0].Key // empty' <<<"${listing}")"
  if [[ "${listed_key}" != "${pointer_key}" ]]; then
    CURRENT_RELEASE=""
    return 0
  fi

  aws s3 cp \
    "s3://${S3_BUCKET_NAME}/${pointer_key}" \
    "${pointer_file}" \
    --only-show-errors
  current_release="$(jq -er '.release | strings | select(length > 0)' "${pointer_file}")" ||
    fail "${pointer_key} does not contain a valid release id."
  validate_release_id "${current_release}"
  CURRENT_RELEASE="${current_release}"
}

snapshot_legacy_live_site() {
  local snapshot_id snapshot_dir

  snapshot_id="legacy-pre-v2-$(date -u +%Y%m%dT%H%M%SZ)"
  snapshot_dir="${PUBLISH_WORK_DIR}/legacy-live"
  mkdir -p "${snapshot_dir}"

  echo "No release pointer exists. Snapshotting the current production frontend as ${snapshot_id}..." >&2
  aws s3 sync \
    "s3://${S3_BUCKET_NAME}/" \
    "${snapshot_dir}/" \
    --exclude "${RELEASE_PREFIX}/*" \
    --exclude "${DEPLOYMENT_PREFIX}/*" \
    --only-show-errors

  [[ -f "${snapshot_dir}/index.html" ]] ||
    fail "the live bucket has no index.html to preserve."
  [[ -f "${snapshot_dir}/sw.js" ]] ||
    fail "the live bucket has no sw.js to preserve."
  [[ -z "$(find "${snapshot_dir}" -type l -print -quit)" ]] ||
    fail "the live snapshot contains a symbolic link."

  verify_public_baseline "${snapshot_dir}"
  archive_release "${snapshot_dir}" "${snapshot_id}"
  LEGACY_SNAPSHOT_ID="${snapshot_id}"
}

download_archive() {
  local release_id="$1"
  local destination="$2"

  assert_archive_complete "${release_id}"
  mkdir -p "${destination}"
  aws s3 sync \
    "s3://${S3_BUCKET_NAME}/${RELEASE_PREFIX}/${release_id}/" \
    "${destination}/" \
    --exclude '_complete.json' \
    --only-show-errors || fail "release ${release_id} could not be downloaded completely."

  [[ -f "${destination}/index.html" ]] ||
    fail "release ${release_id} has no index.html."
  [[ -f "${destination}/sw.js" ]] ||
    fail "release ${release_id} has no sw.js."
  [[ -z "$(find "${destination}" -type l -print -quit)" ]] ||
    fail "release ${release_id} contains a symbolic link."
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
  [[ -n "${invalidation_id}" && "${invalidation_id}" != "None" ]] ||
    return 1

  echo "Waiting for CloudFront invalidation ${invalidation_id}..."
  aws cloudfront wait invalidation-completed \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --id "${invalidation_id}"
}

fetch_public_file() {
  local relative_path="$1"
  local output_file="$2"
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
    --dump-header "${header_file}" \
    --output "${output_file}" \
    "${PUBLIC_URL}/${relative_path}"
}

assert_public_matches() {
  local relative_path="$1"
  local expected_file="$2"
  local safe_name actual_file header_file

  safe_name="${relative_path//\//_}"
  actual_file="${PUBLISH_WORK_DIR}/smoke-${safe_name}.body"
  header_file="${PUBLISH_WORK_DIR}/smoke-${safe_name}.headers"
  fetch_public_file "${relative_path}" "${actual_file}" "${header_file}"
  cmp --silent "${expected_file}" "${actual_file}" || {
    echo "Public ${relative_path} does not match the intended release." >&2
    return 1
  }
}

assert_shell_cache_headers() {
  local relative_path="$1"
  local body_file="${PUBLISH_WORK_DIR}/cache.body"
  local header_file="${PUBLISH_WORK_DIR}/cache.headers"

  fetch_public_file "${relative_path}" "${body_file}" "${header_file}"
  tr -d '\r' <"${header_file}" |
    grep -qiE '^cache-control:.*(no-cache|no-store|max-age=0)' || {
    echo "Public ${relative_path} is missing revalidation cache headers." >&2
    return 1
  }
}

assert_spa_route() {
  local route="$1"
  local expected_index="$2"
  local safe_name body_file header_file

  safe_name="${route//\//_}"
  body_file="${PUBLISH_WORK_DIR}/route-${safe_name}.body"
  header_file="${PUBLISH_WORK_DIR}/route-${safe_name}.headers"
  fetch_public_file "${route}" "${body_file}" "${header_file}"
  cmp --silent "${expected_index}" "${body_file}" || {
    echo "SPA route /${route} did not return this release's index.html." >&2
    return 1
  }
}

assert_api_proxy() {
  local body_file="${PUBLISH_WORK_DIR}/api-branches.body"
  local header_file="${PUBLISH_WORK_DIR}/api-branches.headers"

  fetch_public_file 'api/branches' "${body_file}" "${header_file}"
  tr -d '\r' <"${header_file}" | grep -qiE '^content-type:[[:space:]]*application/json' || {
    echo "${PUBLIC_URL}/api/branches did not return JSON." >&2
    return 1
  }
  jq -e . "${body_file}" >/dev/null || {
    echo "${PUBLIC_URL}/api/branches returned invalid JSON." >&2
    return 1
  }
}

verify_public_baseline() {
  local source_dir="$1"
  local file relative_path

  echo "Verifying that the rollback snapshot matches current public production..."
  assert_public_matches '' "${source_dir}/index.html"
  assert_public_matches 'index.html' "${source_dir}/index.html"
  assert_public_matches 'sw.js' "${source_dir}/sw.js"

  if [[ -f "${source_dir}/manifest.webmanifest" ]]; then
    assert_public_matches 'manifest.webmanifest' "${source_dir}/manifest.webmanifest"
  fi

  while IFS= read -r -d '' file; do
    relative_path="${file#"${source_dir}/"}"
    [[ "${relative_path}" == 'sw.js' ]] && continue
    assert_public_matches "${relative_path}" "${file}"
  done < <(find "${source_dir}" -type f \( -name '*.js' -o -name '*.css' \) -print0)

}

smoke_release() {
  local source_dir="$1"
  local release_id="$2"
  local file relative_path deployed_commit

  echo "Smoke-testing ${PUBLIC_URL}..."
  assert_public_matches '' "${source_dir}/index.html"
  assert_public_matches 'index.html' "${source_dir}/index.html"
  assert_public_matches 'sw.js' "${source_dir}/sw.js"
  assert_shell_cache_headers 'index.html'
  assert_shell_cache_headers 'sw.js'

  if [[ -f "${source_dir}/manifest.webmanifest" ]]; then
    assert_public_matches 'manifest.webmanifest' "${source_dir}/manifest.webmanifest"
  fi
  if [[ -f "${source_dir}/registerSW.js" ]]; then
    assert_public_matches 'registerSW.js' "${source_dir}/registerSW.js"
  fi

  while IFS= read -r -d '' file; do
    relative_path="${file#"${source_dir}/"}"
    assert_public_matches "${relative_path}" "${file}"
  done < <(find "${source_dir}/assets" -type f \( -name '*.js' -o -name '*.css' \) -print0 2>/dev/null)

  while IFS= read -r -d '' file; do
    relative_path="${file#"${source_dir}/"}"
    assert_public_matches "${relative_path}" "${file}"
  done < <(find "${source_dir}" -maxdepth 1 -type f -name 'workbox-*.js' -print0)

  # Legacy snapshots intentionally have no version.json. They receive a basic
  # shell/PWA smoke test so an emergency rollback does not depend on v2 routes.
  if [[ ! -f "${source_dir}/version.json" ]]; then
    return
  fi

  assert_public_matches 'version.json' "${source_dir}/version.json"
  deployed_commit="$(jq -er '.commit' "${source_dir}/version.json")"
  [[ "${deployed_commit}" == "${release_id}" ]] || {
    echo "version.json does not match release ${release_id}." >&2
    return 1
  }

  assert_spa_route 'login' "${source_dir}/index.html"
  assert_spa_route 'member/plans' "${source_dir}/index.html"
  assert_spa_route 'staff/attendance' "${source_dir}/index.html"
  assert_spa_route 'admin/operations/beverages' "${source_dir}/index.html"
  assert_api_proxy
}

write_release_pointer() {
  local release_id="$1"
  local previous_release="$2"
  local reason="$3"
  local deployed_at pointer_file history_key

  deployed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  pointer_file="${PUBLISH_WORK_DIR}/next-current.json"
  history_key="${DEPLOYMENT_PREFIX}/history/$(date -u +%Y%m%dT%H%M%SZ)-${release_id}.json"

  jq -n \
    --arg release "${release_id}" \
    --arg previousRelease "${previous_release}" \
    --arg deployedAt "${deployed_at}" \
    --arg reason "${reason}" \
    '{
      release: $release,
      previousRelease: $previousRelease,
      deployedAt: $deployedAt,
      reason: $reason
    }' >"${pointer_file}"

  upload_file "${pointer_file}" "${history_key}" 'no-store'
  upload_file "${pointer_file}" "${DEPLOYMENT_PREFIX}/current.json" 'no-store'
}

attempt_publication() {
  local source_dir="$1"
  local release_id="$2"
  local previous_release="$3"
  local reason="$4"

  (
    set -Eeuo pipefail
    DIST_DIR="${source_dir}"
    publish_live_files
    invalidate_cloudfront
    smoke_release "${source_dir}" "${release_id}"
    write_release_pointer "${release_id}" "${previous_release}" "${reason}"
  )
}

restore_previous_release() {
  local previous_release="$1"
  local failed_release="$2"
  local restore_dir="${PUBLISH_WORK_DIR}/automatic-restore"
  local restore_status

  echo "Publication failed. Restoring ${previous_release}..." >&2
  download_archive "${previous_release}" "${restore_dir}"
  set +e
  (
    set -Eeuo pipefail
    DIST_DIR="${restore_dir}"
    publish_live_files
    invalidate_cloudfront
    smoke_release "${restore_dir}" "${previous_release}"
    write_release_pointer \
      "${previous_release}" \
      "${failed_release}" \
      'automatic-rollback'
  )
  restore_status=$?
  set -e
  [[ ${restore_status} -eq 0 ]] ||
    fail "automatic restoration of ${previous_release} also failed; inspect production immediately."

  echo "Previous release ${previous_release} was restored." >&2
}

[[ "${MODE}" == 'deploy' || "${MODE}" == 'rollback' ]] ||
  fail "usage: publish-s3.sh <deploy|rollback> <dist-directory> <release-id>"
[[ -n "${DIST_DIR}" && -d "${DIST_DIR}" ]] || fail "release directory is missing."
[[ -n "${S3_BUCKET_NAME:-}" ]] || fail "S3_BUCKET_NAME is required."
[[ "${EXPECTED_AWS_ACCOUNT_ID:-}" =~ ^[0-9]{12}$ ]] ||
  fail "EXPECTED_AWS_ACCOUNT_ID is required."
[[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]] ||
  fail "CLOUDFRONT_DISTRIBUTION_ID is required."
[[ -n "${PUBLIC_URL:-}" ]] || fail "PUBLIC_URL is required."
[[ -n "${DEPLOY_LOCK_DIR:-}" && -d "${DEPLOY_LOCK_DIR}" ]] ||
  fail "the deployment lock is not held; run ./deploy.sh."
[[ -f "${DIST_DIR}/index.html" ]] || fail "release has no index.html."
[[ -f "${DIST_DIR}/sw.js" ]] || fail "release has no sw.js."
[[ -z "$(find "${DIST_DIR}" -type l -print -quit)" ]] ||
  fail "release contains a symbolic link."

validate_release_id "${RELEASE_ID}"
validate_prefix RELEASE_PREFIX "${RELEASE_PREFIX}"
validate_prefix DEPLOYMENT_PREFIX "${DEPLOYMENT_PREFIX}"

release_root="${RELEASE_PREFIX%%/*}"
deployment_root="${DEPLOYMENT_PREFIX%%/*}"
[[ ! -e "${DIST_DIR}/${release_root}" ]] ||
  fail "release contains the reserved ${release_root} deployment path."
[[ ! -e "${DIST_DIR}/${deployment_root}" ]] ||
  fail "release contains the reserved ${deployment_root} deployment path."
[[ -z "$(find "${DIST_DIR}" -type f -name '.env*' -print -quit)" ]] ||
  fail "release contains an environment file."

PUBLISH_WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/studyfactory-frontend-publish.XXXXXX")"

if [[ "${MODE}" == 'deploy' ]]; then
  echo "Checking the existing public API before any frontend mutation..."
  assert_api_proxy
fi

read_current_release
current_release="${CURRENT_RELEASE}"
if [[ -z "${current_release}" ]]; then
  snapshot_legacy_live_site
  current_release="${LEGACY_SNAPSHOT_ID}"
  # Persist the untouched legacy baseline before the first live object changes.
  # If the host loses power mid-cutover, the next run can still restore the
  # genuine old frontend instead of snapshotting a partially published mix.
  write_release_pointer "${current_release}" '' 'legacy-baseline'
else
  assert_archive_complete "${current_release}"
fi
CURRENT_RELEASE="${current_release}"
TARGET_RELEASE="${RELEASE_ID}"

if [[ "${MODE}" == 'deploy' ]]; then
  archive_release "${DIST_DIR}" "${RELEASE_ID}"
else
  assert_archive_complete "${RELEASE_ID}"
fi

LIVE_MUTATION_STARTED=true
set +e
attempt_publication \
  "${DIST_DIR}" \
  "${RELEASE_ID}" \
  "${current_release}" \
  "${MODE}"
publication_status=$?
set -e

if [[ ${publication_status} -ne 0 ]]; then
  # Once recovery begins, it must not be interrupted between shell files.
  trap '' INT TERM
  restore_previous_release "${current_release}" "${RELEASE_ID}"
  fail "release ${RELEASE_ID} was not deployed; production was restored."
fi

LIVE_MUTATION_STARTED=false
echo "Frontend release ${RELEASE_ID} is live and verified."
echo "Previous release: ${current_release}"
echo "Rollback command: ./deploy.sh --rollback ${current_release}"
