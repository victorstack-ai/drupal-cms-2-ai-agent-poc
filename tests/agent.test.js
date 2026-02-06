import { expect } from 'chai';
import { DrupalCmsAgent } from '../src/agent.js';
import { createRuleBasedPlanner } from '../src/ruleBasedPlanner.js';

describe('DrupalCmsAgent', () => {
  it('runs planned steps with tools', async () => {
    const tools = {
      listContentTypes: async () => ['article']
    };
    const agent = new DrupalCmsAgent({ tools, model: createRuleBasedPlanner() });

    const results = await agent.run('list content types');

    expect(results).to.have.length(1);
    expect(results[0].step.tool).to.equal('listContentTypes');
    expect(results[0].result).to.deep.equal(['article']);
  });

  it('throws on unknown tool', async () => {
    const tools = {};
    const agent = new DrupalCmsAgent({ tools, model: createRuleBasedPlanner() });

    try {
      await agent.run('list content types');
      throw new Error('Expected failure');
    } catch (error) {
      expect(error.message).to.include('Unknown tool');
    }
  });
});
