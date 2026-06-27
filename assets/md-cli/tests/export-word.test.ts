import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { exportArticlesToWord } from "../src/export-word.js";

function documentXml(docxPath: string): string {
  return execFileSync("unzip", ["-p", docxPath, "word/document.xml"], {
    encoding: "utf8",
  });
}

test("exports review status, scores, duplicate rate, and bold labels", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "md-cli-word-"));
  const markdownPath = path.join(dir, "article.md");
  const outputPath = path.join(dir, "tips.docx");
  fs.writeFileSync(markdownPath, "# 红豆杉养护\n![封面](missing.png)");

  await exportArticlesToWord(
    [
      {
        document: {
          filePath: markdownPath,
          fileName: "article.md",
          articleTitle: "红豆杉养护",
          cleanedContent: "",
          images: [],
          sections: [],
        },
        tips: [
          {
            title: "红豆杉忌积水",
            oneSentence: "红豆杉盆土长期潮湿容易烂根。",
            explanation: "浇水后要等盆土见干再补水。",
            sourceQuote: "盆土长期潮湿会烂根",
            tags: ["浇水"],
            difficulty: "入门",
            imageIds: ["img_1"],
            finalScore: 92,
            finalStatus: "精品",
            duplicateScore: 0.18,
            duplicateRisk: "low",
            scoreDetail: {
              accuracy: 94,
              sourceSupport: 90,
              clarity: 91,
              knowledgeValue: 95,
              atomicity: 93,
            },
            images: [
              {
                id: "img_1",
                src: "missing.png",
                alt: "封面",
                markdown: "![封面](missing.png)",
                line: 2,
                offset: 0,
              },
            ],
          },
        ],
      },
    ],
    outputPath,
  );

  const xml = documentXml(outputPath);

  for (const text of ["状态：", "评分：", "重复率：", "详解：", "原文依据：", "标签：", "图片："]) {
    assert.match(xml, new RegExp(`<w:b\\/>[\\s\\S]*?<w:t[^>]*>${text}</w:t>`));
  }
  assert.match(xml, /精品/);
  assert.match(xml, /92分/);
  assert.match(xml, /18%/);
  assert.match(xml, /准确性 94/);
});
