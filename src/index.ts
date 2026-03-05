import "dotenv/config";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { searchTweets, getUserTweets, type Tweet } from "./twitter.js";
import { appendToMemory, loadExistingIds } from "./memory.js";

const API_KEY = process.env.TWITTER_API_KEY;

if (!API_KEY) {
  console.error("Missing TWITTER_API_KEY in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("mode="));
const mode = modeArg?.split("=")[1];

if (mode !== "account" && mode !== "keywords") {
  console.error("Usage: npm run report -- mode=account\n       npm run report -- mode=keywords");
  process.exit(1);
}

const MEMORY_DIR = "memory";
mkdirSync(MEMORY_DIR, { recursive: true });

function parseMdList(filePath: string): string[] {
  return readFileSync(filePath, "utf-8")
    .split("\n")
    .map((l) => l.replace(/^[\s\-*]+/, "").replace(/^@/, "").trim())
    .filter(Boolean);
}

function getMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

if (mode === "account") {
  const inputDir = "accounts_of_interest";
  const files = getMdFiles(inputDir);
  console.log(`Found ${files.length} account list(s) in ${inputDir}/`);

  for (const file of files) {
    const baseName = path.basename(file, ".md");
    const memoryPath = path.join(MEMORY_DIR, `${baseName}.memory.md`);
    const accounts = parseMdList(file);
    const seenIds = loadExistingIds(memoryPath);
    console.log(`\n[${baseName}] ${accounts.length} account(s), ${seenIds.size} tweets already stored`);

    for (const account of accounts) {
      try {
        const tweets = await getUserTweets(API_KEY, account);
        const newTweets: Tweet[] = tweets.filter((t) => !seenIds.has(t.id));

        if (newTweets.length > 0) {
          appendToMemory(newTweets, account, memoryPath);
          newTweets.forEach((t) => seenIds.add(t.id));
          console.log(`  [@${account}] +${newTweets.length} new tweet(s)`);
        } else {
          console.log(`  [@${account}] no new tweets`);
        }
      } catch (err) {
        console.error(`  [@${account}] error:`, err instanceof Error ? err.message : err);
      }
    }
  }
} else {
  const inputDir = "keywords_of_interest";
  const files = getMdFiles(inputDir);
  console.log(`Found ${files.length} keyword list(s) in ${inputDir}/`);

  for (const file of files) {
    const baseName = path.basename(file, ".md");
    const memoryPath = path.join(MEMORY_DIR, `${baseName}.memory.md`);
    const keywords = parseMdList(file);
    const seenIds = loadExistingIds(memoryPath);
    console.log(`\n[${baseName}] ${keywords.length} keyword(s), ${seenIds.size} tweets already stored`);

    for (const keyword of keywords) {
      try {
        const tweets = await searchTweets(API_KEY, keyword);
        const newTweets: Tweet[] = tweets.filter((t) => !seenIds.has(t.id));

        if (newTweets.length > 0) {
          appendToMemory(newTweets, keyword, memoryPath);
          newTweets.forEach((t) => seenIds.add(t.id));
          console.log(`  [${keyword}] +${newTweets.length} new tweet(s)`);
        } else {
          console.log(`  [${keyword}] no new tweets`);
        }
      } catch (err) {
        console.error(`  [${keyword}] error:`, err instanceof Error ? err.message : err);
      }
    }
  }
}
