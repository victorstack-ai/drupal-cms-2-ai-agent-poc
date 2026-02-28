# Drupal CMS 2.0 AI Agent POC

A proof-of-concept Node.js agent that connects to any Drupal CMS site through its
JSON:API endpoints and uses an AI planner (OpenAI) to decompose natural-language
goals into concrete API actions. When no OpenAI key is available the agent falls
back to a built-in rule-based planner so it can run entirely offline.

## Why this exists

Maintained Drupal modules already exist for in-Drupal AI workflows (for example,
the [Drupal AI ecosystem on drupal.org](https://www.drupal.org/project/ai)). This
POC stays intentionally **external** because it solves a different problem: an
outside agent that plans tasks and executes JSON:API actions from outside the
Drupal runtime, treating Drupal purely as a headless content back-end.

## Architecture

```
 +-----------+       +-------------------+       +----------------+
 |  CLI /    | goal  |   DrupalCmsAgent  | steps |  OpenAI / Rule |
 |  Caller   +-------> (agent.js)        +-------> Based Planner  |
 +-----------+       +--------+----------+       +----------------+
                              |
                     execute each step
                              |
                     +--------v----------+
                     |   Action Layer    |
                     |   (actions.js)    |
                     +--------+----------+
                              |
                     +--------v----------+       +----------------+
                     |  Drupal Client    | HTTP  |  Drupal CMS    |
                     |  (drupalClient.js)+-------> JSON:API        |
                     |  retry + backoff  |       |  /jsonapi/*    |
                     +-------------------+       +----------------+
```

1. **index.js** -- CLI entry point. Reads environment variables, wires
   dependencies, and prints results as JSON.
2. **agent.js** -- Orchestrator. Accepts a goal string, asks the planner for
   steps, and executes each step through the action layer.
3. **openAiPlanner.js** -- Sends the goal to OpenAI and parses the response into
   a list of tool calls. Falls back to `ruleBasedPlanner.js` when no API key is
   set or the response is empty.
4. **ruleBasedPlanner.js** -- Simple keyword-matching planner for offline use.
5. **actions.js** -- Maps tool names to Drupal client calls. This is the layer
   you extend when adding new capabilities.
6. **drupalClient.js** -- Low-level HTTP client for Drupal JSON:API with
   automatic retry and exponential back-off on transient failures (408, 429,
   5xx).

## Available actions

| Action               | Tool name            | Description                                    |
|----------------------|----------------------|------------------------------------------------|
| List content types   | `listContentTypes`   | Discovers node bundles from `/jsonapi`          |
| List nodes           | `listNodes`          | Lists nodes of a given content type             |
| Create node          | `createNode`         | Creates a new node (e.g. draft article)         |
| Update node          | `updateNode`         | Updates an existing node by UUID                |
| Delete node          | `deleteNode`         | Deletes a node by UUID                          |
| List users           | `listUsers`          | Lists user accounts via JSON:API                |
| List taxonomy terms  | `listTaxonomyTerms`  | Lists terms in a vocabulary                     |
| Create taxonomy term | `createTaxonomyTerm` | Creates a term in a vocabulary                  |
| Upload media         | `uploadMedia`        | Uploads a binary file to a Drupal entity field  |

## Requirements

- Node.js >= 14.17.0
- A running Drupal 10/11 site with JSON:API enabled (core module, enabled by default)
- (Optional) An OpenAI API key for AI-powered planning

## Installation

```bash
git clone https://github.com/<your-org>/drupal-cms-2-ai-agent-poc.git
cd drupal-cms-2-ai-agent-poc
npm install
```

## Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

| Variable          | Required | Default       | Description                              |
|-------------------|----------|---------------|------------------------------------------|
| `DRUPAL_BASE_URL` | Yes      | `http://localhost` | Base URL of your Drupal site        |
| `DRUPAL_TOKEN`    | No       | (empty)       | OAuth / Bearer token for authenticated requests |
| `OPENAI_API_KEY`  | No       | (empty)       | OpenAI API key; omit to use rule-based planner |
| `OPENAI_MODEL`    | No       | `o3-mini`     | OpenAI model to use for planning         |

## Usage examples

```bash
# List all content types
node src/index.js "list content types"

# List articles
node src/index.js "list articles"

# Create a draft article
node src/index.js 'create draft article title: "AI notes"'

# Update an existing article
node src/index.js 'update article id: "a1b2c3" title: "Updated title"'

# Delete a node
node src/index.js 'delete article id: "a1b2c3"'

# List users
node src/index.js "list users"

# List taxonomy terms
node src/index.js 'list taxonomy terms vocabulary: "tags"'
```

### Using environment variables inline

```bash
DRUPAL_BASE_URL=https://my-drupal-site.com \
DRUPAL_TOKEN=my_bearer_token \
node src/index.js "list content types"
```

## Running tests

```bash
npm test
```

Tests use [Mocha](https://mochajs.org/) + [Chai](https://www.chaijs.com/) with
[nock](https://github.com/nock/nock) for HTTP mocking. No real Drupal instance is
required.

## Extending with custom actions

1. **Add a client method** in `src/drupalClient.js`:

   ```js
   listComments(nodeType, nodeId) {
     return request(`/jsonapi/comment/comment?filter[entity_id.id]=${nodeId}`);
   }
   ```

2. **Expose it as a tool** in `src/actions.js`:

   ```js
   async listComments(nodeType, nodeId) {
     return client.listComments(nodeType, nodeId);
   }
   ```

3. **Register the tool name** in `src/openAiPlanner.js` by adding it to the
   `ALLOWED_TOOLS` set and updating the system prompt so the LLM knows about it.

4. **(Optional)** Add a keyword rule in `src/ruleBasedPlanner.js` for offline
   fallback.

## Error recovery

The Drupal client includes automatic retry with exponential back-off for
transient failures:

- **Retryable status codes**: 408, 429, 500, 502, 503, 504
- **Network errors**: DNS failures, connection resets, timeouts
- **Default retries**: 3 attempts with 500 ms base delay (500 ms, 1 s, 2 s)
- Configurable via `maxRetries` and `retryDelayMs` options passed to
  `createDrupalClient()`.

## License

[MIT](LICENSE) -- Copyright (c) 2025 Victor Jimenez
