#!/usr/bin/env tsx
/**
 * Twitter Answers Generator - LLM Response Agent
 *
 * Reads tweets from ./memory/*.memory.md + context from ./context/neard.vision.md
 * Uses Claude (via OpenRouter) to generate unique, contextual replies for each tweet.
 *
 * Usage: npm run respond
 */

import "dotenv/config";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const CONTEXT_FILE = "context/neard.vision.md";
const MEMORY_DIR = "memory";
const RESPONSES_DIR = "responses";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "anthropic/claude-sonnet-4-5";

if (!OPENROUTER_API_KEY) {
  console.error("❌ Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

mkdirSync(RESPONSES_DIR, { recursive: true });

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Tweet {
  author: string;
  authorHandle: string;
  text: string;
  summary: string;
  url: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
}

// ─────────────────────────────────────────────
// File readers
// ─────────────────────────────────────────────

function getContext(): string {
  return readFileSync(CONTEXT_FILE, "utf-8");
}

// ─────────────────────────────────────────────
// Memory parser (same logic as before, just clean)
// ─────────────────────────────────────────────

function parseMemoryFile(content: string): Tweet[] {
  const tweets: Tweet[] = [];

  // Each tweet section starts with "## SomeName (@handle)"
  const sections = content.split(/\n(?=## )/);

  for (const section of sections) {
    if (!section.trim() || !section.startsWith("## ")) continue;

    const headerMatch = section.match(/^## .+?\((@[^)]+)\)/);
    if (!headerMatch) continue;

    const authorHandle = headerMatch[1];

    const urlMatch = section.match(/🔗\s*(https?:\/\/\S+)/);
    if (!urlMatch) continue;

    const tweetUrl = urlMatch[1].trim();

    // Extract raw text: everything between the header line and the 🔗 line
    const lines = section.split("\n");
    const urlLineIdx = lines.findIndex((l) => l.includes("🔗"));
    if (urlLineIdx === -1) continue;

    // The tweet body is between the header and the 🔗 line.
    // Strip metadata lines (ID/Keyword/Date/Followers) and the separator, then join.
    const bodyLines = lines.slice(1, urlLineIdx).filter((l) => {
      return (
        !l.startsWith("**ID:**") &&
        !l.startsWith("**Keyword:**") &&
        !l.startsWith("**Date:**") &&
        !l.startsWith("**Followers:**") &&
        !/^---+$/.test(l)
      );
    });

    const rawText = bodyLines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Skip tweets that are just a URL (no real text content)
    if (!rawText || rawText.length < 20) continue;
    if (/^https?:\/\/\S+$/.test(rawText.trim())) continue;

    const likesMatch = section.match(/❤️\s*(\d[\d\s]*)/);
    const retweetsMatch = section.match(/🔁\s*(\d[\d\s]*)/);
    const repliesMatch = section.match(/💬\s*(\d[\d\s]*)/);
    const viewsMatch = section.match(/👁\s*(\d[\d\s]*)/);
    const timestampMatch = section.match(/\*\*Date:\*\*\s*([^|]+)/);

    const parseNum = (m: RegExpMatchArray | null) =>
      parseInt((m?.[1] ?? "0").replace(/\s/g, ""), 10) || 0;

    const sentences = rawText.split(/[.!?]/).filter((s) => s.trim().length > 10);
    const summary =
      sentences[0] ? sentences[0].trim() + "." : rawText.substring(0, 150) + "...";

    tweets.push({
      author: authorHandle.replace(/^@/, ""),
      authorHandle: authorHandle.startsWith("@") ? authorHandle : `@${authorHandle}`,
      text: rawText,
      summary,
      url: tweetUrl,
      timestamp: timestampMatch ? timestampMatch[1].trim() : "",
      likes: parseNum(likesMatch),
      retweets: parseNum(retweetsMatch),
      replies: parseNum(repliesMatch),
      views: parseNum(viewsMatch),
    });
  }

  return tweets;
}

// ─────────────────────────────────────────────
// LLM response generator
// ─────────────────────────────────────────────

async function generateLLMResponse(tweet: Tweet, context: string): Promise<string> {
  const systemPrompt = `You are a thoughtful community voice for NEARD, an experimental music streaming platform built on XPRNetwork.

Your replies to tweets must:
- Be genuine and conversational — never corporate or salesy
- Reference NEARD ideas naturally only when relevant (per-second payments, listener→artist flow, no middlemen, XPR, XPRNetwork, no NEARD token, "Blocks. Beats. Bytes.")
- Feel like a real person engaging with the tweet's actual message
- Be under 280 characters (Twitter limit)
- Never repeat canned phrases or templates
- Match the tone of the original tweet (technical, casual, excited, thoughtful, etc.)

NEARD context for reference:
${context}`;

  const userPrompt = `Write a single Twitter reply (max 280 chars) to this tweet:

Author: ${tweet.authorHandle}
Tweet: ${tweet.text}

Reply must directly engage with what they said. Be specific. No generic platitudes.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/flexiboyz/twitter-answers-generator",
      "X-Title": "NEARD Twitter Response Agent",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty response from LLM");

  // Trim to 280 chars if needed (should not happen, but safety net)
  return reply.length > 280 ? reply.substring(0, 277) + "..." : reply;
}

// ─────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────

function formatMetrics(t: Tweet): string {
  return `👁 ${t.views.toLocaleString()} | ❤️ ${t.likes.toLocaleString()} | 🔁 ${t.retweets.toLocaleString()} | 💬 ${t.replies.toLocaleString()}`;
}

function buildReplyUrl(tweetUrl: string, replyText: string): string {
  const tweetId = tweetUrl.split("/").pop();
  if (!tweetId) return tweetUrl;
  return `https://x.com/intent/tweet?in_reply_to=${tweetId}&text=${encodeURIComponent(replyText)}`;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log("🦞 NEARD Twitter Response Agent — LLM Edition\n");

  // Load context
  console.log("📚 Loading NEARD context...");
  const context = getContext();
  console.log(`   Loaded ${context.length} chars from ${CONTEXT_FILE}\n`);

  // Load memory files
  if (!existsSync(MEMORY_DIR)) {
    console.error("❌ No memory/ directory found. Run 'npm run report' first.");
    process.exit(1);
  }

  const memoryFiles = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".memory.md"));
  if (memoryFiles.length === 0) {
    console.error("❌ No *.memory.md files found. Run 'npm run report' first.");
    process.exit(1);
  }

  console.log(`📥 Found ${memoryFiles.length} memory file(s)`);

  const allTweets: Array<{ filename: string; tweet: Tweet }> = [];

  for (const filename of memoryFiles) {
    const content = readFileSync(path.join(MEMORY_DIR, filename), "utf-8");
    const tweets = parseMemoryFile(content);
    console.log(`   ${filename}: ${tweets.length} tweet(s)`);
    for (const tweet of tweets) {
      allTweets.push({ filename, tweet });
    }
  }

  console.log(`\n🤖 Generating LLM responses for ${allTweets.length} tweet(s)...\n`);

  const responseBlocks: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const { filename, tweet } of allTweets) {
    process.stdout.write(`  ✍️  ${tweet.authorHandle} ... `);

    try {
      const reply = await generateLLMResponse(tweet, context);
      const metrics = formatMetrics(tweet);
      const replyUrl = buildReplyUrl(tweet.url, reply);

      responseBlocks.push(
        [
          `## ${tweet.authorHandle}`,
          ``,
          `**Summary:** ${tweet.summary}`,
          ``,
          metrics,
          ``,
          tweet.text,
          ``,
          `=========`,
          ``,
          reply,
          ``,
          `[Reply to Tweet →](${replyUrl})`,
          ``,
          `---`,
          ``,
        ].join("\n")
      );

      console.log(`done ✅`);
      successCount++;

      // Small delay between API calls to be polite
      if (allTweets.indexOf({ filename, tweet }) < allTweets.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.log(`failed ❌`);
      console.error(`     Error: ${err instanceof Error ? err.message : err}`);
      errorCount++;
    }
  }

  // Write output file
  const timestamp = new Date().toISOString().replace(/[:T.]/g, "-").replace(/Z$/, "");
  const randomId = Math.random().toString(36).substring(2, 7);
  const outputPath = path.join(RESPONSES_DIR, `${timestamp}-${randomId}.md`);

  const header = [
    `# NEARD Twitter Responses`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Model: ${MODEL}`,
    `Tweets processed: ${successCount} / ${allTweets.length}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  writeFileSync(outputPath, header + responseBlocks.join("\n\n"));

  console.log(`\n✅ ${successCount} response(s) written to ./${outputPath}`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} tweet(s) failed to generate a response`);
  }
  console.log(`\n💡 Open the file to review responses and use the Quick Reply links!`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
