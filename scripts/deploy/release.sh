#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
APP_DIR="${APP_DIR:-$(cd -- "${SCRIPT_DIR}/../.." && pwd -P)}"
PUBLISH_SCRIPT="${SCRIPT_DIR}/publish-s3.sh"
WORK_DIR=""

fail() {
  echo "Frontend release failed: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "${WORK_DIR}" && -d "${WORK_DIR}" ]]; then
    case "${WORK_DIR}" in
      "${TMPDIR:-/tmp}"/studyfactory-frontend-release.*)
        rm -rf -- "${WORK_DIR}"
        ;;
      *)
        echo "Refusing to remove unexpected temporary path: ${WORK_DIR}" >&2
        ;;
    esac
  fi

  if [[ -n "${DEPLOY_LOCK_DIR:-}" ]]; then
    rmdir "${DEPLOY_LOCK_DIR}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

require_value() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "${name} is required in .env.deploy."
}

validate_release_id() {
  local release_id="$1"
  if [[ ! "${release_id}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{6,79}$ ]] ||
    [[ "${release_id}" == *".."* ]]; then
    fail "invalid release id: ${release_id}"
  fi
}

confirm_release() {
  local expected="$1"
  local action="$2"

  if [[ "${DEPLOY_CONFIRM:-}" == "${expected}" ]]; then
    return
  fi

  if [[ ! -t 0 ]]; then
    fail "non-interactive ${action} requires DEPLOY_CONFIRM=${expected}."
  fi

  local answer
  echo
  read -r -p "Type ${expected} to confirm ${action}: " answer
  [[ "${answer}" == "${expected}" ]] || fail "confirmation did not match."
}

validate_configuration() {
  require_value AWS_REGION
  require_value EXPECTED_AWS_ACCOUNT_ID
  require_value S3_BUCKET_NAME
  require_value CLOUDFRONT_DISTRIBUTION_ID
  require_value PUBLIC_URL

  [[ "${OLD_FRONTEND_PUBLISHER_DISABLED:-}" == "true" ]] ||
    fail "OLD_FRONTEND_PUBLISHER_DISABLED must be true before this deployer may publish."

  [[ "${EXPECTED_AWS_ACCOUNT_ID}" =~ ^[0-9]{12}$ ]] ||
    fail "EXPECTED_AWS_ACCOUNT_ID must be the intended 12-digit AWS account id."
  [[ "${S3_BUCKET_NAME}" != *replace-with* ]] ||
    fail "S3_BUCKET_NAME still contains a placeholder."
  [[ "${CLOUDFRONT_DISTRIBUTION_ID}" != *replace-with* ]] ||
    fail "CLOUDFRONT_DISTRIBUTION_ID still contains a placeholder."
  [[ "${PUBLIC_URL}" != *replace-with* ]] || fail "PUBLIC_URL still contains a placeholder."

  [[ "${S3_BUCKET_NAME}" != s3://* ]] ||
    fail "S3_BUCKET_NAME must be a bucket name, not an s3:// URL."
  [[ "${S3_BUCKET_NAME}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
    fail "S3_BUCKET_NAME does not look valid."
  [[ "${CLOUDFRONT_DISTRIBUTION_ID}" =~ ^[A-Z0-9]{8,32}$ ]] ||
    fail "CLOUDFRONT_DISTRIBUTION_ID does not look valid."
  PUBLIC_URL="${PUBLIC_URL%/}"
  [[ "${PUBLIC_URL}" =~ ^https://[A-Za-z0-9.-]+$ ]] ||
    fail "PUBLIC_URL must be an HTTPS origin without a path, query, or fragment."
  export PUBLIC_URL
}

aws_preflight() {
  local identity distribution enabled status default_origin_id origin_domain
  local bucket_region public_host distribution_domain alias_matches
  local api_origin_id api_origin_domain default_root_object origin_path

  identity="$(aws sts get-caller-identity --output json)" ||
    fail "AWS identity could not be resolved."
  [[ "$(jq -r '.Account' <<<"${identity}")" == "${EXPECTED_AWS_ACCOUNT_ID}" ]] ||
    fail "AWS caller belongs to the wrong account."
  aws s3api head-bucket \
    --bucket "${S3_BUCKET_NAME}" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    >/dev/null ||
    fail "the production bucket is unavailable."
  bucket_region="$(
    aws s3api get-bucket-location \
      --bucket "${S3_BUCKET_NAME}" \
      --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
      --query 'LocationConstraint' \
      --output text
  )" || fail "the production bucket region could not be read."
  [[ "${bucket_region}" != "None" ]] || bucket_region="us-east-1"
  [[ "${bucket_region}" == "${AWS_REGION}" ]] ||
    fail "bucket region ${bucket_region} does not match AWS_REGION=${AWS_REGION}."

  distribution="$(
    aws cloudfront get-distribution \
      --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
      --output json
  )" || fail "the CloudFront distribution is unavailable."

  enabled="$(jq -r '.Distribution.DistributionConfig.Enabled' <<<"${distribution}")"
  status="$(jq -r '.Distribution.Status' <<<"${distribution}")"
  default_origin_id="$(
    jq -r '.Distribution.DistributionConfig.DefaultCacheBehavior.TargetOriginId' \
      <<<"${distribution}"
  )"
  origin_domain="$(
    jq -r --arg id "${default_origin_id}" \
      '.Distribution.DistributionConfig.Origins.Items[] | select(.Id == $id) | .DomainName' \
      <<<"${distribution}"
  )"
  origin_path="$(
    jq -r --arg id "${default_origin_id}" \
      '.Distribution.DistributionConfig.Origins.Items[] |
       select(.Id == $id) | (.OriginPath // "")' \
      <<<"${distribution}"
  )"
  api_origin_id="$(
    jq -r \
      '[.Distribution.DistributionConfig.CacheBehaviors.Items[]? |
        select(.PathPattern == "/api/*" or .PathPattern == "api/*") |
        .TargetOriginId][0] // empty' \
      <<<"${distribution}"
  )"
  api_origin_domain="$(
    jq -r --arg id "${api_origin_id}" \
      '.Distribution.DistributionConfig.Origins.Items[]? |
       select(.Id == $id) | .DomainName' \
      <<<"${distribution}"
  )"
  distribution_domain="$(jq -r '.Distribution.DomainName' <<<"${distribution}")"
  default_root_object="$(
    jq -r '.Distribution.DistributionConfig.DefaultRootObject // empty' \
      <<<"${distribution}"
  )"
  public_host="${PUBLIC_URL#https://}"
  alias_matches="$(
    jq -r --arg host "${public_host}" \
      '((.Distribution.DistributionConfig.Aliases.Items // []) | index($host)) != null' \
      <<<"${distribution}"
  )"

  [[ "${enabled}" == "true" ]] || fail "the CloudFront distribution is disabled."
  [[ "${status}" == "Deployed" ]] ||
    fail "the CloudFront distribution is currently ${status}, not Deployed."
  [[ "${default_root_object}" == "index.html" ]] ||
    fail "CloudFront DefaultRootObject must be index.html, not ${default_root_object:-empty}."
  case "${origin_domain}" in
    "${S3_BUCKET_NAME}.s3.amazonaws.com" | \
      "${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com" | \
      "${S3_BUCKET_NAME}.s3-${AWS_REGION}.amazonaws.com" | \
      "${S3_BUCKET_NAME}.s3.dualstack.${AWS_REGION}.amazonaws.com" | \
      "${S3_BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com" | \
      "${S3_BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com")
      ;;
    *)
      fail "CloudFront's default origin (${origin_domain}) is not the exact ${S3_BUCKET_NAME} S3 origin."
      ;;
  esac
  [[ -z "${origin_path}" ]] ||
    fail "CloudFront's frontend origin path must be empty, not ${origin_path}."
  [[ -n "${api_origin_id}" && -n "${api_origin_domain}" ]] ||
    fail "CloudFront has no /api/* behavior with a valid origin."
  [[ "${api_origin_id}" != "${default_origin_id}" ]] ||
    fail "CloudFront's /api/* behavior points to the frontend origin."
  [[ "${public_host}" == "${distribution_domain}" || "${alias_matches}" == "true" ]] ||
    fail "PUBLIC_URL host ${public_host} is not this CloudFront distribution or one of its aliases."

  echo "Production target"
  echo "  AWS account: $(jq -r '.Account' <<<"${identity}")"
  echo "  AWS caller:  $(jq -r '.Arn' <<<"${identity}")"
  echo "  S3 bucket:   ${S3_BUCKET_NAME}"
  echo "  AWS region:  ${bucket_region}"
  echo "  CloudFront:  ${CLOUDFRONT_DISTRIBUTION_ID} (${status})"
  echo "  Origin:      ${origin_domain}"
  echo "  API origin:  ${api_origin_domain}"
  echo "  Public URL:  ${PUBLIC_URL}"
}

