# Drupal CMS 2.0 AI Agent POC

Small proof-of-concept agent that uses Drupal CMS 2.0 JSON:API endpoints (the same core JSON:API that ships with Drupal 11) to plan and execute actions like listing content types and creating drafts.

## What it does

- Uses Drupal JSON:API entrypoint (`/jsonapi`) to discover content types.
- Lists nodes or creates draft articles via JSON:API.
- Connects to OpenAI `o3-mini` for planning and falls back to a local rule-based planner.

## Quick start

```bash
npm install
DRUPAL_BASE_URL=https://your-drupal-site \
DRUPAL_TOKEN=your_bearer_token \
OPENAI_API_KEY=your_openai_key \
OPENAI_MODEL=o3-mini \
node src/index.js "list content types"
```

Examples:

```bash
node src/index.js "list articles"
node src/index.js "create draft article title: \"AI notes\""
```

## Notes

- For authenticated writes, provide a token via `DRUPAL_TOKEN`.
- If `OPENAI_API_KEY` is missing, planning falls back to local rules.
- Maintained Drupal modules already exist for in-Drupal AI workflows (for example, the Drupal AI ecosystem on drupal.org). This POC stays custom because it solves a different problem: an external agent connector that plans tasks and executes JSON:API actions from outside Drupal runtime.

## License

MIT
