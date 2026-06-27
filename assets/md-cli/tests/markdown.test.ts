import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownDocument, resolveImagesForTip } from "../src/markdown.js";

test("parses markdown heading tree and keeps image placeholders", () => {
  const doc = parseMarkdownDocument({
    filePath: "/tmp/article.md",
    content: [
      "# 红豆杉养护",
      "![封面](cover.png)",
      "## 浇水",
      "红豆杉怕积水。",
      "## 修剪",
      "修剪要避开高温。",
      "![修剪图](trim.png)",
    ].join("\n"),
  });

  assert.equal(doc.articleTitle, "红豆杉养护");
  assert.equal(doc.images.length, 2);
  assert.match(doc.cleanedContent, /\[图片 img_1：封面\]/);
  assert.equal(doc.sections.find((section) => section.headingTitle === "浇水")?.images.length, 0);
  assert.equal(doc.sections.find((section) => section.headingTitle === "修剪")?.images[0]?.id, "img_2");
});

test("falls back to parent heading image when current section has none", () => {
  const doc = parseMarkdownDocument({
    filePath: "/tmp/article.md",
    content: [
      "# 红豆杉养护",
      "![封面](cover.png)",
      "## 浇水",
      "红豆杉怕积水，盆土长期潮湿会烂根。",
    ].join("\n"),
  });

  const images = resolveImagesForTip(doc, {
    title: "红豆杉忌积水",
    sourceQuote: "盆土长期潮湿会烂根",
    imageIds: [],
  });

  assert.equal(images.length, 1);
  assert.equal(images[0].id, "img_1");
  assert.equal(images[0].matchReason, "nearest_parent_heading_image");
});

test("uses valid model-selected image ids before fallback", () => {
  const doc = parseMarkdownDocument({
    filePath: "/tmp/article.md",
    content: [
      "# 红豆杉养护",
      "![封面](cover.png)",
      "## 修剪",
      "![修剪图](trim.png)",
      "修剪要避开高温。",
    ].join("\n"),
  });

  const images = resolveImagesForTip(doc, {
    title: "修剪避开高温",
    sourceQuote: "修剪要避开高温",
    imageIds: ["img_2"],
  });

  assert.equal(images.length, 1);
  assert.equal(images[0].id, "img_2");
  assert.equal(images[0].matchReason, "model_selected");
});
