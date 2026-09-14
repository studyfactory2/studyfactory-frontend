#!/usr/bin/env bash
set -Eeuo pipefail

umask 077
export AWS_PAGER=''

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
APP_DIR="${SCRIPT_DIR}"
ENV_FILE="${APP_DIR}/.env.production"
PUBLISH_SCRIPT="${APP_DIR}/scripts/deploy/publish.sh"
RELEASE_PREFIX='_releases'
WORK_DIR=''
LOCK_FILE=''

fail() {
  echo "Frontend deployment failed: $*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  ./deploy.sh
  ./deploy.sh --rollback <full-40-character-release-commit>
  ./deploy.sh --help

The normal command deploys the exact origin/master commit. Rollback republishes
one archived release from s3://$S3_BUCKET_NAME/_releases/<commit>/.
USAGE
}

cleanup() {
  if [[ -n "${WORK_DIR}" && -d "${WORK_DIR}" ]]; then
    case "${WORK_DIR}" in
      "${TMPDIR:-/tmp}"/studyfactory-frontend-deploy.*)
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
  [[ -n "${!name:-}" ]] || fail "${name} is required in .env.production."
}

confirm_release() {
  local release_id="$1"
  local action="$2"
  local short_release="${release_id:0:8}"
  local typed=''

  echo
  echo "${action}: ${release_id}"
  echo "AWS account: ${EXPECTED_AWS_ACCOUNT_ID}"
  echo "S3 bucket: ${S3_BUCKET_NAME}"
  echo "CloudFront distribution: ${CLOUDFRONT_DISTRIBUTION_ID}"
  echo "Public URL: ${PUBLIC_URL}"
  echo
  read -r -p "Type ${short_release} to continue: " typed
  [[ "${typed}" == "${short_release}" ]] || fail 'confirmation did not match.'
}