validate_local_reference() {
  local dist_dir="$1"
  local reference="$2"

  reference="${reference%%\?*}"
  reference="${reference%%#*}"

  case "${reference}" in
    '' | http://* | https://* | data:* | //* | \#*)
      return
      ;;
  esac

  reference="${reference#/}"
  [[ "${reference}" != *".."* ]] ||
    fail "build output contains an unsafe local reference: ${reference}"
  [[ -f "${dist_dir}/${reference}" ]] ||
    fail "build output references a missing file: ${reference}"
}

validate_new_build() {
  local dist_dir="$1"
  local match reference
  local release_root="${RELEASE_PREFIX:-_releases}"
  local deployment_root="${DEPLOYMENT_PREFIX:-_deploy}"

  release_root="${release_root%%/*}"
  deployment_root="${deployment_root%%/*}"

  [[ -d "${dist_dir}" ]] || fail "build output is missing."
  [[ -z "$(find "${dist_dir}" -type l -print -quit)" ]] ||
    fail "build output contains a symbolic link."
  [[ -f "${dist_dir}/index.html" ]] || fail "dist/index.html is missing."
  [[ -f "${dist_dir}/manifest.webmanifest" ]] ||
    fail "dist/manifest.webmanifest is missing."
  [[ -f "${dist_dir}/registerSW.js" ]] || fail "dist/registerSW.js is missing."
  [[ -f "${dist_dir}/sw.js" ]] || fail "dist/sw.js is missing."
  [[ ! -e "${dist_dir}/${release_root}" ]] ||
    fail "build output contains the reserved ${release_root} deployment path."
  [[ ! -e "${dist_dir}/${deployment_root}" ]] ||
    fail "build output contains the reserved ${deployment_root} deployment path."
  [[ -z "$(find "${dist_dir}" -type f -name '.env*' -print -quit)" ]] ||
    fail "build output contains an environment file."
  compgen -G "${dist_dir}/workbox-*.js" >/dev/null ||
    fail "dist/workbox-*.js is missing."
  compgen -G "${dist_dir}/assets/*.js" >/dev/null ||
    fail "the JavaScript application bundle is missing."
  compgen -G "${dist_dir}/assets/*.css" >/dev/null ||
    fail "the application stylesheet is missing."

  jq -e . "${dist_dir}/manifest.webmanifest" >/dev/null ||
    fail "dist/manifest.webmanifest is not valid JSON."

  while IFS= read -r match; do
    reference="${match#*=\"}"
    reference="${reference%\"}"
    validate_local_reference "${dist_dir}" "${reference}"
  done < <(grep -oE '(src|href)="[^"]+"' "${dist_dir}/index.html")

  while IFS= read -r match; do
    reference="${match#url:\"}"
    reference="${reference%\"}"
    validate_local_reference "${dist_dir}" "${reference}"
  done < <(grep -oE 'url:"[^"]+"' "${dist_dir}/sw.js")

  while IFS= read -r reference; do
    validate_local_reference "${dist_dir}" "${reference}"
  done < <(jq -r '.icons[]?.src // empty' "${dist_dir}/manifest.webmanifest")

  if grep -R -E -n \
    'https?://(localhost|127\.0\.0\.1)(:[0-9]+)?' \
    "${dist_dir}/index.html" "${dist_dir}/assets"; then
    fail "the production build contains a localhost URL."
  fi
}

