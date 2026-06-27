import type { KnowledgeTip, MarkdownDocument } from "./types.js";
import { parseMarkdownDocument, resolveImagesForTip } from "./markdown.js";
import { dedupeTips } from "./tips.js";

export type MarkdownFileInput = {
  filePath: string;
  content: string;
};

export type TipGenerator = (doc: MarkdownDocument) => Promise<KnowledgeTip[]>;

export type ProcessedArticle = {
  document: MarkdownDocument;
  tips: KnowledgeTip[];
};

export async function processMarkdownFiles(files: MarkdownFileInput[], generator: TipGenerator): Promise<ProcessedArticle[]> {
  const articles: ProcessedArticle[] = [];

  for (const file of files) {
    const document = parseMarkdownDocument(file);
    const generatedTips = await generator(document);
    const tips = dedupeTips(generatedTips).map((tip) => ({
      ...tip,
      images: resolveImagesForTip(document, tip),
    }));
    articles.push({ document, tips });
  }

  return articles;
}
