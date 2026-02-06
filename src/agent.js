export class DrupalCmsAgent {
  constructor({ tools, model }) {
    if (!tools) {
      throw new Error('tools are required');
    }
    if (!model) {
      throw new Error('model is required');
    }
    this.tools = tools;
    this.model = model;
  }

  async plan(goal) {
    return this.model.plan(goal);
  }

  async run(goal) {
    const steps = await this.plan(goal);
    const results = [];

    for (const step of steps) {
      const toolFn = this.tools[step.tool];
      if (!toolFn) {
        throw new Error(`Unknown tool: ${step.tool}`);
      }

      const result = await toolFn(...(step.args || []));
      results.push({ step, result });
    }

    return results;
  }
}
