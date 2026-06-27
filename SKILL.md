---
name: md-tip-generator
description: Use when converting Markdown files or directories into Chinese knowledge Tips and Word .docx output with the bundled md-cli tool, including image preservation, title-based context, DeepSeek model configuration, CLI verification, self-contained skill execution, and troubleshooting failed Tip generation or export runs.
---

# Md Tip Generator

IRON LAW: Do not claim this skill can reuse the current chat model. The bundled CLI must call an explicit model provider configured by environment variables.

## Core Workflow

Use this checklist for every run:

- [ ] Identify the Markdown input path and Word output path.
- [ ] Confirm model configuration without printing secrets.
- [ ] Use the bundled CLI under `assets/md-cli`; do not require the user to clone another repo.
- [ ] Run the wrapper script unless you need to debug the bundled CLI directly.
- [ ] Verify the `.docx` file exists and report concrete results.

## Commands

Preferred command from the skill directory:

```bash
scripts/run-md-tip.sh --input ./markdowns --output ./outputs/knowledge-tips.docx
```

Single-file input is valid:

```bash
scripts/run-md-tip.sh --input ./markdowns/article.md --output ./outputs/article-tips.docx
```

The wrapper copies `assets/md-cli` to a temporary work directory, runs dependency installation if needed, runs tests and build, then executes:

```bash
npm run start -- --input <input> --output <output>
```

For debugging only, inspect or run the bundled CLI directly:

```bash
cd assets/md-cli
npm install
npm test
npm run build
```

## Model Configuration

The bundled CLI supports DeepSeek directly:

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Only check whether `DEEPSEEK_API_KEY` exists. Never print the full key.

Do not use provider-neutral variables unless the bundled code is updated to support them.

## Confirmation Gates

Ask before:

- Running a command that will call a paid or rate-limited model API.
- Installing dependencies when network access is required.
- Writing outside the user-provided output path.

Do not ask before read-only inspection, local tests, or local build commands.

## Output Contract

Final responses must include:

- Input path.
- Output `.docx` path.
- Tip count if the CLI printed it.
- Verification commands run and whether they passed.
- Any failure layer if generation failed.

## References

Load only what is needed:

- `references/input-contract.md`: Markdown, image, bundled tool, and output expectations.
- `references/troubleshooting.md`: Failure diagnosis and model-provider notes.

## Common Mistakes

- Do not require the user to clone `md-cli`; the skill bundles it in `assets/md-cli`.
- Do not rewrite Markdown parsing or Word export outside the bundled CLI.
- Do not drop image metadata or bypass the CLI image matching logic.
- Do not assume provider-neutral model variables work in this bundled version.
- Do not treat a generated `.docx` as verified until its path and size or structure are checked.
