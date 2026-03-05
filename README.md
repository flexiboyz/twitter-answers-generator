# Twitter Answers Generator

An autonomous agent workflow that:
1. Fetches tweets from tracked accounts/keywords
2. Generates context-aware responses based on NEARD philosophy
3. Posts suggested replies to this Telegram topic

## Setup

```bash
npm install
```

## Environment

Create a `.env` file with:
```
TWITTER_API_KEY=your_api_key
SEARCH_KEYWORDS=AI,crypto,startup
```

## Workflow

### Step 1: Fetch Tweets
```bash
# Fetch tweets from tracked accounts
npm run report -- mode=account

# Fetch tweets matching keywords
npm run report -- mode=keywords
```

Input: `./accounts_of_interest/*.md` and `./keywords_of_interest/*.md`
Output: `./memory/{name}.memory.md`

### Step 2: Generate Responses
```bash
npm run generate-responses
```

Reads memory files + context from `./context/neard.vision.md`
Output: `./responses/{timestamp}.md` per response

### Step 3: Review & Approve
Check `./responses/` folder for generated replies
Decide which ones to post or approve

## File Structure

- `memory/` - Stored tweets (prevents duplicates)
- `responses/` - Generated response drafts
- `context/neard.vision.md` - NEARD documentation (tone/style guide)
- `accounts_of_interest/*.md` - Twitter accounts to track
- `keywords_of_interest/*.md` - Keywords to search

## Agent Orchestration

This project is controlled by an OpenClaw agent that:
- Runs the fetch scripts automatically
- Generates responses based on NEARD context
- Reports results to Telegram topic #297

## Philosophy

Per NEARD context: "Blocks. Beats. Bytes." - Direct artist-to-listener payments, no token, no middlemen. Just utility.
