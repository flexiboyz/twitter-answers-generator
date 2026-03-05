#!/usr/bin/env tsx
/**
 * Twitter Answers Generator - Response Crafting Agent
 * 
 * This script reads tweets from memory files and generates responses
 * based on the context from context/neard.vision.md
 * 
 * Features:
 * - Includes tweet metrics (likes, retweets, replies, views)
 * - Generates Twitter intent URLs for pre-filled replies
 */

import "dotenv/config";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const CONTEXT_FILE = "context/neard.vision.md";
const MEMORY_DIR = "memory";
const RESPONSES_DIR = "responses";

// Create responses directory if it doesn't exist
mkdirSync(RESPONSES_DIR, { recursive: true });

// Context for NEARD understanding
function getContext(): string {
  return readFileSync(CONTEXT_FILE, "utf-8");
}

// Generate Twitter intent URL for pre-filled reply
function generateIntentUrl(tweetUrl: string, response: string): string {
  const tweetId = tweetUrl.split('/').pop();
  if (!tweetId) return tweetUrl;
  
  const intentUrl = `https://x.com/intent/tweet?in_reply_to=${tweetId}&text=${encodeURIComponent(response)}`;
  return intentUrl;
}

// Parse memory file content into structured tweets
function parseMemoryFile(content: string, filename: string): Array<{
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
}> {
  const tweets: Array<{
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
  }> = [];
  
  // Split by author sections
  const sections = content.split(/## .*?\(/);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // Parse header
    const headerMatch = section.match(/(@[^)]+)\)/);
    if (!headerMatch) continue;
    
    const authorHandle = headerMatch[1];
    const author = authorHandle.replace("@", "");
    
    // Extract tweet content between ID line and URL line
    const idStart = section.indexOf("**ID:**");
    const urlMatch = section.match(/🔗\s*(https?:\/\/[^\s]+)/);
    
    if (idStart === -1 || !urlMatch) continue;
    
    const textSection = section.substring(idStart, urlMatch.index);
    
    // Extract stats
    const likesMatch = textSection.match(/❤️\s*(\d+)/);
    const retweetsMatch = textSection.match(/🔁\s*(\d+)/);
    const repliesMatch = textSection.match(/💬\s*(\d+)/);
    const viewsMatch = textSection.match(/👁\s*(\d+)/);
    const timestampMatch = textSection.match(/\*\*Date:\*\*\s*([^\|]+)/);
    
    const tweetText = textSection
      .replace(/\*\*ID:\*\*.*?\|/, "")
      .replace(/\*\*Keyword:\*\*.*?\|/, "")
      .replace(/\*\*Date:\*\*.*?\|/, "")
      .replace(/\*\*Followers:\*\*.*?\n/, "")
      .replace(/---/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    if (!tweetText || tweetText.length < 20) continue;
    
    // Create one-sentence summary (first sentence or first 150 chars)
    const sentences = tweetText.split('. ').filter(s => s.trim());
    const summary = sentences[0] ? sentences[0].trim() + '.' : tweetText.substring(0, 150) + '...';
    
    tweets.push({
      author,
      authorHandle,
      text: tweetText,
      summary,
      url: urlMatch[1],
      timestamp: timestampMatch ? timestampMatch[1].trim() : "",
      likes: parseInt(likesMatch?.[1] || "0"),
      retweets: parseInt(retweetsMatch?.[1] || "0"),
      replies: parseInt(repliesMatch?.[1] || "0"),
      views: parseInt(viewsMatch?.[1] || "0")
    });
  }
  
  return tweets;
}

// Format metrics display
function formatMetrics(likes: number, retweets: number, replies: number, views: number): string {
  const formattedLikes = likes.toLocaleString();
  const formattedRetweets = retweets.toLocaleString();
  const formattedReplies = replies.toLocaleString();
  const formattedViews = views.toLocaleString();
  
  return `👁 ${formattedViews} | ❤️ ${formattedLikes} | 🔁 ${formattedRetweets} | 💬 ${formattedReplies}`;
}

