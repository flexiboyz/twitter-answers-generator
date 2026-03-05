# OpenClaw Agent Instructions

## Step 1 — Generate tweet reports

Run one or both modes to fetch tweets into memory files:

```bash
npm run report -- mode=account
npm run report -- mode=keywords
```

- `mode=account` reads all `.md` files from `./accounts_of_interest/` and fetches latest tweets for each listed account.
- `mode=keywords` reads all `.md` files from `./keywords_of_interest/` and searches tweets matching each listed keyword.

Output is written to `./memory/{filename}.memory.md`.

## Step 2 — Craft responses

After each run:

1. Read the context files from `./context/` to understand the tone, style, and knowledge base for responses.
2. Read each generated memory file from `./memory/`.
3. For every tweet in the memory file, craft a relevant response based on the context.
4. Write a new file named `{current_timestamp}.md` in the `./responses/` folder (e.g. `2026-03-05T14-30-00.md`).

### Response file format

Use `=========` as a separator between the original tweet and the generated response:

```
## @authorHandle

Original tweet text here

=========

Your crafted response here

---
```

Repeat for each tweet in the memory file.
