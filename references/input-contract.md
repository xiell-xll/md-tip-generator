# Input Contract

## Supported Input

The CLI accepts either:

- A single `.md` file.
- A directory containing `.md` files, searched recursively.

The default output path, when the user does not specify one, should be:

```text
./outputs/knowledge-tips.docx
```

## Markdown Expectations

The source Markdown should preserve:

- Heading hierarchy.
- Original body text.
- Image markdown syntax.

The CLI parses heading blocks, replaces images with stable placeholders, and resolves Tip images after model generation. Do not pre-clean images away unless the user explicitly asks.

## Bundled Tool Layout

This skill is self-contained:

```text
assets/md-cli/
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
└── tests/
```

Use `scripts/run-md-tip.sh` from the skill directory for normal execution. It stages the bundled CLI into a temporary work directory before running it.

## Word Output

The Word document is expected to include:

- Tip title.
- Review status, score, duplicate rate, and duplicate risk.
- Scoring dimensions.
- One-sentence summary.
- Detailed explanation.
- Source quote.
- Tags and difficulty.
- Resolved images when available.

## JSON Import Input

In JSON import mode, the CLI accepts tips via:

- `--tips-json <file>`: A single JSON file containing `KnowledgeTip[]` or `{ tips: KnowledgeTip[] }`.
- `--tips-dir <dir>`: A directory where each `foo.md` maps to `foo.tips.json` or `foo.json`.

The tips JSON must match the KnowledgeTip schema. See `SKILL.md` for the full schema definition.

## Example User Requests

```text
Use md-tip-generator to turn ./markdowns into ./outputs/knowledge-tips.docx.
```

```text
用 md-tip-generator 处理 /Users/me/articles 目录，保留图片，导出知识 Tip Word。
```

```text
用 md-tip-generator 处理 ./markdowns/article.md，用 --tips-json 导入已生成的 tips，输出到 ./outputs/article-tips.docx。
```
