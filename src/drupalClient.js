import fetch from 'node-fetch';

export function createDrupalClient({ baseUrl, token, userAgent }) {
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const agent = userAgent || 'drupal-cms-2-ai-agent-poc/0.1';

  async function request(path, options = {}) {
    const trimmed = path.startsWith('/') ? path : `/${path}`;
    const url = `${normalizedBase}${trimmed}`;
    const headers = {
      Accept: 'application/vnd.api+json',
      'User-Agent': agent,
      ...(options.headers || {})
    };

    if (options.body) {
      headers['Content-Type'] = 'application/vnd.api+json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const detail = data?.errors?.[0]?.detail || text || response.statusText;
      throw new Error(`Drupal API ${response.status} ${response.statusText}: ${detail}`);
    }

    return data;
  }

  return {
    request,
    getEntryPoint() {
      return request('/jsonapi');
    },
    listNodes(type) {
      return request(`/jsonapi/node/${type}`);
    },
    createNode(type, attributes) {
      return request(`/jsonapi/node/${type}`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: `node--${type}`,
            attributes
          }
        })
      });
    },
    createTaxonomyTerm(vocabulary, attributes) {
      return request(`/jsonapi/taxonomy_term/${vocabulary}`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: `taxonomy_term--${vocabulary}`,
            attributes
          }
        })
      });
    }
  };
}
