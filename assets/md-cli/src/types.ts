export type MarkdownImage = {
  id: string;
  src: string;
  alt: string;
  markdown: string;
  line: number;
  offset: number;
  matchReason?: string;
  fallbackHeadingPath?: string;
};

export type MarkdownSection = {
  id: string;
  headingTitle: string;
  headingPath: string;
  level: number;
  parentId?: string;
  content: string;
  startOffset: number;
  endOffset: number;
  images: MarkdownImage[];
};

export type MarkdownDocument = {
  filePath: string;
  fileName: string;
  articleTitle: string;
  cleanedContent: string;
  images: MarkdownImage[];
  sections: MarkdownSection[];
};

export type ReviewStatus = "精品" | "审核" | "驳回";

export type DuplicateRisk = "low" | "medium" | "high";

export type ScoreDetail = {
  accuracy?: number;
  sourceSupport?: number;
  clarity?: number;
  knowledgeValue?: number;
  atomicity?: number;
};

export type KnowledgeTip = {
  title: string;
  oneSentence: string;
  explanation: string;
  sourceQuote: string;
  tags: string[];
  difficulty: string;
  imageIds: string[];
  finalScore?: number;
  finalStatus?: ReviewStatus;
  duplicateScore?: number;
  duplicateRisk?: DuplicateRisk;
  scoreDetail?: ScoreDetail;
  images?: MarkdownImage[];
};

export type DeepSeekConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};
