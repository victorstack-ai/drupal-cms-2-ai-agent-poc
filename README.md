# Drupal CMS 2.0 AI Agent POC

Small proof-of-concept agent that uses Drupal CMS 2.0 JSON:API endpoints (the same core JSON:API that ships with Drupal 11) to plan and execute actions like listing content types and creating drafts.

## What it does

- Uses Drupal JSON:API entrypoint (`/jsonapi`) to discover content types.
- Lists nodes or creates draft articles via JSON:API.
- Provides a tiny rule-based planner to decide which tool to run.

## Quick start

```bash
npm install
DRUPAL_BASE_URL=https://your-drupal-site \
DRUPAL_TOKEN=your_bearer_token \
node src/index.js "list content types"
```

Examples:

```bash
node src/index.js "list articles"
node src/index.js "create draft article title: \"AI notes\""
```

## Notes

- For authenticated writes, provide a token via `DRUPAL_TOKEN`.
- The POC is designed to be minimal and easy to extend with a real LLM planner.

## License

MIT