build_release() {
  local release_sha="$1"
  local source_dir="$2"
  local dist_dir="$3"
  local host_uid host_gid

  mkdir -p "${source_dir}" "${dist_dir}"
  git archive "${release_sha}" | tar -x -C "${source_dir}"

  host_uid="$(id -u)"
  host_gid="$(id -g)"

  docker run --rm \
    --env "HOST_UID=${host_uid}" \
    --env "HOST_GID=${host_gid}" \
    --volume "${source_dir}:/source:ro" \
    --volume "${dist_dir}:/output" \
    --workdir /app \
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
    '

  cat >"${dist_dir}/version.json" <<EOF
{"commit":"${release_sha}","branch":"${DEPLOY_BRANCH}"}
EOF

  validate_new_build "${dist_dir}"
}

deploy_current_master() {
  require_command docker
  require_command git
  require_command tar

  cd "${APP_DIR}"

  local release_sha short_sha source_dir dist_dir
  release_sha="$(git rev-parse HEAD)"
  short_sha="${release_sha:0:12}"

  [[ "$(git rev-parse --abbrev-ref HEAD)" == "${DEPLOY_BRANCH}" ]] ||
    fail "checkout is not on ${DEPLOY_BRANCH}."
  [[ "${release_sha}" == "$(git rev-parse "origin/${DEPLOY_BRANCH}")" ]] ||
    fail "local ${DEPLOY_BRANCH} is not the exact origin/${DEPLOY_BRANCH} commit."

  echo "Release source"
  echo "  Repository: $(git config --get remote.origin.url)"
  echo "  Branch:     ${DEPLOY_BRANCH}"
  echo "  Commit:     ${release_sha}"

  confirm_release "${short_sha}" "production deployment"

  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/studyfactory-frontend-release.XXXXXX")"
  source_dir="${WORK_DIR}/source"
  dist_dir="${WORK_DIR}/dist"

  echo "Building and verifying ${short_sha} in ${BUILD_IMAGE}..."
  build_release "${release_sha}" "${source_dir}" "${dist_dir}"

  "${PUBLISH_SCRIPT}" deploy "${dist_dir}" "${release_sha}"
}

