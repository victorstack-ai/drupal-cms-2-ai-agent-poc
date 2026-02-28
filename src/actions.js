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

    async updateNode(type, id, attributes) {
      return client.updateNode(type, id, attributes);
    },

    async deleteNode(type, id) {
      return client.deleteNode(type, id);
    },

    async listUsers() {
      return client.listUsers();
    },

    async listTaxonomyTerms(vocabulary) {
      return client.listTaxonomyTerms(vocabulary);
    },

    async createTaxonomyTerm(vocabulary, attributes) {
      return client.createTaxonomyTerm(vocabulary, attributes);
    },

    async uploadMedia(entityType, fieldName, fileData, fileName) {
      return client.uploadMedia(entityType, fieldName, fileData, fileName);
    }
  };
}
