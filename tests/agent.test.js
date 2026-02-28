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

  it('plans and runs listUsers goal', async () => {
    const tools = {
      listUsers: async () => [{ id: 'u1', name: 'admin' }]
    };
    const agent = new DrupalCmsAgent({ tools, model: createRuleBasedPlanner() });

    const results = await agent.run('list users');

    expect(results).to.have.length(1);
    expect(results[0].step.tool).to.equal('listUsers');
    expect(results[0].result[0].name).to.equal('admin');
  });

  it('plans and runs listTaxonomyTerms goal', async () => {
    const tools = {
      listTaxonomyTerms: async () => [{ id: 't1', name: 'Drupal' }]
    };
    const agent = new DrupalCmsAgent({ tools, model: createRuleBasedPlanner() });

    const results = await agent.run('list taxonomy terms vocabulary: "tags"');

    expect(results).to.have.length(1);
    expect(results[0].step.tool).to.equal('listTaxonomyTerms');
  });

  it('requires tools and model', () => {
    expect(() => new DrupalCmsAgent({ model: {} })).to.throw('tools are required');
    expect(() => new DrupalCmsAgent({ tools: {} })).to.throw('model is required');
  });
});
