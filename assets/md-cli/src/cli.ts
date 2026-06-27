#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateTipsWithDeepSeek } from "./deepseek.js";
import { exportArticlesToWord } from "./export-word.js";
import { processMarkdownFiles, type MarkdownFileInput } from "./pipeline.js";

type CliArgs = {
  input: string;
  output: string;
};

function printHelp(): void {
  console.log(`用法:
  md-tip --input <markdown文件或目录> --output <输出docx路径>

环境变量:
  DEEPSEEK_API_KEY   必填
  DEEPSEEK_BASE_URL  可选，默认 https://api.deepseek.com
  DEEPSEEK_MODEL     可选，默认 deepseek-chat

示例:
  DEEPSEEK_API_KEY=sk-xxx npm run start -- --input ./markdowns --output ./outputs/tips.docx`);
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

  return { input, output };
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const files = readMarkdownFiles(args.input);
  console.log(`读取 Markdown：${files.length} 个文件`);

  const articles = await processMarkdownFiles(files, generateTipsWithDeepSeek);
  const tipCount = articles.reduce((sum, article) => sum + article.tips.length, 0);
  await exportArticlesToWord(articles, path.resolve(args.output));
  console.log(`已导出：${path.resolve(args.output)}，共 ${tipCount} 条 Tip`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
