import test from "node:test";
import assert from "node:assert/strict";
import { dedupeTips } from "../src/tips.js";

test("keeps one tip for duplicate knowledge in the same article", () => {
  const tips = dedupeTips([
    {
      title: "红豆杉忌积水",
      oneSentence: "红豆杉盆土长期潮湿容易烂根。",
      explanation: "浇水后要等盆土见干再补水。",
      sourceQuote: "盆土长期潮湿会烂根",
      tags: ["浇水"],
      difficulty: "入门",
      imageIds: [],
    },
    {
      title: "红豆杉不要积水",
      oneSentence: "红豆杉积水后根系容易腐烂。",
      explanation: "盆土长期潮湿会造成烂根。",
      sourceQuote: "盆土长期潮湿会烂根",
      tags: ["浇水"],
      difficulty: "入门",
      imageIds: [],
    },
  ]);

  assert.equal(tips.length, 1);
  assert.equal(tips[0].title, "红豆杉忌积水");
  assert.equal(tips[0].duplicateScore, 1);
  assert.equal(tips[0].duplicateRisk, "high");
  assert.equal(tips[0].finalStatus, "审核");
});
