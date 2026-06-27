# Troubleshooting

## Failure Layers

Report the failing layer, not only the final error:

- Input: path does not exist, no `.md` files, or file is unreadable.
- Dependency: `npm install` failed, TypeScript build failure, or test failure.
- Model config: missing API key, unsupported provider variables, or unavailable model.
- Model response: invalid JSON, missing required Tip fields, or unusable image IDs.
- Export: output directory issue, `.docx` write failure, or invalid generated file.

## Model Configuration

The CLI supports two modes:

1. **JSON Import Mode** (recommended): Use `--tips-json` or `--tips-dir` to pass pre-generated tips. No API key needed. The chat model generates tips, then the CLI handles Word export.

2. **DeepSeek Mode** (legacy): Set `DEEPSEEK_API_KEY` environment variable. The CLI calls DeepSeek directly to generate tips.

If the user says "use the current chat model", use JSON import mode: generate tips in the chat session, save to JSON, then call the CLI with `--tips-json`.

## Verification

Useful checks:

```bash
npm test
npm run build
ls -lh ./outputs/knowledge-tips.docx
```

For stricter `.docx` validation, inspect it as a zip and confirm `word/document.xml` exists.

The wrapper creates temporary work directories and leaves the user-facing output at the requested path. If a wrapper run fails, report the wrapper stage shown in stderr.

## Secret Handling

Never print full API keys in logs or final responses. It is acceptable to say "API key is configured" or "API key is missing".
