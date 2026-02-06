export function createDrupalTools(client) {
  return {
    async listContentTypes() {
      const entry = await client.getEntryPoint();
      const links = entry?.links || {};
      return Object.keys(links)
        .filter((key) => key.startsWith('node--'))
        .map((key) => key.replace('node--', ''))
        .sort();
    },
    async listNodes(type) {
      return client.listNodes(type);
    },
    async createNode(type, attributes) {
      return client.createNode(type, attributes);
    },
    async createTaxonomyTerm(vocabulary, attributes) {
      return client.createTaxonomyTerm(vocabulary, attributes);
    }
  };
}
