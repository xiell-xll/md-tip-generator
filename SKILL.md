---
name: md-tip-generator
description: Use when converting Markdown files or directories into Chinese knowledge Tips and Word .docx output with the bundled md-cli tool, including image preservation, title-based context, JSON import mode, DeepSeek model configuration (optional), CLI verification, self-contained skill execution, and troubleshooting failed Tip generation or export runs.
---

# Md Tip Generator

## Core Workflow

Use this checklist for every run:

- [ ] Identify the Markdown input path and Word output path.
- [ ] Choose a mode: JSON import (recommended) or DeepSeek API.
- [ ] If using JSON import, generate tips in chat first, save to JSON file.
- [ ] Use the bundled CLI under `assets/md-cli`; do not require the user to clone another repo.
- [ ] Run the wrapper script unless you need to debug the bundled CLI directly.
- [ ] Verify the `.docx` file exists and report concrete results.

## Modes

### JSON Import Mode (Recommended)

Generate tips using the current chat model, then export to Word without any external API:

1. Read the Markdown file(s) in chat.
2. Generate `KnowledgeTip[]` JSON (see schema below).
3. Save the JSON to a file (e.g., `tips.json`).
4. Run the CLI with `--tips-json`:

```bash
scripts/run-md-tip.sh --input ./markdowns --tips-json ./tips.json --output ./outputs/knowledge-tips.docx
```

For multiple Markdown files with separate tips per file, use `--tips-dir`:

```bash
scripts/run-md-tip.sh --input ./markdowns --tips-dir ./tips/ --output ./outputs/knowledge-tips.docx
```

Each Markdown file `foo.md` maps to `foo.tips.json` or `foo.json` in the tips directory.

### DeepSeek API Mode (Legacy)

If `DEEPSEEK_API_KEY` is set and no `--tips-json`/`--tips-dir` is provided, the CLI calls DeepSeek directly:

```bash
DEEPSEEK_API_KEY=sk-xxx scripts/run-md-tip.sh --input ./markdowns --output ./outputs/knowledge-tips.docx
```

## KnowledgeTip JSON Schema

When generating tips in chat, output valid JSON matching this structure:

```json
{
  "tips": [
    {
      "title": "不超过18字",
      "oneSentence": "40-90个中文字符",
      "explanation": "60-180个中文字符",
      "sourceQuote": "原文依据，必须来自原文",
      "tags": ["标签1", "标签2"],
      "difficulty": "入门|进阶|高级",
      "imageIds": ["img_1"],
      "finalScore": 88,
      "finalStatus": "精品",
      "duplicateScore": 0.12,
      "scoreDetail": {
        "accuracy": 90,
        "sourceSupport": 88,
        "clarity": 86,
        "knowledgeValue": 89,
        "atomicity": 87
      }
    }
  ]
}
```

### Tip Generation Rules

- 同一篇文章内不要生成重复知识点；如果两个知识点讲的是同一件事，只保留更具体、更有原文依据的一个。
- 每个 Tip 只讲一个具体知识点。
- 每个 Tip 必须有 sourceQuote，且 sourceQuote 必须来自原文。
- 不要输出文章摘要、标题复述、空泛建议。
- 如果图片和 Tip 有关，返回 imageIds，例如 `["img_1"]`；不确定就返回 `[]`。
- 状态规则：finalScore >= 85 为精品；finalScore < 60 为驳回；其他为审核。

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

## Model Configuration (Legacy Mode Only)

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
- In JSON import mode, ensure the tips JSON file is valid and matches the KnowledgeTip schema before calling the CLI.
