# Troubleshooting

## Failure Layers

Report the failing layer, not only the final error:

- Input: path does not exist, no `.md` files, or file is unreadable.
- Dependency: `npm install` failed, TypeScript build failure, or test failure.
- Model config: missing API key, unsupported provider variables, or unavailable model.
- Model response: invalid JSON, missing required Tip fields, or unusable image IDs.
- Export: output directory issue, `.docx` write failure, or invalid generated file.

## Current Model Limitation

The bundled CLI imports `generateTipsWithDeepSeek` and reads DeepSeek-specific environment variables. A user saying "use the current chat model" is not enough for CLI execution because the CLI cannot automatically call the chat session model.

If provider-neutral support exists in a later bundled code version, inspect `assets/md-cli/src` before using `MD_TIP_PROVIDER`, `MD_TIP_API_KEY`, `MD_TIP_BASE_URL`, or `MD_TIP_MODEL`.

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
