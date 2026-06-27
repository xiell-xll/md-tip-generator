import type { DeepSeekConfig, KnowledgeTip, MarkdownDocument } from "./types.js";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const defaultBaseUrl = "https://api.deepseek.com";
const defaultModel = "deepseek-chat";

export function getDeepSeekConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY 环境变量。");
  }

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || defaultBaseUrl,
    model: process.env.DEEPSEEK_MODEL || defaultModel,
  };
}

function buildPrompt(doc: MarkdownDocument): string {
  return [
    "# Role: 知识 Tip 生成专家",
    "",
    "请根据整篇 Markdown 文章直接生成知识 Tip，不要先拆候选知识点。",
    "",
    "要求：",
    "- 同一篇文章内不要生成重复知识点；如果两个知识点讲的是同一件事，只保留更具体、更有原文依据的一个。",
    "- 每个 Tip 只讲一个具体知识点。",
    "- 每个 Tip 必须有 sourceQuote，且 sourceQuote 必须来自原文。",
    "- 不要输出文章摘要、标题复述、空泛建议。",
    "- 如果图片和 Tip 有关，返回 imageIds，例如 [\"img_1\"]；不确定就返回 []。",
    "- 必须给出 finalScore（0-100）、finalStatus（精品|审核|驳回）、duplicateScore（0-1）和 scoreDetail。",
    "- 状态规则：finalScore >= 85 为精品；finalScore < 60 为驳回；其他为审核。",
    "- scoreDetail 包含 accuracy、sourceSupport、clarity、knowledgeValue、atomicity，均为 0-100 分。",
    "- 只输出 JSON，不要输出 Markdown，不要解释。",
    "",
    "JSON 结构：",
    "{\"tips\":[{\"title\":\"不超过18字\",\"oneSentence\":\"40-90个中文字符\",\"explanation\":\"60-180个中文字符\",\"sourceQuote\":\"原文依据\",\"tags\":[\"标签\"],\"difficulty\":\"入门|进阶|高级\",\"imageIds\":[\"img_1\"],\"finalScore\":88,\"finalStatus\":\"精品\",\"duplicateScore\":0.12,\"scoreDetail\":{\"accuracy\":90,\"sourceSupport\":88,\"clarity\":86,\"knowledgeValue\":89,\"atomicity\":87}}]}",
    "",
    `filePath：${doc.filePath}`,
    `fileName：${doc.fileName}`,
    `文章标题：${doc.articleTitle}`,
    "",
    "图片清单：",
    JSON.stringify(
      doc.images.map((image) => ({ id: image.id, src: image.src, alt: image.alt, line: image.line })),
      null,
      2,
    ),
    "",
    "正文：",
    doc.cleanedContent,
  ].join("\n");
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1]);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

  throw new Error("DeepSeek 返回内容不是 JSON。");
}

function normalizeTips(payload: unknown): KnowledgeTip[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { tips?: unknown }).tips)) {
    throw new Error("DeepSeek JSON 缺少 tips 数组。");
  }

  return (payload as { tips: Array<Partial<KnowledgeTip>> }).tips.map((tip) => {
    const duplicateScore = Number(tip.duplicateScore) || 0;
    const normalizedDuplicateScore = duplicateScore > 1 ? duplicateScore / 100 : duplicateScore;

    return {
      title: String(tip.title || "").trim(),
      oneSentence: String(tip.oneSentence || "").trim(),
      explanation: String(tip.explanation || "").trim(),
      sourceQuote: String(tip.sourceQuote || "").trim(),
      tags: Array.isArray(tip.tags) ? tip.tags.map(String) : [],
      difficulty: String(tip.difficulty || "入门").trim(),
      imageIds: Array.isArray(tip.imageIds) ? tip.imageIds.map(String) : [],
      finalScore: Number.isFinite(Number(tip.finalScore)) ? Number(tip.finalScore) : undefined,
      finalStatus: tip.finalStatus,
      duplicateScore: normalizedDuplicateScore,
      duplicateRisk: tip.duplicateRisk,
      scoreDetail: tip.scoreDetail,
    };
  });
}

export async function generateTipsWithDeepSeek(doc: MarkdownDocument, config = getDeepSeekConfig()): Promise<KnowledgeTip[]> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: buildPrompt(doc),
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek 请求失败：${response.status} ${body}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 响应缺少 message.content。");

  return normalizeTips(extractJsonObject(content));
}
