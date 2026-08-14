#!/usr/bin/env bash
set -euo pipefail

# Split the transition repository into two dedicated repositories:
#   1. Project-GAS       <- project-gas-ux-source-of-truth
#   2. gascoin-legacy    <- main
#
# This preserves the legacy application intact instead of deleting it from
# history or carrying obsolete routes/code inside the new Project GAS repo.
#
# The script deliberately requires explicit visibility for BOTH repos.

OWNER="${GITHUB_OWNER:-ChicoPanama}"
PROJECT_REPO="${PROJECT_REPO:-Project-GAS}"
LEGACY_REPO="${LEGACY_REPO:-gascoin-legacy}"
PROJECT_BRANCH="${PROJECT_BRANCH:-project-gas-ux-source-of-truth}"
LEGACY_BRANCH="${LEGACY_BRANCH:-legacy-gascoin-preservation}"
PROJECT_VISIBILITY="${1:-}"
LEGACY_VISIBILITY="${2:-}"

usage() {
  cat <<EOF
Usage:
  bash scripts/split-project-gas-and-legacy.sh <project-public|project-private> <legacy-public|legacy-private>

Example:
  bash scripts/split-project-gas-and-legacy.sh private private

Environment overrides:
  GITHUB_OWNER    default: ChicoPanama
  PROJECT_REPO    default: Project-GAS
  LEGACY_REPO     default: gascoin-legacy
  PROJECT_BRANCH  default: project-gas-ux-source-of-truth
  LEGACY_BRANCH   default: legacy-gascoin-preservation
EOF
}

for value in "$PROJECT_VISIBILITY" "$LEGACY_VISIBILITY"; do
  if [[ "$value" != "public" && "$value" != "private" ]]; then
    echo "ERROR: both repository visibility values must be explicitly 'public' or 'private'." >&2
    usage
    exit 2
  fi
done

for cmd in gh git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' is not installed." >&2
    exit 1
  fi
done

gh auth status
git rev-parse --is-inside-work-tree >/dev/null

git show-ref --verify --quiet "refs/heads/$PROJECT_BRANCH" || {
  echo "ERROR: local Project GAS branch '$PROJECT_BRANCH' not found." >&2
  exit 1
}

git show-ref --verify --quiet "refs/heads/$LEGACY_BRANCH" || {
  echo "ERROR: local legacy preservation branch '$LEGACY_BRANCH' not found." >&2
  exit 1
}

for repo in "$PROJECT_REPO" "$LEGACY_REPO"; do
  if gh repo view "$OWNER/$repo" >/dev/null 2>&1; then
    echo "ERROR: $OWNER/$repo already exists. Refusing to overwrite it." >&2
    exit 1
  fi
done

echo "Creating $OWNER/$PROJECT_REPO ($PROJECT_VISIBILITY)"
gh repo create "$OWNER/$PROJECT_REPO" \
  "--$PROJECT_VISIBILITY" \
  --description "Project GAS — reserve-backed elastic monetary protocol, game and social network" \
  --disable-wiki

echo "Creating $OWNER/$LEGACY_REPO ($LEGACY_VISIBILITY)"
gh repo create "$OWNER/$LEGACY_REPO" \
  "--$LEGACY_VISIBILITY" \
  --description "Legacy GASCOIN application preserved from gascoin-eth before the Project GAS migration" \
  --disable-wiki

PROJECT_REMOTE="project-gas"
LEGACY_REMOTE="gascoin-legacy"

for remote in "$PROJECT_REMOTE" "$LEGACY_REMOTE"; do
  if git remote get-url "$remote" >/dev/null 2>&1; then
    echo "ERROR: git remote '$remote' already exists. Refusing to rewrite it." >&2
    exit 1
  fi
done

git remote add "$PROJECT_REMOTE" "https://github.com/$OWNER/$PROJECT_REPO.git"
git remote add "$LEGACY_REMOTE" "https://github.com/$OWNER/$LEGACY_REPO.git"

# Push each preserved line of development as main in its destination.
git push -u "$PROJECT_REMOTE" "$PROJECT_BRANCH:main"
git push -u "$LEGACY_REMOTE" "$LEGACY_BRANCH:main"

gh repo edit "$OWNER/$PROJECT_REPO" --default-branch main
gh repo edit "$OWNER/$LEGACY_REPO" --default-branch main

cat <<EOF
Repository split completed.

Project GAS:
  https://github.com/$OWNER/$PROJECT_REPO
  source: $PROJECT_BRANCH -> main

Legacy GASCOIN:
  https://github.com/$OWNER/$LEGACY_REPO
  source: $LEGACY_BRANCH -> main

Recommended verification before archiving gascoin-eth:
  1. verify commit SHAs and README in both destination repos
  2. run Project GAS unit/build/E2E CI in $PROJECT_REPO
  3. verify the legacy repository builds from a clean clone
  4. migrate only the secrets/integrations each destination actually needs
  5. update any Vercel projects/remotes so old and new deployments point to the correct repo
  6. archive gascoin-eth only after both destinations are independently recoverable
EOF
