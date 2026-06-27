#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  run-md-tip.sh --input <markdown file or directory> --output <docx path>

Environment:
  DEEPSEEK_API_KEY   required
  DEEPSEEK_BASE_URL  optional, defaults to https://api.deepseek.com
  DEEPSEEK_MODEL     optional, defaults to deepseek-chat
USAGE
}

input=""
output=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      input="${2:-}"
      shift 2
      ;;
    --output)
      output="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$input" ]]; then
  echo "Missing --input" >&2
  usage >&2
  exit 2
fi

if [[ -z "$output" ]]; then
  output="./outputs/knowledge-tips.docx"
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
  echo "Missing DEEPSEEK_API_KEY environment variable." >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
cli_source="$skill_dir/assets/md-cli"

if [[ ! -d "$cli_source/src" ]]; then
  echo "Bundled md-cli source not found: $cli_source" >&2
  exit 1
fi

input_abs="$(cd "$(dirname "$input")" && pwd)/$(basename "$input")"
output_dir="$(dirname "$output")"
mkdir -p "$output_dir"
output_abs="$(cd "$output_dir" && pwd)/$(basename "$output")"

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/md-tip-generator.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT

cp -R "$cli_source/." "$work_dir/"

cd "$work_dir"

echo "Installing bundled md-cli dependencies..."
npm install

echo "Verifying bundled md-cli..."
npm test
npm run build

echo "Generating knowledge Tips..."
npm run start -- --input "$input_abs" --output "$output_abs"

if [[ ! -s "$output_abs" ]]; then
  echo "Expected output was not created: $output_abs" >&2
  exit 1
fi

echo "Output: $output_abs"
