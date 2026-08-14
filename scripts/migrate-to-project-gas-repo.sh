#!/usr/bin/env bash
set -euo pipefail

# Creates the dedicated Project GAS repository from the isolated staging branch.
# This script intentionally requires an explicit visibility choice so an agent
# cannot accidentally publish a private product spec or hide a public project.

OWNER="${GITHUB_OWNER:-ChicoPanama}"
TARGET_NAME="${1:-Project-GAS}"
VISIBILITY="${2:-}"
SOURCE_BRANCH="${SOURCE_BRANCH:-project-gas-ux-source-of-truth}"
TARGET_REMOTE="${TARGET_REMOTE:-project-gas}"

usage() {
  cat <<EOF
Usage:
  bash scripts/migrate-to-project-gas-repo.sh <repo-name> <public|private>

Example:
  bash scripts/migrate-to-project-gas-repo.sh Project-GAS private

Environment overrides:
  GITHUB_OWNER   default: ChicoPanama
  SOURCE_BRANCH  default: project-gas-ux-source-of-truth
  TARGET_REMOTE  default: project-gas
EOF
}

if [[ "$VISIBILITY" != "public" && "$VISIBILITY" != "private" ]]; then
  echo "ERROR: visibility must be explicitly set to 'public' or 'private'." >&2
  usage
  exit 2
fi

for cmd in gh git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' is not installed." >&2
    exit 1
  fi
done

gh auth status

git rev-parse --is-inside-work-tree >/dev/null

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$SOURCE_BRANCH" ]]; then
  echo "ERROR: current branch is '$CURRENT_BRANCH'; expected '$SOURCE_BRANCH'." >&2
  echo "Switch to the staging branch before creating the dedicated repository." >&2
  exit 1
fi

if gh repo view "$OWNER/$TARGET_NAME" >/dev/null 2>&1; then
  echo "ERROR: $OWNER/$TARGET_NAME already exists. Refusing to overwrite or repoint it." >&2
  exit 1
fi

echo "Creating $VISIBILITY repository: $OWNER/$TARGET_NAME"
gh repo create "$OWNER/$TARGET_NAME" \
  "--$VISIBILITY" \
  --description "Project GAS — reserve-backed elastic monetary protocol, game and social network" \
  --disable-wiki

TARGET_URL="https://github.com/$OWNER/$TARGET_NAME.git"

if git remote get-url "$TARGET_REMOTE" >/dev/null 2>&1; then
  echo "ERROR: remote '$TARGET_REMOTE' already exists. Refusing to rewrite it." >&2
  exit 1
fi

git remote add "$TARGET_REMOTE" "$TARGET_URL"

# Preserve the migration branch history but establish it as main in the new repo.
git push -u "$TARGET_REMOTE" "$SOURCE_BRANCH:main"

gh repo edit "$OWNER/$TARGET_NAME" --default-branch main

cat <<EOF
Dedicated Project GAS repository created successfully:
  https://github.com/$OWNER/$TARGET_NAME

Source preserved:
  $SOURCE_BRANCH -> main

Next steps:
  1. verify README / AGENTS / docs / scripts in the new repository
  2. install Beads locally and run: bd init && bash scripts/seed-beads.sh
  3. configure required branch protections and CI secrets
  4. do not merge the legacy staging PR into gascoin-eth
EOF
