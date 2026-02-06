import { createDrupalClient } from './drupalClient.js';
import { createDrupalTools } from './actions.js';
import { DrupalCmsAgent } from './agent.js';
import { createRuleBasedPlanner } from './ruleBasedPlanner.js';

const goal = process.argv.slice(2).join(' ').trim();

if (!goal) {
  console.error('Usage: DRUPAL_BASE_URL=https://your-site node src/index.js "list content types"');
  process.exit(1);
}

const baseUrl = process.env.DRUPAL_BASE_URL || 'http://localhost';
const token = process.env.DRUPAL_TOKEN || '';

const client = createDrupalClient({
  baseUrl,
  token,
  userAgent: 'drupal-cms-2-ai-agent-poc/0.1'
});

const tools = createDrupalTools(client);
const agent = new DrupalCmsAgent({
  tools,
  model: createRuleBasedPlanner()
});

try {
  const results = await agent.run(goal);
  console.log(JSON.stringify({ goal, results }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
