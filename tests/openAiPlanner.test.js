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
});
