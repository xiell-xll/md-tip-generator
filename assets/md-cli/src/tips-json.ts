import fs from "node:fs";
import type { KnowledgeTip, MarkdownDocument } from "./types.js";
import type { TipGenerator } from "./pipeline.js";

function normalizeTip(raw: Partial<KnowledgeTip>): KnowledgeTip {
  const duplicateScore = Number(raw.duplicateScore) || 0;
  const normalizedDuplicateScore = duplicateScore > 1 ? duplicateScore / 100 : duplicateScore;

  return {
    title: String(raw.title || "").trim(),
    oneSentence: String(raw.oneSentence || "").trim(),
    explanation: String(raw.explanation || "").trim(),
    sourceQuote: String(raw.sourceQuote || "").trim(),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    difficulty: String(raw.difficulty || "入门").trim(),
    imageIds: Array.isArray(raw.imageIds) ? raw.imageIds.map(String) : [],
    finalScore: Number.isFinite(Number(raw.finalScore)) ? Number(raw.finalScore) : undefined,
    finalStatus: raw.finalStatus,
    duplicateScore: normalizedDuplicateScore,
    duplicateRisk: raw.duplicateRisk,
    scoreDetail: raw.scoreDetail,
  };
}

function parseTipsJsonFile(jsonPath: string): KnowledgeTip[] {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => normalizeTip(item as Partial<KnowledgeTip>));
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { tips?: unknown }).tips)) {
    return (parsed as { tips: Partial<KnowledgeTip>[] }).tips.map((tip) => normalizeTip(tip));
  }

  throw new Error(`tips JSON 文件格式无效：期望 KnowledgeTip[] 或 { tips: KnowledgeTip[] }，实际结构不匹配。`);
}

/**
 * Create a TipGenerator that reads tips from a JSON file.
 * Supports two formats:
 *   - KnowledgeTip[] (flat array)
 *   - { tips: KnowledgeTip[] } (object with tips key)
 *
 * For multi-file input, the same tips array is returned for every document.
 * If per-file mapping is needed, use --tips-dir with one JSON per markdown file.
 */
export function createJsonTipsGenerator(jsonPath: string): TipGenerator {
  const tips = parseTipsJsonFile(jsonPath);
  return async (_doc: MarkdownDocument) => tips;
}

/**
 * Create a TipGenerator that reads tips from a directory of JSON files.
 * Each JSON file should be named to match the markdown file:
 *   article.md → article.tips.json
 * If no matching file found, returns empty tips for that document.
 */
export function createTipsDirGenerator(dirPath: string): TipGenerator {
  return async (doc: MarkdownDocument) => {
    const baseName = doc.fileName.replace(/\.md$/i, "");
    const candidates = [
      `${baseName}.tips.json`,
      `${baseName}.json`,
    ];

    for (const candidate of candidates) {
      const fullPath = `${dirPath}/${candidate}`;
      if (fs.existsSync(fullPath)) {
        return parseTipsJsonFile(fullPath);
      }
    }

    console.warn(`警告：未找到 ${doc.fileName} 对应的 tips JSON 文件，跳过。`);
    return [];
  };
}
