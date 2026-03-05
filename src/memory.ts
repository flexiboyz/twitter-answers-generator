import { readFileSync, appendFileSync, existsSync } from "node:fs";
import type { Tweet } from "./twitter.js";

const DEFAULT_MEMORY_PATH = "memory.md";

export function loadExistingIds(memoryPath = DEFAULT_MEMORY_PATH): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(memoryPath)) return ids;

  const content = readFileSync(memoryPath, "utf-8");
  const matches = content.matchAll(/\*\*ID:\*\* `(\d+)`/g);
  for (const m of matches) {
    if (m[1]) ids.add(m[1]);
  }
  return ids;
}

export function appendToMemory(tweets: Tweet[], keyword: string, memoryPath = DEFAULT_MEMORY_PATH): void {
  const lines: string[] = [];

  if (!existsSync(memoryPath)) {
    lines.push("# Twitter Keyword Monitor — Memory\n");
  }

  for (const t of tweets) {
    lines.push(`## ${t.author} (@${t.authorHandle}) ${t.verified ? "✅" : ""}`);
    lines.push("");
    lines.push(`**ID:** \`${t.id}\` | **Keyword:** \`${keyword}\` | **Date:** ${t.createdAt} | **Followers:** ${t.followers.toLocaleString()}`);
    lines.push("");
    lines.push(t.text.replace(/\n/g, " "));
    lines.push("");
    lines.push(`🔗 ${t.url}`);
    lines.push("");
    lines.push(`❤️ ${t.likeCount} | 🔁 ${t.retweetCount} | 💬 ${t.replyCount} | 👁 ${t.viewCount}`);
    lines.push("");
    lines.push("---\n");
  }

  appendFileSync(memoryPath, lines.join("\n"), "utf-8");
}
