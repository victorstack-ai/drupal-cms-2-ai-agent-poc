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

      if (normalized.includes('list users')) {
        steps.push({ tool: 'listUsers', args: [] });
      }

      if (normalized.includes('list taxonomy') || normalized.includes('list terms')) {
        const vocabMatch = goal.match(/vocabulary\s*[:=]\s*"?([^\s",]+)"?/i);
        const vocab = vocabMatch ? vocabMatch[1] : 'tags';
        steps.push({ tool: 'listTaxonomyTerms', args: [vocab] });
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

      if (normalized.includes('update node') || normalized.includes('update article')) {
        steps.push({
          tool: 'updateNode',
          args: [
            'article',
            goal.match(/id\s*[:=]\s*"?([^\s",]+)"?/i)?.[1] || 'unknown',
            { title: extractTitle(goal) }
          ]
        });
      }

      if (normalized.includes('delete node') || normalized.includes('delete article')) {
        steps.push({
          tool: 'deleteNode',
          args: [
            'article',
            goal.match(/id\s*[:=]\s*"?([^\s",]+)"?/i)?.[1] || 'unknown'
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
