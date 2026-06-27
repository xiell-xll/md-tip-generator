#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  run-md-tip.sh --input <markdown file or directory> --output <docx path>

Modes:
  Default (requires DeepSeek API key):
    DEEPSEEK_API_KEY=sk-xxx run-md-tip.sh --input ./markdowns --output ./tips.docx

  JSON import (no API key needed):
    run-md-tip.sh --input ./markdowns --tips-json ./tips.json --output ./tips.docx

  Directory import (one JSON per markdown):
    run-md-tip.sh --input ./markdowns --tips-dir ./tips/ --output ./tips.docx

Environment (default mode only):
  DEEPSEEK_API_KEY   required for default mode
  DEEPSEEK_BASE_URL  optional, defaults to https://api.deepseek.com
  DEEPSEEK_MODEL     optional, defaults to deepseek-chat
USAGE
}

input=""
output=""
tips_json=""
tips_dir=""

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
    --tips-json)
      tips_json="${2:-}"
      shift 2
      ;;
    --tips-dir)
      tips_dir="${2:-}"
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

# Only require DEEPSEEK_API_KEY when not using JSON import modes
if [[ -z "$tips_json" && -z "$tips_dir" ]]; then
  if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
    echo "Missing DEEPSEEK_API_KEY environment variable." >&2
    echo "Use --tips-json or --tips-dir mode to skip API key requirement." >&2
    exit 2
  fi
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

# Build CLI arguments
cli_args=("--input" "$input_abs" "--output" "$output_abs")

if [[ -n "$tips_json" ]]; then
  tips_json_abs="$(cd "$(dirname "$tips_json")" && pwd)/$(basename "$tips_json")"
  cli_args+=("--tips-json" "$tips_json_abs")
fi

if [[ -n "$tips_dir" ]]; then
  tips_dir_abs="$(cd "$tips_dir" && pwd)"
  cli_args+=("--tips-dir" "$tips_dir_abs")
fi

echo "Generating knowledge Tips..."
npm run start -- "${cli_args[@]}"

if [[ ! -s "$output_abs" ]]; then
  echo "Expected output was not created: $output_abs" >&2
  exit 1
fi

echo "Output: $output_abs"
