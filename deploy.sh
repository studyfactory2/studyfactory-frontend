#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
APP_DIR="${APP_DIR:-${SCRIPT_DIR}}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-${APP_DIR}/.env.deploy}"

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh
  ./deploy.sh --rollback <release-id>
  ./deploy.sh --help

The normal deployment fast-forwards the production checkout to origin/master,
builds that exact commit in Docker, and publishes it to S3 + CloudFront.
Rollback republishes an archived S3 release without Git or Docker.
EOF
}

fail() {
  echo "Deploy bootstrap failed: $*" >&2
  exit 1
}

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "${DEPLOY_ENV_FILE}" ]]; then
  fail "${DEPLOY_ENV_FILE} is missing. Copy .env.deploy.example and configure it first."
fi

set -a
# shellcheck disable=SC1090 -- the server operator owns this non-repository file.
source "${DEPLOY_ENV_FILE}"
set +a

DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
BUILD_IMAGE="${BUILD_IMAGE:-node:22-bookworm-slim}"
EXPECTED_GITHUB_REPOSITORY="${EXPECTED_GITHUB_REPOSITORY:-studyfactory2/studyfactory-frontend}"
export APP_DIR BUILD_IMAGE DEPLOY_BRANCH DEPLOY_ENV_FILE EXPECTED_GITHUB_REPOSITORY

if [[ "${DEPLOY_ENVIRONMENT:-}" != "production" ]]; then
  fail "DEPLOY_ENVIRONMENT must be exactly 'production'."
fi

if [[ "${DEPLOY_BRANCH}" != "master" ]]; then
  fail "production releases are locked to master; develop is the working branch."
fi

if [[ ! "${BUILD_IMAGE}" =~ ^[A-Za-z0-9][A-Za-z0-9._/:@-]*$ ]]; then
  fail "BUILD_IMAGE contains unsafe characters."
fi

if [[ ! "${EXPECTED_GITHUB_REPOSITORY}" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  fail "EXPECTED_GITHUB_REPOSITORY is invalid."
fi

if [[ ! "${DEPLOY_BRANCH}" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] ||
  [[ "${DEPLOY_BRANCH}" == *".."* ]]; then
  fail "DEPLOY_BRANCH contains unsafe characters: ${DEPLOY_BRANCH}"
fi

lock_root="${TMPDIR:-/tmp}"
DEPLOY_LOCK_DIR="${lock_root%/}/studyfactory-frontend-deploy.lock"
if ! mkdir "${DEPLOY_LOCK_DIR}" 2>/dev/null; then
  fail "another frontend deployment appears to be running (${DEPLOY_LOCK_DIR})."
fi
export DEPLOY_LOCK_DIR

cleanup_bootstrap() {
  rmdir "${DEPLOY_LOCK_DIR}" 2>/dev/null || true
}
trap cleanup_bootstrap EXIT INT TERM

cd "${APP_DIR}"

if [[ "${1:-}" != "--rollback" ]]; then
  command -v git >/dev/null 2>&1 || fail "git is required."
  [[ -d "${APP_DIR}/.git" ]] || fail "${APP_DIR} is not a Git checkout."

  origin_url="$(git remote get-url origin)" || fail "the Git origin remote is missing."
  case "${origin_url}" in
    "https://github.com/${EXPECTED_GITHUB_REPOSITORY}" | \
      "https://github.com/${EXPECTED_GITHUB_REPOSITORY}.git" | \
      "git@github.com:${EXPECTED_GITHUB_REPOSITORY}.git" | \
      "ssh://git@github.com/${EXPECTED_GITHUB_REPOSITORY}.git")
      ;;
    *)
      fail "origin is ${origin_url}; expected GitHub repository ${EXPECTED_GITHUB_REPOSITORY}."
      ;;
  esac

  if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
    fail "the production checkout is dirty; inspect it instead of overwriting files."
  fi

  git fetch --prune origin "${DEPLOY_BRANCH}"

  if git show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git checkout "${DEPLOY_BRANCH}"
  else
    git checkout --track -b "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
  fi

  git merge --ff-only "origin/${DEPLOY_BRANCH}"

  if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
    fail "the checkout became dirty after updating ${DEPLOY_BRANCH}."
  fi
fi

release_script="${APP_DIR}/scripts/deploy/release.sh"
[[ -x "${release_script}" ]] || fail "${release_script} is missing or not executable."

exec "${release_script}" "$@"