validate_configuration() {
  require_value AWS_REGION
  require_value EXPECTED_AWS_ACCOUNT_ID
  require_value S3_BUCKET_NAME
  require_value CLOUDFRONT_DISTRIBUTION_ID
  require_value PUBLIC_URL
  require_value DEPLOY_ENVIRONMENT
  require_value DEPLOY_BRANCH
  require_value LEGACY_S3_BUCKET_NAME
  require_value LEGACY_CLOUDFRONT_DISTRIBUTION_ID

  [[ "${DEPLOY_ENVIRONMENT}" == 'production' ]] ||
    fail 'DEPLOY_ENVIRONMENT must be production.'
  [[ "${DEPLOY_BRANCH}" == 'master' ]] ||
    fail 'DEPLOY_BRANCH must be master.'
  [[ "${EXPECTED_AWS_ACCOUNT_ID}" =~ ^[0-9]{12}$ ]] ||
    fail 'EXPECTED_AWS_ACCOUNT_ID must be a 12-digit AWS account id.'
  [[ "${S3_BUCKET_NAME}" != s3://* ]] ||
    fail 'S3_BUCKET_NAME must be a bucket name, not an s3:// URL.'
  [[ "${S3_BUCKET_NAME}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
    fail 'S3_BUCKET_NAME does not look valid.'
  [[ "${CLOUDFRONT_DISTRIBUTION_ID}" =~ ^[A-Z0-9]{8,32}$ ]] ||
    fail 'CLOUDFRONT_DISTRIBUTION_ID does not look valid.'
  [[ "${PUBLIC_URL}" =~ ^https://[A-Za-z0-9.-]+$ ]] ||
    fail 'PUBLIC_URL must be an HTTPS origin without a trailing slash or path.'
  [[ "${LEGACY_S3_BUCKET_NAME}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
    fail 'LEGACY_S3_BUCKET_NAME does not look valid.'
  [[ "${LEGACY_CLOUDFRONT_DISTRIBUTION_ID}" =~ ^[A-Z0-9]{8,32}$ ]] ||
    fail 'LEGACY_CLOUDFRONT_DISTRIBUTION_ID does not look valid.'
  [[ "${S3_BUCKET_NAME}" != "${LEGACY_S3_BUCKET_NAME}" ]] ||
    fail 'S3_BUCKET_NAME is the legacy frontend bucket; use the isolated v2 bucket.'
  [[ "${CLOUDFRONT_DISTRIBUTION_ID}" != "${LEGACY_CLOUDFRONT_DISTRIBUTION_ID}" ]] ||
    fail 'CLOUDFRONT_DISTRIBUTION_ID is the legacy frontend distribution.'
}

aws_preflight() {
  local actual_account bucket_region distribution_json distribution_domain
  local default_origin_id default_origin_domain default_origin_path api_origin_id api_origin_domain
  local legacy_distribution_json legacy_api_origin_id legacy_api_origin_domain
  local api_cache_policy_id api_origin_request_policy_id expected_cache_policy_id expected_origin_request_policy_id
  local api_body api_headers

  actual_account="$(aws sts get-caller-identity --query Account --output text)" ||
    fail 'could not read the current AWS account.'
  [[ "${actual_account}" == "${EXPECTED_AWS_ACCOUNT_ID}" ]] ||
    fail "AWS account ${actual_account} is not ${EXPECTED_AWS_ACCOUNT_ID}."

  aws s3api head-bucket \
    --bucket "${S3_BUCKET_NAME}" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" >/dev/null ||
    fail 'the target S3 bucket is missing or inaccessible.'

  bucket_region="$(aws s3api get-bucket-location \
    --bucket "${S3_BUCKET_NAME}" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    --query 'LocationConstraint' \
    --output text)" || fail 'could not read the bucket region.'
  [[ "${bucket_region}" == 'None' ]] && bucket_region='us-east-1'
  [[ "${bucket_region}" == 'EU' ]] && bucket_region='eu-west-1'
  [[ "${bucket_region}" == "${AWS_REGION}" ]] ||
    fail "bucket region ${bucket_region} is not AWS_REGION ${AWS_REGION}."

  distribution_json="$(aws cloudfront get-distribution \
    --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --output json)" || fail 'could not read the CloudFront distribution.'

  [[ "$(jq -r '.Distribution.Status' <<<"${distribution_json}")" == 'Deployed' ]] ||
    fail 'CloudFront distribution status is not Deployed.'
  [[ "$(jq -r '.Distribution.DistributionConfig.Enabled' <<<"${distribution_json}")" == 'true' ]] ||
    fail 'CloudFront distribution is disabled.'
  [[ "$(jq -r '.Distribution.DistributionConfig.DefaultRootObject' <<<"${distribution_json}")" == 'index.html' ]] ||
    fail 'CloudFront DefaultRootObject must be index.html.'

  default_origin_id="$(jq -er '.Distribution.DistributionConfig.DefaultCacheBehavior.TargetOriginId' <<<"${distribution_json}")" ||
    fail 'CloudFront has no default origin.'
  default_origin_domain="$(jq -er --arg id "${default_origin_id}" \
    '.Distribution.DistributionConfig.Origins.Items[] | select(.Id == $id) | .DomainName' \
    <<<"${distribution_json}")" || fail 'could not resolve the default origin.'
  default_origin_path="$(jq -r --arg id "${default_origin_id}" \
    '.Distribution.DistributionConfig.Origins.Items[] | select(.Id == $id) | (.OriginPath // "")' \
    <<<"${distribution_json}")"
  [[ -z "${default_origin_path}" ]] || fail 'frontend origin must not have an OriginPath.'
  [[ "${default_origin_domain}" == "${S3_BUCKET_NAME}.s3."*'.amazonaws.com' ||
     "${default_origin_domain}" == "${S3_BUCKET_NAME}.s3.amazonaws.com" ]] ||
    fail "CloudFront default origin ${default_origin_domain} is not ${S3_BUCKET_NAME}."

  api_origin_id="$(jq -er '
    .Distribution.DistributionConfig.CacheBehaviors.Items[]?
    | select(.PathPattern == "/api/*")
    | .TargetOriginId
  ' <<<"${distribution_json}")" || fail 'CloudFront has no /api/* behavior.'
  [[ "${api_origin_id}" != "${default_origin_id}" ]] ||
    fail '/api/* must not target the frontend S3 origin.'
  api_origin_domain="$(jq -er --arg id "${api_origin_id}" \
    '.Distribution.DistributionConfig.Origins.Items[] | select(.Id == $id) | .DomainName' \
    <<<"${distribution_json}")" || fail 'could not resolve the /api/* origin.'
  [[ -n "${api_origin_domain}" ]] || fail '/api/* origin has no domain.'

  legacy_distribution_json="$(aws cloudfront get-distribution \
    --id "${LEGACY_CLOUDFRONT_DISTRIBUTION_ID}" \
    --output json)" || fail 'could not read the legacy CloudFront distribution.'
  legacy_api_origin_id="$(jq -er '
    .Distribution.DistributionConfig.CacheBehaviors.Items[]?
    | select(.PathPattern == "/api/*")
    | .TargetOriginId
  ' <<<"${legacy_distribution_json}")" || fail 'legacy CloudFront has no /api/* behavior.'
  legacy_api_origin_domain="$(jq -er --arg id "${legacy_api_origin_id}" \
    '.Distribution.DistributionConfig.Origins.Items[] | select(.Id == $id) | .DomainName' \
    <<<"${legacy_distribution_json}")" || fail 'could not resolve the legacy /api/* origin.'
  [[ "${api_origin_domain}" == "${legacy_api_origin_domain}" ]] ||
    fail "v2 /api/* targets ${api_origin_domain}, not the production backend ${legacy_api_origin_domain}."
  jq -e '
    [.Distribution.DistributionConfig.CacheBehaviors.Items[]?
      | select(.PathPattern == "/api/*")
      | .AllowedMethods.Items[]] as $methods
    | (["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      | all(. as $method | $methods | index($method) != null))
  ' <<<"${distribution_json}" >/dev/null ||
    fail '/api/* must allow all API methods.'

  api_cache_policy_id="$(jq -er '
    .Distribution.DistributionConfig.CacheBehaviors.Items[]?
    | select(.PathPattern == "/api/*")
    | .CachePolicyId
  ' <<<"${distribution_json}")" || fail '/api/* has no cache policy.'
  api_origin_request_policy_id="$(jq -er '
    .Distribution.DistributionConfig.CacheBehaviors.Items[]?
    | select(.PathPattern == "/api/*")
    | .OriginRequestPolicyId
  ' <<<"${distribution_json}")" || fail '/api/* has no origin request policy.'
  expected_cache_policy_id="$(aws cloudfront list-cache-policies --type managed \
    --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='Managed-CachingDisabled'].CachePolicy.Id | [0]" \
    --output text)" || fail 'could not resolve Managed-CachingDisabled.'
  expected_origin_request_policy_id="$(aws cloudfront list-origin-request-policies --type managed \
    --query "OriginRequestPolicyList.Items[?OriginRequestPolicy.OriginRequestPolicyConfig.Name=='Managed-AllViewerExceptHostHeader'].OriginRequestPolicy.Id | [0]" \
    --output text)" || fail 'could not resolve Managed-AllViewerExceptHostHeader.'
  [[ "${api_cache_policy_id}" == "${expected_cache_policy_id}" ]] ||
    fail '/api/* must use Managed-CachingDisabled.'
  [[ "${api_origin_request_policy_id}" == "${expected_origin_request_policy_id}" ]] ||
    fail '/api/* must use Managed-AllViewerExceptHostHeader.'

  distribution_domain="$(jq -er '.Distribution.DomainName' <<<"${distribution_json}")" ||
    fail 'CloudFront has no public domain.'
  jq -e --arg host "${PUBLIC_URL#https://}" --arg domain "${distribution_domain}" '
    ($host == $domain) or
    ((.Distribution.DistributionConfig.Aliases.Items // []) | index($host) != null)
  ' <<<"${distribution_json}" >/dev/null ||
    fail 'PUBLIC_URL is not this CloudFront domain or one of its aliases.'

  api_body="${WORK_DIR}/preflight-api.json"
  api_headers="${WORK_DIR}/preflight-api.headers"
  curl --fail --silent --show-error --location --max-time 20 \
    --header 'Cache-Control: no-cache' \
    --dump-header "${api_headers}" \
    --output "${api_body}" \
    "${PUBLIC_URL}/api/branches" ||
    fail 'the new public /api/* route is not reachable; no S3 files were changed.'
  tr -d '\r' <"${api_headers}" | grep -qiE '^content-type:[[:space:]]*application/json' ||
    fail 'the new public /api/* route did not return JSON; no S3 files were changed.'
  jq -e . "${api_body}" >/dev/null ||
    fail 'the new public /api/* route returned invalid JSON; no S3 files were changed.'
}

verify_repository() {
  local origin_url head_commit upstream_commit

  origin_url="$(git -C "${APP_DIR}" remote get-url origin)" || fail 'Git origin is missing.'
  case "${origin_url}" in
    git@github.com:studyfactory2/studyfactory-frontend.git|https://github.com/studyfactory2/studyfactory-frontend.git)
      ;;
    *)
      fail "unexpected Git origin: ${origin_url}"
      ;;
  esac

  [[ -z "$(git -C "${APP_DIR}" status --porcelain)" ]] ||
    fail 'working tree is not clean.'

  git -C "${APP_DIR}" fetch --prune origin "${DEPLOY_BRANCH}" >&2
  if git -C "${APP_DIR}" show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git -C "${APP_DIR}" checkout "${DEPLOY_BRANCH}" >&2
  else
    git -C "${APP_DIR}" checkout --track -b "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}" >&2
  fi
  git -C "${APP_DIR}" merge --ff-only "origin/${DEPLOY_BRANCH}" >&2

  head_commit="$(git -C "${APP_DIR}" rev-parse HEAD)"
  upstream_commit="$(git -C "${APP_DIR}" rev-parse "origin/${DEPLOY_BRANCH}")"
  [[ "${head_commit}" == "${upstream_commit}" ]] ||
    fail 'local master is not exactly origin/master.'
  printf '%s\n' "${head_commit}"
}

validate_release() {
  local dist_dir="$1"
  local release_id="$2"
  local built_commit

  [[ -f "${dist_dir}/index.html" ]] || fail 'build has no index.html.'
  [[ -d "${dist_dir}/assets" ]] || fail 'build has no assets directory.'
  [[ -n "$(find "${dist_dir}/assets" -type f -name '*.js' -print -quit)" ]] ||
    fail 'build has no JavaScript asset.'
  [[ -n "$(find "${dist_dir}/assets" -type f -name '*.css' -print -quit)" ]] ||
    fail 'build has no CSS asset.'
  [[ -f "${dist_dir}/manifest.webmanifest" ]] || fail 'build has no manifest.webmanifest.'
  [[ -f "${dist_dir}/registerSW.js" ]] || fail 'build has no registerSW.js.'
  [[ -f "${dist_dir}/sw.js" ]] || fail 'build has no sw.js.'
  [[ -f "${dist_dir}/version.json" ]] || fail 'build has no version.json.'
  [[ -z "$(find "${dist_dir}" -type l -print -quit)" ]] || fail 'build contains a symbolic link.'
  [[ -z "$(find "${dist_dir}" -type f -name '.env*' -print -quit)" ]] ||
    fail 'build contains an environment file.'
  [[ ! -e "${dist_dir}/${RELEASE_PREFIX}" ]] || fail 'build contains the reserved release path.'

  jq -e . "${dist_dir}/manifest.webmanifest" >/dev/null || fail 'web manifest is invalid JSON.'
  built_commit="$(jq -er '.commit | strings | select(length > 0)' "${dist_dir}/version.json")" ||
    fail 'version.json has no commit.'
  [[ "${built_commit}" == "${release_id}" ]] || fail 'version.json commit is wrong.'
}

build_release() {
  local release_id="$1"
  local source_dir="${WORK_DIR}/source"
  local output_dir="${WORK_DIR}/dist"

  mkdir -p "${source_dir}" "${output_dir}"
  git -C "${APP_DIR}" archive "${release_id}" | tar -x -C "${source_dir}"

  if grep -RInE --exclude-dir=node_modules --exclude='*.map' \
    'https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|/|$)' "${source_dir}/src"; then
    fail 'source contains a loopback URL.'
  fi

  docker run --rm \
    -e HOST_UID="$(id -u)" \
    -e HOST_GID="$(id -g)" \
    -v "${source_dir}:/source:ro" \
    -v "${output_dir}:/output" \
    -w /app \
    "${BUILD_IMAGE}" \
    bash -lc '
      node -e '\''
        const http = require("http");
        const request = http.request({
          host: "169.254.169.254",
          path: "/latest/api/token",
          method: "PUT",
          headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
          timeout: 1500,
        }, (response) => {
          console.error("Refusing to build: EC2 instance metadata is reachable from Docker.");
          response.resume();
          process.exitCode = 42;
        });
        request.on("timeout", () => request.destroy(new Error("timeout")));
        request.on("error", () => process.exit(0));
        request.end();
      '\''
      cp -a /source/. /app/
      corepack enable
      corepack prepare yarn@1.22.22 --activate
      yarn install --frozen-lockfile --non-interactive
      yarn format:check
      yarn lint
      yarn test:seoul-date
      yarn build
      cp -a dist/. /output/
      chown -R "${HOST_UID}:${HOST_GID}" /output
    ' >&2

  jq -n \
    --arg commit "${release_id}" \
    --arg builtAt "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    '{commit: $commit, builtAt: $builtAt}' >"${output_dir}/version.json"
  validate_release "${output_dir}" "${release_id}"
  printf '%s\n' "${output_dir}"
}

download_archive() {
  local release_id="$1"
  local archive_dir="${WORK_DIR}/archive"
  local archive_key="${RELEASE_PREFIX}/${release_id}"

  aws s3api head-object --bucket "${S3_BUCKET_NAME}" \
    --key "${archive_key}/_complete.json" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" >/dev/null ||
    fail 'archived release is incomplete.'
  aws s3api head-object --bucket "${S3_BUCKET_NAME}" \
    --key "${archive_key}/index.html" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" >/dev/null ||
    fail 'archived release has no index.html.'
  aws s3api head-object --bucket "${S3_BUCKET_NAME}" \
    --key "${archive_key}/version.json" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" >/dev/null ||
    fail 'archived release has no version.json.'
  aws s3api head-object --bucket "${S3_BUCKET_NAME}" \
    --key "${archive_key}/sw.js" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" >/dev/null ||
    fail 'archived release has no sw.js.'

  mkdir -p "${archive_dir}"
  aws s3 cp "s3://${S3_BUCKET_NAME}/${archive_key}/" "${archive_dir}/" \
    --recursive \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    --only-show-errors >&2
  [[ "$(jq -er '.commit' "${archive_dir}/_complete.json")" == "${release_id}" ]] ||
    fail 'archive completion marker does not match the requested release.'
  rm -f -- "${archive_dir}/_complete.json"
  validate_release "${archive_dir}" "${release_id}"
  printf '%s\n' "${archive_dir}"
}

main() {
  local mode='deploy' release_id='' release_dir='' env_mode=''

  case "${1:-}" in
    '')
      ;;
    --rollback)
      [[ $# -eq 2 ]] || { usage >&2; exit 2; }
      mode='rollback'
      release_id="$2"
      [[ "${release_id}" =~ ^[0-9a-f]{40}$ ]] ||
        fail 'rollback release must be a full lowercase 40-character Git commit SHA.'
      ;;
    --help|-h)
      usage
      return 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac

  [[ -f "${ENV_FILE}" ]] || fail '.env.production is missing.'
  require_command stat
  env_mode="$(stat -c '%a' "${ENV_FILE}")" || fail 'could not read .env.production permissions.'
  [[ "${env_mode}" == '600' ]] ||
    fail ".env.production permissions are ${env_mode}; run chmod 600 .env.production."
  # This is an operator-owned shell environment file. Keep it chmod 600.
  # shellcheck disable=SC1090
  source "${ENV_FILE}"

  PUBLIC_URL="${PUBLIC_URL:-}"
  PUBLIC_URL="${PUBLIC_URL%/}"
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
  DEPLOY_ENVIRONMENT="${DEPLOY_ENVIRONMENT:-production}"
  BUILD_IMAGE="${BUILD_IMAGE:-node:22-bookworm-slim}"

  require_command aws
  require_command curl
  require_command find
  require_command grep
  require_command flock
  require_command jq
  require_command mktemp
  require_command tar
  require_command tr

  validate_configuration
  [[ -x "${PUBLISH_SCRIPT}" ]] || fail "publisher is not executable: ${PUBLISH_SCRIPT}"

  export AWS_REGION EXPECTED_AWS_ACCOUNT_ID S3_BUCKET_NAME
  export CLOUDFRONT_DISTRIBUTION_ID PUBLIC_URL

  LOCK_FILE="${TMPDIR:-/tmp}/studyfactory-frontend-deploy.lock"
  exec 9>"${LOCK_FILE}"
  flock -n 9 || fail 'another frontend deployment is running.'
  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/studyfactory-frontend-deploy.XXXXXX")"

  aws_preflight

  if [[ "${mode}" == 'rollback' ]]; then
    confirm_release "${release_id}" 'Rollback release'
    release_dir="$(download_archive "${release_id}")"
    "${PUBLISH_SCRIPT}" rollback "${release_dir}" "${release_id}"
    return 0
  fi

  require_command docker
  require_command git
  release_id="$(verify_repository)"
  confirm_release "${release_id}" 'Deploy release'
  release_dir="$(build_release "${release_id}")"
  "${PUBLISH_SCRIPT}" deploy "${release_dir}" "${release_id}"
}

main "$@"
