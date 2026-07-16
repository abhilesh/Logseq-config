#!/usr/bin/env zsh
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
repo_dir="$(cd -- "$script_dir/.." && pwd)"
custom_css="${1:-$repo_dir/custom.css}"

base_url="https://raw.githubusercontent.com/stdword/logseq-bujo-theme/main/src/base.css"
dark_url="https://raw.githubusercontent.com/stdword/logseq-bujo-theme/main/src/dark-coffee.css"

if [[ ! -f "$custom_css" ]]; then
  printf 'custom.css not found: %s\n' "$custom_css" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

backup="${custom_css}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$custom_css" "$backup"
printf 'Backed up current custom.css to %s\n' "$backup"

printf 'Downloading BuJo base.css...\n'
curl -L --fail --silent --show-error "$base_url" -o "$tmp_dir/bujo-base.css"

printf 'Downloading BuJo dark-coffee.css...\n'
curl -L --fail --silent --show-error "$dark_url" -o "$tmp_dir/bujo-dark-coffee.css"

# dark-coffee.css imports base.css itself. We are placing base.css first, so
# remove the nested import to avoid loading the same theme layer twice.
awk '
  $0 == "@import '\''./base.css'\'';" { next }
  $0 == "@import \"./base.css\";" { next }
  { print }
' "$tmp_dir/bujo-dark-coffee.css" > "$tmp_dir/bujo-dark-coffee-no-import.css"

# Remove only the two remote BuJo imports from the existing local overrides.
# Other imports, such as the Google Fonts import inside base.css, are preserved
# by default because removing them changes the typography.
awk '
  /^@import url\(["'\''"]https:\/\/raw\.githack\.com\/stdword\/logseq-bujo-theme\/main\/src\/(base|dark-coffee)\.css["'\''"]\);$/ { next }
  /^@import url\(["'\''"]https:\/\/raw\.githubusercontent\.com\/stdword\/logseq-bujo-theme\/main\/src\/(base|dark-coffee)\.css["'\''"]\);$/ { next }
  { print }
' "$backup" > "$tmp_dir/custom-overrides.css"

base_css="$tmp_dir/bujo-base.css"
if [[ "${REMOVE_GOOGLE_FONT_IMPORT:-0}" == "1" ]]; then
  printf 'Removing Google Fonts @import from bundled base.css...\n'
  awk '
    /^@import url\(["'\''"]https:\/\/fonts\.googleapis\.com\// { next }
    { print }
  ' "$tmp_dir/bujo-base.css" > "$tmp_dir/bujo-base-no-font-import.css"
  base_css="$tmp_dir/bujo-base-no-font-import.css"
fi

{
  printf '/* Bundled from stdword/logseq-bujo-theme src/base.css */\n'
  cat "$base_css"
  printf '\n\n/* Bundled from stdword/logseq-bujo-theme src/dark-coffee.css */\n'
  cat "$tmp_dir/bujo-dark-coffee-no-import.css"
  printf '\n\n/* Local custom overrides */\n'
  cat "$tmp_dir/custom-overrides.css"
} > "$custom_css"

printf 'Rebuilt %s\n' "$custom_css"
printf '\nRemaining @import lines:\n'
if command -v rg >/dev/null 2>&1; then
  rg -n '^@import' "$custom_css" || true
else
  grep -n '^@import' "$custom_css" || true
fi

printf '\nRun this to check the result:\n'
printf '  git diff --check\n'
printf '  git diff --stat\n'
