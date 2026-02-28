import fetch from 'node-fetch';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Determines whether a failed request should be retried.
 * Network errors and specific HTTP status codes are considered retryable.
 */
function isRetryable(error, response) {
  if (!response) {
    return true; // network / fetch-level error
  }
  return RETRYABLE_STATUS_CODES.has(response.status);
}

/**
 * Waits for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createDrupalClient({
  baseUrl,
  token,
  userAgent,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  fetchImpl = fetch
} = {}) {
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const agent = userAgent || 'drupal-cms-2-ai-agent-poc/0.1';

  /**
   * Sends a request to the Drupal JSON:API with automatic retry on transient failures.
   * Uses exponential back-off: retryDelayMs * 2^attempt.
   */
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

    const fetchOptions = { ...options, headers };

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchImpl(url, fetchOptions);

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
          const detail = data?.errors?.[0]?.detail || text || response.statusText;
          const err = new Error(`Drupal API ${response.status} ${response.statusText}: ${detail}`);
          err.statusCode = response.status;

          if (attempt < maxRetries && isRetryable(null, response)) {
            lastError = err;
            await sleep(retryDelayMs * Math.pow(2, attempt));
            continue;
          }

          throw err;
        }

        return data;
      } catch (error) {
        if (error.statusCode) {
          // Already handled above – rethrow non-retryable HTTP errors.
          throw error;
        }

        // Network-level error (DNS failure, connection reset, etc.)
        lastError = error;

        if (attempt < maxRetries && isRetryable(error, null)) {
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }

        throw error;
      }
    }

    // Fallback – should not be reached but guards against logic bugs.
    throw lastError;
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

    updateNode(type, id, attributes) {
      return request(`/jsonapi/node/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: `node--${type}`,
            id,
            attributes
          }
        })
      });
    },

    deleteNode(type, id) {
      return request(`/jsonapi/node/${type}/${id}`, {
        method: 'DELETE'
      });
    },

    listUsers() {
      return request('/jsonapi/user/user');
    },

    listTaxonomyTerms(vocabulary) {
      return request(`/jsonapi/taxonomy_term/${vocabulary}`);
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
    },

    /**
     * Uploads a file to Drupal via the JSON:API binary file upload endpoint.
     *
     * @param {string} entityType - e.g. "node--article"
     * @param {string} fieldName - e.g. "field_image"
     * @param {Buffer|string} fileData - raw file content
     * @param {string} fileName - e.g. "photo.jpg"
     */
    uploadMedia(entityType, fieldName, fileData, fileName) {
      const trimmedType = entityType.replace('--', '/');
      return request(`/jsonapi/${trimmedType}/${fieldName}`, {
        method: 'POST',
        body: fileData,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `file; filename="${fileName}"`
        }
      });
    }
  };
}
