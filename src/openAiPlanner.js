import fetch from 'node-fetch';
import { createRuleBasedPlanner } from './ruleBasedPlanner.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ALLOWED_TOOLS = new Set(['listContentTypes', 'listNodes', 'createNode', 'createTaxonomyTerm']);

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Planner response did not contain a JSON object');
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
}

function parsePlannerPayload(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Planner response did not include message content');
  }

  const parsed = extractJsonObject(content);
  if (!Array.isArray(parsed.steps)) {
    throw new Error('Planner response must include a steps array');
  }

  return parsed.steps
    .filter((step) => step && ALLOWED_TOOLS.has(step.tool))
    .map((step) => ({
      tool: step.tool,
      args: Array.isArray(step.args) ? step.args : []
    }));
}

export function createOpenAiPlanner({
  apiKey,
  model = 'o3-mini',
  fetchImpl = fetch,
  fallbackPlanner = createRuleBasedPlanner()
} = {}) {
  return {
    async plan(goal) {
      if (!apiKey) {
        return fallbackPlanner.plan(goal);
      }

      const response = await fetchImpl(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a planner for a Drupal CMS JSON:API agent. Return strict JSON only with shape {"steps":[{"tool":"listContentTypes|listNodes|createNode|createTaxonomyTerm","args":[]}]}.'
            },
            {
              role: 'user',
              content: `Create a plan for this goal: ${goal}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};

      if (!response.ok) {
        const message = payload?.error?.message || response.statusText;
        throw new Error(`OpenAI API ${response.status} ${response.statusText}: ${message}`);
      }

      const steps = parsePlannerPayload(payload);
      if (!steps.length) {
        return fallbackPlanner.plan(goal);
      }

      return steps;
    }
  };
}
