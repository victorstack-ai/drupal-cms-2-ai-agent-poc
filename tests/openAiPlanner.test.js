import { expect } from 'chai';
import { createOpenAiPlanner } from '../src/openAiPlanner.js';

describe('OpenAI planner', () => {
  it('falls back to rule-based planner without API key', async () => {
    const planner = createOpenAiPlanner();
    const steps = await planner.plan('list content types');

    expect(steps).to.deep.equal([{ tool: 'listContentTypes', args: [] }]);
  });

  it('uses OpenAI and returns parsed tool steps', async () => {
    const requests = [];
    const fetchImpl = async (url, options) => {
      requests.push({ url, options: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async text() {
          return JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    steps: [{ tool: 'listContentTypes', args: [] }]
                  })
                }
              }
            ]
          });
        }
      };
    };

    const planner = createOpenAiPlanner({
      apiKey: 'test-key',
      fetchImpl
    });
    const steps = await planner.plan('list content types');

    expect(requests).to.have.length(1);
    expect(requests[0].url).to.equal('https://api.openai.com/v1/chat/completions');
    expect(requests[0].options.model).to.equal('o3-mini');
    expect(steps).to.deep.equal([{ tool: 'listContentTypes', args: [] }]);
  });

  it('accepts new tool names from OpenAI response', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  steps: [
                    { tool: 'listUsers', args: [] },
                    { tool: 'listTaxonomyTerms', args: ['tags'] },
                    { tool: 'updateNode', args: ['article', 'abc-123', { title: 'New' }] },
                    { tool: 'deleteNode', args: ['article', 'abc-123'] },
                    { tool: 'uploadMedia', args: ['node--article', 'field_image', 'data', 'photo.jpg'] }
                  ]
                })
              }
            }
          ]
        });
      }
    });

    const planner = createOpenAiPlanner({ apiKey: 'test-key', fetchImpl });
    const steps = await planner.plan('do many things');

    expect(steps).to.have.length(5);
    expect(steps.map((s) => s.tool)).to.deep.equal([
      'listUsers',
      'listTaxonomyTerms',
      'updateNode',
      'deleteNode',
      'uploadMedia'
    ]);
  });

  it('filters out unknown tools from OpenAI response', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  steps: [
                    { tool: 'listContentTypes', args: [] },
                    { tool: 'hackerTool', args: [] }
                  ]
                })
              }
            }
          ]
        });
      }
    });

    const planner = createOpenAiPlanner({ apiKey: 'test-key', fetchImpl });
    const steps = await planner.plan('try hack');

    expect(steps).to.have.length(1);
    expect(steps[0].tool).to.equal('listContentTypes');
  });
});
