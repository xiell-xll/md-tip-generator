import test from "node:test";
import assert from "node:assert/strict";
import { processMarkdownFiles } from "../src/pipeline.js";

test("processes markdown with generated tips and resolved images", async () => {
  const result = await processMarkdownFiles(
    [
      {
        filePath: "/tmp/hongdoushan.md",
        content: ["# 红豆杉养护", "![封面](cover.png)", "## 浇水", "红豆杉盆土长期潮湿会烂根。"].join("\n"),
      },
    ],
    async () => [
      {
        title: "红豆杉忌积水",
        oneSentence: "红豆杉盆土长期潮湿容易烂根。",
        explanation: "浇水后要等盆土见干再补水。",
        sourceQuote: "盆土长期潮湿会烂根",
        tags: ["浇水"],
        difficulty: "入门",
        imageIds: [],
      },
    ],
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].tips.length, 1);
  assert.equal(result[0].tips[0].images?.[0]?.id, "img_1");
});
