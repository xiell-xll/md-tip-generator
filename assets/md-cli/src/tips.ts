import type { DuplicateRisk, KnowledgeTip, ReviewStatus } from "./types.js";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[，。、“”‘’：:；;！!？?（）()【】\[\]《》<>·・,.\s]/g, "")
    .replace(/(本文|本章|这个|一种|需要|应该|可以|进行|通过|方法|要点|注意|建议)/g, "")
    .trim();
}

function charSet(value: string): Set<string> {
  return new Set(normalizeText(value).split("").filter(Boolean));
}

function overlap(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection++;
  }
  return intersection / Math.min(left.size, right.size);
}

function similarity(left: KnowledgeTip, right: KnowledgeTip): number {
  if (left.sourceQuote.trim() && left.sourceQuote.trim() === right.sourceQuote.trim()) return 1;
  const leftText = `${left.title}${left.oneSentence}${left.explanation}`;
  const rightText = `${right.title}${right.oneSentence}${right.explanation}`;
  return overlap(charSet(leftText), charSet(rightText));
}

function statusFromScore(score: number): ReviewStatus {
  if (score >= 85) return "精品";
  if (score < 60) return "驳回";
  return "审核";
}

function riskFromDuplicateScore(score: number): DuplicateRisk {
  if (score >= 0.72) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

function reviewDefaults(tip: KnowledgeTip): KnowledgeTip {
  const finalScore = Number.isFinite(tip.finalScore) ? Math.round(Number(tip.finalScore)) : 75;
  const duplicateScore = Number.isFinite(tip.duplicateScore) ? Number(tip.duplicateScore) : 0;

  return {
    ...tip,
    finalScore,
    finalStatus: tip.finalStatus || statusFromScore(finalScore),
    duplicateScore,
    duplicateRisk: tip.duplicateRisk || riskFromDuplicateScore(duplicateScore),
  };
}

function hasRequiredFields(tip: KnowledgeTip): boolean {
  return Boolean(tip.title?.trim() && tip.oneSentence?.trim() && tip.explanation?.trim() && tip.sourceQuote?.trim());
}

export function dedupeTips(tips: KnowledgeTip[]): KnowledgeTip[] {
  const kept: KnowledgeTip[] = [];

  for (const tip of tips) {
    if (!hasRequiredFields(tip)) continue;
    const reviewedTip = reviewDefaults(tip);
    const duplicate = kept.find((existing) => similarity(existing, reviewedTip) >= 0.72);
    if (duplicate) {
      const duplicateScore = Math.max(duplicate.duplicateScore || 0, similarity(duplicate, reviewedTip));
      duplicate.duplicateScore = duplicateScore;
      duplicate.duplicateRisk = riskFromDuplicateScore(duplicateScore);
      continue;
    }
    kept.push(reviewedTip);
  }

  return kept;
}
