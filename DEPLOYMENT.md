# Production deployment

This guide keeps the current frontend online while the new frontend is tested
with the real production backend and PostgreSQL data.

```text
Current URL -> current CloudFront/S3 frontend --+
                                                 +-> EC2 backend -> PostgreSQL
Pilot URL   -> separate v2 CloudFront/S3 -------+
```

The browser never connects directly to PostgreSQL. Both frontends call their
own `/api/*` URL, and CloudFront forwards those requests to the same EC2
backend. Every action performed through the pilot frontend therefore changes
real production data.

## Safety rules

- Do not reuse the current frontend's S3 bucket for v2.
- Do not delete, overwrite, disable, or redirect the current frontend during
  the pilot.
- Do not put database, JWT, QR, or AWS secret keys in the frontend repository
  or `.env.production`.
- Use dedicated MEMBER, STAFF, and ADMIN pilot accounts for write tests.
- Promote only clean, reviewed commits: backend `develop -> deploy` and
  frontend `develop -> master`.

## 1. Prepare the backend repository settings

In the backend repository, open **Settings -> Secrets and variables ->
Actions**. The production workflow requires these repository secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
CLOUDFRONT_DISTRIBUTION_ID
EC2_HOST
EC2_SSH_KEY
EC2_USER
DB_NAME
DB_USERNAME
DB_PASSWORD
JWT_SECRET
CORS_ALLOWED_ORIGINS
STUDY_PRESENCE_QR_SECRET
```

`CLOUDFRONT_DISTRIBUTION_ID` continues to identify the current production
distribution during the pilot. The v2 distribution is configured separately.

Set `CORS_ALLOWED_ORIGINS` to both exact HTTPS origins, comma-separated:

```text
https://<current-frontend-origin>,https://<v2-pilot-origin>
```

If the v2 URL does not exist yet, complete section 2 first, then return here
and set CORS before pushing the backend `deploy` branch.

The QR secret must remain stable. If it ever needs to be created, generate it
locally and save the output as `STUDY_PRESENCE_QR_SECRET`:

```bash
openssl rand -base64 32
```

Also create this repository **variable** (not a secret):

```text
STUDY_PRESENCE_AUTO_CLOSE_ENABLED=true
```

## 2. Prepare the separate v2 AWS destination once

1. Create a new private S3 bucket for v2. Keep Block Public Access enabled.
2. Create a new CloudFront distribution whose default origin is that bucket,
   using Origin Access Control.
3. Add the read-only OAC bucket policy shown below.
4. Set the default root object to `index.html`.
5. On the default frontend behavior only, attach a CloudFront viewer-request
   function that rewrites routes without a file extension to `/index.html`.
   Do not use distribution-wide `403`/`404` error rewriting because that can
   hide real API errors. Do not attach the function to `/api/*`.
6. Add `/api/*` as a non-cached behavior pointing to the existing EC2 backend
   on port `8080`. Forward all viewer values except the original `Host` header
   and allow all HTTP methods.
7. Wait until the distribution status is `Deployed`.

After CloudFront has assigned the new distribution ID, create a local file
named `v2-bucket-policy.json` with this policy. Replace all three
`REPLACE_WITH_...` values first; none of them is a secret:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowV2CloudFrontReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::REPLACE_WITH_V2_BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::REPLACE_WITH_12_DIGIT_ACCOUNT_ID:distribution/REPLACE_WITH_V2_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

Apply it only to the new v2 bucket:

```bash
aws s3api put-bucket-policy \
  --bucket "REPLACE_WITH_V2_BUCKET_NAME" \
  --expected-bucket-owner "REPLACE_WITH_12_DIGIT_ACCOUNT_ID" \
  --policy file://v2-bucket-policy.json
```

If the v2 bucket already has policy statements, merge this statement into the
existing policy instead of replacing it. This grant lets only the named
CloudFront distribution read v2 objects; it does not make the bucket public.

Use this code for the default behavior's viewer-request function:

```javascript
function handler(event) {
  var request = event.request;
  var lastSegment = request.uri.split('/').pop();

  if (request.uri.endsWith('/') || lastSegment.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
```

The existing backend helper can configure step 6. Run it from a trusted shell
with AWS access and the backend repository checked out. Use the **new v2
distribution ID**, never the current frontend distribution ID:

```bash
cd <path-to-studyfactory-backend-repository>

AWS_REGION=<aws-region> \
CLOUDFRONT_DISTRIBUTION_ID=<v2-distribution-id> \
EC2_HOST=<existing-ec2-host> \
./.github/scripts/configure-cloudfront-api-origin.sh
```

The initial pilot origin may be the generated CloudFront URL. Record these v2
values for the EC2 frontend configuration:

```text
AWS account ID
AWS region
v2 S3 bucket name
v2 CloudFront distribution ID
v2 HTTPS URL
```

## 3. Deploy the backend

First publish the candidate to `develop`:

```bash
cd /Users/john/Desktop/studyfactory
git checkout develop
git status --short
git push origin develop
```

`git status --short` must print nothing. Stop and inspect any output before
continuing.

In GitHub Actions, wait for the **CI** workflow for that exact `develop` commit
to pass. Then promote the exact commit to `deploy`:

```bash
git fetch origin
git checkout deploy
git pull --ff-only origin deploy
git merge --ff-only origin/develop
git push origin deploy
```

The push to `deploy` starts the production workflow. It tests and builds the
backend, creates a PostgreSQL backup, applies migrations, replaces the backend,
and performs a health check. A failed backend health check attempts to restore
the previous backend image. It does not publish or remove either frontend.

Do not deploy v2 until the **Deploy** workflow is green. Then verify through
the current production frontend:

- MEMBER, STAFF, and ADMIN can sign in.
- The branch list and current member data load.
- Attendance and the current staff/admin workspaces still load.
- The current frontend URL still serves the old frontend.

Return the local backend checkout to the working branch:

```bash
git checkout develop
```

## 4. Promote the new frontend to `master`

Run the frontend checks on `develop`:

```bash
cd /Users/john/Desktop/studyfactory-frontend
git checkout develop
git status --short
corepack enable
yarn install --frozen-lockfile
yarn format:check
yarn lint
yarn build
git push origin develop
```

`git status --short` must print nothing. Stop and inspect any output before
continuing.

Promote only that tested commit:

```bash
git fetch origin
git checkout master
git pull --ff-only origin master
git merge --ff-only origin/develop
git push origin master
git checkout develop
```

Pushing frontend `master` does not publish the website. EC2 publication is a
separate, intentional step.

## 5. Prepare the frontend checkout on EC2 once

The EC2 host needs `git`, Docker, AWS CLI, `curl`, `jq`, `flock`, `find`,
`grep`, and `tar`. Prefer an EC2 IAM role scoped to the v2 bucket and
distribution instead of saved AWS access keys. That role needs list, read, and
put-object access only to the v2 bucket (not delete), invalidation/read access
to the v2 distribution, read access to the current distribution for the
production API comparison, and permission to list CloudFront's managed policies. Confirm the
active AWS identity before continuing:

```bash
aws sts get-caller-identity
docker version
```

Clone the production repository if it is not already present:

```bash
cd /home/<EC2_USER>
git clone https://github.com/studyfactory2/studyfactory-frontend.git
cd studyfactory-frontend
git checkout master
```

If the repository is private, install a read-only GitHub deploy key on EC2 and
clone with `git@github.com:studyfactory2/studyfactory-frontend.git` instead.

Create the ignored, server-only configuration:

```bash
umask 077
nano .env.production
chmod 600 .env.production
```

Use the v2 destination values only:

```dotenv
DEPLOY_ENVIRONMENT=production
DEPLOY_BRANCH=master
BUILD_IMAGE=node:22-bookworm-slim

AWS_REGION=<aws-region>
EXPECTED_AWS_ACCOUNT_ID=<12-digit-aws-account-id>
S3_BUCKET_NAME=<v2-bucket-name>
CLOUDFRONT_DISTRIBUTION_ID=<v2-distribution-id>
PUBLIC_URL=https://<v2-cloudfront-domain-or-pilot-domain>

# Safety guards: these must identify the current frontend, not v2.
LEGACY_S3_BUCKET_NAME=<current-frontend-bucket-name>
LEGACY_CLOUDFRONT_DISTRIBUTION_ID=<current-frontend-distribution-id>
```

Do not add `VITE_API_BASE_URL`: production uses same-origin `/api/*` through
CloudFront. Do not add AWS access keys to this file; the AWS CLI should obtain
credentials from the EC2 IAM role.

## 6. Publish v2

From the EC2 frontend checkout:

```bash
cd /home/<EC2_USER>/studyfactory-frontend
./deploy.sh
```

The script fast-forwards to `origin/master`, confirms the AWS destination,
asks for the first eight characters of the displayed commit SHA, builds and
tests that exact commit in Docker, archives it under
`_releases/<full-commit-sha>/`, publishes it, clears CloudFront, and
smoke-tests the live pilot URL. It refuses to run if the v2 bucket or
distribution matches either legacy safety value, and it verifies that both
distributions route `/api/*` to the same production backend. It therefore
cannot change the current frontend bucket or silently point the pilot at a
different backend.

Keep the terminal open until it reports that the release is live and verified.

## 7. Production pilot smoke test

Verify both URLs after publication:

- The current URL still shows the current frontend and can sign in.
- The v2 URL shows the new frontend.
- Refreshing v2 `/login` directly works.
- V2 `/api/branches` returns JSON through CloudFront.
- MEMBER, STAFF, and ADMIN pilot accounts can sign in.
- Member plans and study time load.
- QR generation, scan, check-in, and check-out work with a pilot member.
- Staff attendance and admin member operations work with pilot data.
- Mobile layout and PWA update behavior work on a target device.

Do not perform experimental write operations on active members: both
frontends use the same production database.

## 8. Roll back only the v2 frontend

Find the full 40-character commit SHA of a previously archived v2 release,
then run:

```bash
cd /home/<EC2_USER>/studyfactory-frontend
aws s3 ls s3://<v2-bucket-name>/_releases/
./deploy.sh --rollback <full-40-character-commit-sha>
```

Enter the full SHA in the command, then type its first eight characters when
prompted. Rollback republishes the archived frontend, invalidates CloudFront,
and smoke-tests it. It does not change the backend, database, or current
frontend.

If a backend deployment fails, inspect the GitHub Actions output before doing
anything else. Do not manually restore PostgreSQL from a backup as part of a
normal frontend rollback.

## 9. Retire the current frontend later

Only after the pilot is approved and stable:

1. Attach the primary production domain to the v2 distribution and complete
   the DNS cutover.
2. Change the backend repository's `CLOUDFRONT_DISTRIBUTION_ID` secret to the
   v2 distribution so future backend releases maintain its `/api/*` behavior.
3. Verify all roles and workflows again on the primary domain.
4. Keep the old bucket and distribution available for an agreed rollback
   window.
5. Remove the old origin from CORS and retire the old AWS resources only after
   explicit approval.