rollback_release() {
  local release_id="$1"
  local dist_dir
  local release_prefix="${RELEASE_PREFIX:-_releases}"

  validate_release_id "${release_id}"
  confirm_release "${release_id}" "production rollback"

  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/studyfactory-frontend-release.XXXXXX")"
  dist_dir="${WORK_DIR}/dist"
  mkdir -p "${dist_dir}"

  aws s3api head-object \
    --bucket "${S3_BUCKET_NAME}" \
    --key "${release_prefix}/${release_id}/_complete.json" \
    --expected-bucket-owner "${EXPECTED_AWS_ACCOUNT_ID}" \
    >/dev/null || fail "release ${release_id} is missing its completion marker."

  aws s3 sync \
    "s3://${S3_BUCKET_NAME}/${release_prefix}/${release_id}/" \
    "${dist_dir}/" \
    --exclude '_complete.json' \
    --only-show-errors

  [[ -f "${dist_dir}/index.html" ]] || fail "rollback release has no index.html."
  [[ -f "${dist_dir}/sw.js" ]] || fail "rollback release has no sw.js."
  [[ -z "$(find "${dist_dir}" -type l -print -quit)" ]] ||
    fail "rollback release contains a symbolic link."

  "${PUBLISH_SCRIPT}" rollback "${dist_dir}" "${release_id}"
}

require_command aws
require_command curl
require_command jq
require_command find
require_command cmp
require_command grep
require_command tr

[[ -n "${DEPLOY_LOCK_DIR:-}" && -d "${DEPLOY_LOCK_DIR}" ]] ||
  fail "run the release through ./deploy.sh so the deployment lock is held."
[[ -x "${PUBLISH_SCRIPT}" ]] || fail "${PUBLISH_SCRIPT} is missing or not executable."
validate_configuration
aws_preflight

case "${1:-}" in
  '')
    deploy_current_master
    ;;
  --rollback)
    [[ $# -eq 2 ]] || fail "usage: ./deploy.sh --rollback <release-id>"
    rollback_release "$2"
    ;;
  *)
    fail "unknown argument: $1"
    ;;
esac
