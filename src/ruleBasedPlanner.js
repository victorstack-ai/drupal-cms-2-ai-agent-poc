function extractTitle(goal) {
  const match = goal.match(/title\s*[:=]\s*"([^"]+)"/i) || goal.match(/title\s*[:=]\s*([^,]+)/i);
  return match ? match[1].trim() : 'Draft from agent';
}

export function createRuleBasedPlanner() {
  return {
    async plan(goal) {
      const normalized = goal.toLowerCase();
      const steps = [];

      if (normalized.includes('list content types')) {
        steps.push({ tool: 'listContentTypes', args: [] });
      }

      if (normalized.includes('list articles')) {
        steps.push({ tool: 'listNodes', args: ['article'] });
      }

      if (normalized.includes('create draft') || normalized.includes('draft article')) {
        steps.push({
          tool: 'createNode',
          args: [
            'article',
            {
              title: extractTitle(goal),
              status: false
            }
          ]
        });
      }

      if (steps.length === 0) {
        steps.push({
          tool: 'listContentTypes',
          args: []
        });
      }

      return steps;
    }
  };
}