// Generate response using the context
function generateResponse(tweet: any): string {
  const textLower = tweet.text.toLowerCase();
  
  // Music/crypto intersection
  if (textLower.includes("music") && textLower.includes("crypto")) {
    return "This is exactly the intersection that matters. Music has always been cultural AND economic for creators. The old system centralizes both discovery AND payouts. What if listeners could directly support artists without labels taking 50%+ cuts? That's the experiment we're running.";
  }
  
  // Music funding/investing
  else if (textLower.includes("fund") && textLower.includes("musi") && (textLower.includes("vc") || textLower.includes("capital") || textLower.includes("invest"))) {
    return "That's interesting mapping. But I wonder if we're solving the right problem. What if instead of funding platforms, we funded the direct connection? Listeners to artists. No VC, no middleman, just value flowing. That's what XPRNetwork makes possible.";
  }
  
  // AI music
  else if (textLower.includes("ai") && textLower.includes("musi")) {
    return "AI tools are wild - from respectful training models to 'vending machine' generation. The real question isn't whether AI can make music, but whether artists get compensated fairly when it happens. Direct settlement onchain means every usage pays the creator instantly. No black boxes.";
  }
  
  // Platform/tools/app
  else if (textLower.includes("app") && textLower.includes("tool") && textLower.includes("artist")) {
    return "We built tools for artists but not fans. What if fans could earn just by participating? Supporting music they love. That's Piki's concept - and that's what NEARD does already. No token, just real payments from listener to artist every second they listen.";
  }
  
  // Music industry/industry people
  else if (textLower.includes("industry") && (textLower.includes("a&r") || textLower.includes("music") || textLower.includes("artist"))) {
    return "Music is about discovery - finding that connection between artist and listener. The old gatekeepers tried to control that. What if discovery worked organically? Fans find artists, support them directly. No algorithm deciding visibility.";
  }
  
  // Creator economy/creators
  else if (textLower.includes("creator") && (textLower.includes("artist") || textLower.includes("musi"))) {
    return "Creators don't want to wait months for royalties. Every stream should pay instantly. Artists see the payment as it happens. That's what 'per second payments' means - listen now, earn now. No quarterly statements, no pooled models.";
  }
  
  // Music streaming
  else if (textLower.includes("stream") && textLower.includes("music")) {
    return "The current streaming model was built to monetize catalogs, not empower creators. You listen, they earn. Direct wallet-to-wallet. No label cut. No platform balance. No delayed reconciliation. That's the whole point of NEARD.";
  }
  
  // Discovery/finding artists
  else if (textLower.includes("discover") || (textLower.includes("find") && textLower.includes("artist"))) {
    return "Music discovery should happen naturally. Fan to artist. Real people connecting over real music. Not an algorithm deciding what you see. When fans directly support what they love, discovery becomes about actual connection.";
  }
  
  // General music appreciation
  else if (textLower.includes("music")) {
    return "Music is universal. It crosses borders, languages, cultures. Every genre, every listener, it's all about that moment when you press play. That's what matters, not the genre labels or the streaming platforms. Supporting the music you love.";
  }
  
  // Fallback - general response
  else {
    return "Interesting perspective. The way I see it, the old systems were built to monetize catalogs, not empower creators. Sometimes the most innovative thing is removing friction, not adding features. Blocks. Beats. Bytes.";
  }
}

// Main function
function main() {
  console.log("🦞 Twitter Answers Generator - Response Crafting Agent\n");
  
  // Read context
  console.log("📚 Reading context...");
  const context = getContext();
  console.log(`Context loaded: ${path.basename(CONTEXT_FILE)} (${context.length} chars)\n`);
  
  // Read memory files
  console.log("📥 Reading memory files...");
  if (!existsSync(MEMORY_DIR)) {
    console.log("No memory directory found. Run 'npm run report' first.");
    return;
  }
  
  const memoryFiles = readdirSync(MEMORY_DIR).filter(f => f.endsWith(".memory.md"));
  console.log(`Found ${memoryFiles.length} memory file(s)\n`);
  
  // Process each memory file
  const allTweets: any[] = [];
  
  for (const filename of memoryFiles) {
    console.log(`Processing: ${filename}`);
    const content = readFileSync(path.join(MEMORY_DIR, filename), "utf-8");
    const tweets = parseMemoryFile(content, filename);
    allTweets.push({ filename, tweets });
    console.log(`  Found ${tweets.length} tweet(s)\n`);
  }
  
  // Generate responses
  const timestamp = new Date().toISOString().replace(/[:T.-]/g, "-");
  const randomId = Math.random().toString(36).substr(2, 5);
  const responseFile = `${RESPONSES_DIR}/${timestamp}-${randomId}.md`;
  
  const responses: string[] = [];
  
  for (const { filename, tweets } of allTweets) {
    for (const tweet of tweets) {
      const response = generateResponse(tweet);
      const intentUrl = generateIntentUrl(tweet.url, response);
      const metrics = formatMetrics(tweet.likes, tweet.retweets, tweet.replies, tweet.views);
      
      responses.push(`## @${tweet.authorHandle}

**Summary:** ${tweet.summary}

${metrics}

=========

${response}

[Reply to Tweet →](https://x.com/intent/tweet?in_reply_to=${tweet.url.split('/').pop()}&text=${encodeURIComponent(response)})

---

`);
      
      console.log(`  ✍️  @${tweet.authorHandle}: ${tweet.summary} [${metrics}]`);
    }
  }
  
  writeFileSync(responseFile, responses.join("\n\n"));
  
  console.log(`\n✅ Generated ${responses.length} response(s) in ./${RESPONSES_DIR}/${timestamp}-${randomId}.md`);
  console.log("\n📊 Features added:");
  console.log("   • Tweet metrics (likes, retweets, replies, views)");
  console.log("   • Twitter intent URLs for pre-filled replies");
  console.log("\n💡 Next step: Review responses or use the Quick Reply links!");
}

main();
