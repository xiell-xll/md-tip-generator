import path from "node:path";
import type { KnowledgeTip, MarkdownDocument, MarkdownImage, MarkdownSection } from "./types.js";

type ParseInput = {
  filePath: string;
  content: string;
};

type ImageMatch = MarkdownImage & { matchReason: string };

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function normalizeImageSrc(src: string): string {
  return src.trim().replace(/^<|>$/g, "");
}

function titleFromFile(filePath: string): string {
  return path.basename(filePath).replace(/\.md$/i, "");
}

function replaceImages(content: string): { content: string; images: MarkdownImage[] } {
  const images: MarkdownImage[] = [];

  const replacedMarkdown = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, rawSrc, offset) => {
    const id = `img_${images.length + 1}`;
    const image: MarkdownImage = {
      id,
      src: normalizeImageSrc(String(rawSrc).split(/\s+['"]/)[0] ?? ""),
      alt: String(alt || "").trim(),
      markdown: match,
      line: lineNumberAt(content, offset),
      offset,
    };
    images.push(image);
    return `[图片 ${id}${image.alt ? `：${image.alt}` : ""}]`;
  });

  const replacedHtml = replacedMarkdown.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (match, src, offset) => {
    const id = `img_${images.length + 1}`;
    const altMatch = match.match(/\balt=["']([^"']*)["']/i);
    const image: MarkdownImage = {
      id,
      src: normalizeImageSrc(src),
      alt: altMatch?.[1]?.trim() ?? "",
      markdown: match,
      line: lineNumberAt(replacedMarkdown, offset),
      offset,
    };
    images.push(image);
    return `[图片 ${id}${image.alt ? `：${image.alt}` : ""}]`;
  });

  return { content: replacedHtml, images };
}

function cleanMarkdown(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/上一篇[:：].*/g, "")
    .replace(/下一篇[:：].*/g, "")
    .replace(/返回目录.*/g, "")
    .replace(/版权声明[:：].*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSectionImages(section: MarkdownSection, images: MarkdownImage[]): MarkdownImage[] {
  const ids = new Set<string>();
  for (const match of section.content.matchAll(/\[图片\s+(img_\d+)(?:：[^\]]*)?\]/g)) {
    ids.add(match[1]);
  }
  return images
    .filter((image) => ids.has(image.id))
    .map((image) => ({ ...image, offset: Math.max(0, section.content.indexOf(`[图片 ${image.id}`)) }));
}

function splitIntoSections(content: string, images: MarkdownImage[], filePath: string): MarkdownSection[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [...content.matchAll(headingRegex)].map((match, index) => ({
    index,
    level: match[1].length,
    title: match[2].trim(),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  if (headings.length === 0) {
    const section: MarkdownSection = {
      id: "section_1",
      headingTitle: titleFromFile(filePath),
      headingPath: titleFromFile(filePath),
      level: 1,
      content,
      startOffset: 0,
      endOffset: content.length,
      images: [],
    };
    section.images = extractSectionImages(section, images);
    return [section];
  }

  const stack: MarkdownSection[] = [];
  const sections: MarkdownSection[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextStart = headings[i + 1]?.start ?? content.length;
    const sectionContent = content.slice(heading.end, nextStart).trim();

    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
    const headingPath = [...stack.map((section) => section.headingTitle), heading.title].join(" > ");
    const section: MarkdownSection = {
      id: `section_${sections.length + 1}`,
      headingTitle: heading.title,
      headingPath,
      level: heading.level,
      parentId: stack[stack.length - 1]?.id,
      content: sectionContent,
      startOffset: heading.start,
      endOffset: nextStart,
      images: [],
    };
    section.images = extractSectionImages(section, images);
    sections.push(section);
    stack.push(section);
  }

  return sections;
}

export function parseMarkdownDocument(input: ParseInput): MarkdownDocument {
  const normalized = input.content.replace(/\r\n?/g, "\n");
  const withImages = replaceImages(normalized);
  const cleanedContent = cleanMarkdown(withImages.content);
  const articleTitle = cleanedContent.match(/^#\s+(.+)$/m)?.[1]?.trim() || titleFromFile(input.filePath);

  return {
    filePath: input.filePath,
    fileName: path.basename(input.filePath),
    articleTitle,
    cleanedContent,
    images: withImages.images,
    sections: splitIntoSections(cleanedContent, withImages.images, input.filePath),
  };
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

function findSectionForQuote(doc: MarkdownDocument, sourceQuote: string): MarkdownSection {
  const quote = sourceQuote.trim();
  const compactQuote = compactText(quote);
  const exact = doc.sections.find((section) => quote && section.content.includes(quote));
  if (exact) return exact;
  const compact = doc.sections.find((section) => compactQuote.length >= 6 && compactText(section.content).includes(compactQuote));
  return compact || doc.sections[doc.sections.length - 1];
}

function nearestImage(section: MarkdownSection, sourceQuote: string): ImageMatch[] {
  if (section.images.length === 0) return [];
  if (section.images.length === 1) return [{ ...section.images[0], matchReason: "single_image_in_heading" }];

  const position = section.content.indexOf(sourceQuote);
  if (position < 0) return [{ ...section.images[0], matchReason: "first_image_in_heading" }];

  const nearest = [...section.images].sort((left, right) => Math.abs(left.offset - position) - Math.abs(right.offset - position))[0];
  return nearest ? [{ ...nearest, matchReason: "nearest_to_source_quote" }] : [];
}

function parentImages(doc: MarkdownDocument, section: MarkdownSection): ImageMatch[] {
  let parentId = section.parentId;
  while (parentId) {
    const parent = doc.sections.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    if (parent.images.length > 0) {
      const image = parent.images[parent.images.length - 1];
      return [{ ...image, matchReason: "nearest_parent_heading_image", fallbackHeadingPath: parent.headingPath }];
    }
    parentId = parent.parentId;
  }
  return [];
}

export function resolveImagesForTip(doc: MarkdownDocument, tip: Pick<KnowledgeTip, "title" | "sourceQuote" | "imageIds">): ImageMatch[] {
  const selected = tip.imageIds
    .map((id) => doc.images.find((image) => image.id === id))
    .filter((image): image is MarkdownImage => Boolean(image))
    .map((image) => ({ ...image, matchReason: "model_selected" }));
  if (selected.length > 0) return selected;

  const section = findSectionForQuote(doc, tip.sourceQuote);
  const sectionImages = nearestImage(section, tip.sourceQuote);
  return sectionImages.length > 0 ? sectionImages : parentImages(doc, section);
}
