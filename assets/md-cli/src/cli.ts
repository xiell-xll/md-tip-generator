#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateTipsWithDeepSeek } from "./deepseek.js";
import { exportArticlesToWord } from "./export-word.js";
import { processMarkdownFiles, type MarkdownFileInput, type TipGenerator } from "./pipeline.js";
import { createJsonTipsGenerator, createTipsDirGenerator } from "./tips-json.js";

type CliArgs = {
  input: string;
  output: string;
  tipsJson?: string;
  tipsDir?: string;
};

function printHelp(): void {
  console.log(`用法:
  md-tip --input <markdown文件或目录> --output <输出docx路径>

模式:
  默认模式（需要外部模型）:
    DEEPSEEK_API_KEY=sk-xxx md-tip --input ./markdowns --output ./tips.docx

  JSON 导入模式（不需要外部模型）:
    md-tip --input ./markdowns --tips-json ./tips.json --output ./tips.docx

  目录导入模式（每个 markdown 对应一个 JSON）:
    md-tip --input ./markdowns --tips-dir ./tips/ --output ./tips.docx

环境变量（仅默认模式需要）:
  DEEPSEEK_API_KEY   默认模式必填
  DEEPSEEK_BASE_URL  可选，默认 https://api.deepseek.com
  DEEPSEEK_MODEL     可选，默认 deepseek-chat`);
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) continue;
    args.set(key.slice(2), value);
  }

  const input = args.get("input");
  const output = args.get("output") || "outputs/knowledge-tips.docx";
  if (!input) {
    printHelp();
    process.exit(1);
  }

  return {
    input,
    output,
    tipsJson: args.get("tips-json"),
    tipsDir: args.get("tips-dir"),
  };
}

function collectMarkdownFiles(inputPath: string): string[] {
  const absolute = path.resolve(inputPath);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return absolute.toLowerCase().endsWith(".md") ? [absolute] : [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const entryPath = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function readMarkdownFiles(input: string): MarkdownFileInput[] {
  const files = collectMarkdownFiles(input);
  if (files.length === 0) throw new Error(`没有找到 Markdown 文件：${input}`);
  return files.map((filePath) => ({ filePath, content: fs.readFileSync(filePath, "utf8") }));
}

function resolveGenerator(args: CliArgs): TipGenerator {
  if (args.tipsJson) {
    const absPath = path.resolve(args.tipsJson);
    if (!fs.existsSync(absPath)) {
      throw new Error(`tips JSON 文件不存在：${absPath}`);
    }
    console.log(`使用 JSON 导入模式：${absPath}`);
    return createJsonTipsGenerator(absPath);
  }

  if (args.tipsDir) {
    const absPath = path.resolve(args.tipsDir);
    if (!fs.statSync(absPath).isDirectory()) {
      throw new Error(`tips 目录不存在：${absPath}`);
    }
    console.log(`使用目录导入模式：${absPath}`);
    return createTipsDirGenerator(absPath);
  }

  // Default: DeepSeek mode
  console.log("使用 DeepSeek 模式生成 tips...");
  return generateTipsWithDeepSeek;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const files = readMarkdownFiles(args.input);
  console.log(`读取 Markdown：${files.length} 个文件`);

  const generator = resolveGenerator(args);
  const articles = await processMarkdownFiles(files, generator);
  const tipCount = articles.reduce((sum, article) => sum + article.tips.length, 0);
  await exportArticlesToWord(articles, path.resolve(args.output));
  console.log(`已导出：${path.resolve(args.output)}，共 ${tipCount} 条 Tip`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
