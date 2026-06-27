import fs from "node:fs";
import path from "node:path";
import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { MarkdownImage } from "./types.js";
import type { KnowledgeTip, ScoreDetail } from "./types.js";
import type { ProcessedArticle } from "./pipeline.js";

function imagePath(markdownPath: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return "";
  return path.isAbsolute(src)
    ? src
    : path.resolve(path.dirname(markdownPath), src);
}

function imageType(
  filePath: string,
): "jpg" | "png" | "gif" | "bmp" | undefined {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "jpg";
  if (ext === ".png") return "png";
  if (ext === ".gif") return "gif";
  if (ext === ".bmp") return "bmp";
  return undefined;
}

function imageParagraphs(
  markdownPath: string,
  images: MarkdownImage[] = [],
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const image of images) {
    const resolved = imagePath(markdownPath, image.src);
    const type = resolved ? imageType(resolved) : undefined;
    if (!resolved || !type || !fs.existsSync(resolved)) {
      paragraphs.push(
        new Paragraph({
          children: [
            labelRun("图片："),
            new TextRun({
              text: `${image.src}${image.alt ? `（${image.alt}）` : ""}`,
              italics: true,
            }),
          ],
        }),
      );
      continue;
    }

    const data = fs.readFileSync(resolved);
    paragraphs.push(
      new Paragraph({
        children: [
          labelRun("图片："),
          new TextRun(image.alt || image.src),
        ],
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type,
            data,
            transformation: { width: 420, height: 260 },
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

function labelRun(text: string): TextRun {
  return new TextRun({ text, bold: true });
}

function textRun(text: string): TextRun {
  return new TextRun({ text });
}

function percent(value: number | undefined): string {
  const ratio = Number.isFinite(value) ? Number(value) : 0;
  return `${Math.round(ratio * 100)}%`;
}

function scoreDetailText(scoreDetail: ScoreDetail | undefined): string {
  if (!scoreDetail) return "无";

  const parts = [
    ["准确性", scoreDetail.accuracy],
    ["原文支撑", scoreDetail.sourceSupport],
    ["清晰度", scoreDetail.clarity],
    ["知识价值", scoreDetail.knowledgeValue],
    ["单一性", scoreDetail.atomicity],
  ]
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([label, value]) => `${label} ${Math.round(Number(value))}`);

  return parts.length ? parts.join("；") : "无";
}

function fieldParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [labelRun(label), textRun(value)],
  });
}

function reviewParagraph(tip: KnowledgeTip): Paragraph {
  return new Paragraph({
    children: [
      labelRun("状态："),
      textRun(`${tip.finalStatus || "审核"}  `),
      labelRun("评分："),
      textRun(`${Math.round(tip.finalScore ?? 75)}分  `),
      labelRun("重复率："),
      textRun(`${percent(tip.duplicateScore)}  `),
      labelRun("重复风险："),
      textRun(tip.duplicateRisk || "low"),
    ],
  });
}

export async function exportArticlesToWord(
  articles: ProcessedArticle[],
  outputPath: string,
): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: "知识 Tips",
      heading: HeadingLevel.TITLE,
    }),
  ];

  for (const article of articles) {
    children.push(
      new Paragraph({
        text: article.document.articleTitle,
        heading: HeadingLevel.HEADING_1,
      }),
    );

    article.tips.forEach((tip, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${tip.title}`,
          heading: HeadingLevel.HEADING_2,
        }),
        reviewParagraph(tip),
        fieldParagraph("评分情况：", scoreDetailText(tip.scoreDetail)),
        fieldParagraph("一句话：", tip.oneSentence),
        fieldParagraph("详解：", tip.explanation),
        fieldParagraph("原文依据：", tip.sourceQuote),
        fieldParagraph("标签：", `${tip.tags.join("、") || "无"}；难度：${tip.difficulty}`),
        ...imageParagraphs(article.document.filePath, tip.images),
      );
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}
