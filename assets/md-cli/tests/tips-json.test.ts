import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createJsonTipsGenerator, createTipsDirGenerator } from "../src/tips-json.js";
import { processMarkdownFiles } from "../src/pipeline.js";

const sampleTips = [
  {
    title: "红豆杉忌积水",
    oneSentence: "红豆杉盆土长期潮湿容易烂根。",
    explanation: "浇水后要等盆土见干再补水。",
    sourceQuote: "盆土长期潮湿会烂根",
    tags: ["浇水"],
    difficulty: "入门",
    imageIds: [],
    finalScore: 90,
    finalStatus: "精品",
    duplicateScore: 0.1,
    scoreDetail: { accuracy: 92, sourceSupport: 88, clarity: 90, knowledgeValue: 91, atomicity: 89 },
  },
  {
    title: "修剪避开高温",
    oneSentence: "修剪要避开高温时段。",
    explanation: "高温修剪容易导致伤口感染。",
    sourceQuote: "修剪要避开高温",
    tags: ["修剪"],
    difficulty: "进阶",
    imageIds: ["img_2"],
  },
];

test("createJsonTipsGenerator reads flat array format", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-json-"));
  const jsonPath = path.join(dir, "tips.json");
  fs.writeFileSync(jsonPath, JSON.stringify(sampleTips));

  const generator = createJsonTipsGenerator(jsonPath);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/article.md", content: "# 红豆杉养护\n![封面](cover.png)\n## 浇水\n红豆杉怕积水。" }],
    generator,
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].tips.length, 2);
  assert.equal(result[0].tips[0].title, "红豆杉忌积水");
  assert.equal(result[0].tips[0].finalScore, 90);
  assert.equal(result[0].tips[0].finalStatus, "精品");
  assert.equal(result[0].tips[1].title, "修剪避开高温");
});

test("createJsonTipsGenerator reads { tips: [...] } format", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-json-"));
  const jsonPath = path.join(dir, "tips.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ tips: sampleTips }));

  const generator = createJsonTipsGenerator(jsonPath);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/article.md", content: "# 测试文章" }],
    generator,
  );

  assert.equal(result[0].tips.length, 2);
});

test("createJsonTipsGenerator normalizes duplicateScore > 1 as percentage", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-json-"));
  const jsonPath = path.join(dir, "tips.json");
  const tips = [{ ...sampleTips[0], duplicateScore: 85 }];
  fs.writeFileSync(jsonPath, JSON.stringify(tips));

  const generator = createJsonTipsGenerator(jsonPath);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/article.md", content: "# 测试" }],
    generator,
  );

  assert.equal(result[0].tips[0].duplicateScore, 0.85);
});

test("createJsonTipsGenerator throws on invalid format", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-json-"));
  const jsonPath = path.join(dir, "bad.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ invalid: true }));

  assert.throws(() => createJsonTipsGenerator(jsonPath), /格式无效/);
});

test("createTipsDirGenerator matches filename-based JSON files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-dir-"));
  fs.writeFileSync(path.join(dir, "hongdoushan.tips.json"), JSON.stringify(sampleTips));

  const generator = createTipsDirGenerator(dir);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/hongdoushan.md", content: "# 红豆杉养护" }],
    generator,
  );

  assert.equal(result[0].tips.length, 2);
  assert.equal(result[0].tips[0].title, "红豆杉忌积水");
});

test("createTipsDirGenerator falls back to .json extension", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-dir-"));
  fs.writeFileSync(path.join(dir, "article.json"), JSON.stringify(sampleTips));

  const generator = createTipsDirGenerator(dir);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/article.md", content: "# 测试" }],
    generator,
  );

  assert.equal(result[0].tips.length, 2);
});

test("createTipsDirGenerator returns empty for missing JSON", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tips-dir-"));

  const generator = createTipsDirGenerator(dir);
  const result = await processMarkdownFiles(
    [{ filePath: "/tmp/missing.md", content: "# 测试" }],
    generator,
  );

  assert.equal(result[0].tips.length, 0);
});
