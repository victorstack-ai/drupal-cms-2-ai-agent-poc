import { expect } from 'chai';
import nock from 'nock';
import { createDrupalClient } from '../src/drupalClient.js';

describe('Drupal client', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('creates a node with JSON:API payload', async () => {
    nock('https://cms.example')
      .post('/jsonapi/node/article', (body) => {
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        return payload?.data?.type === 'node--article';
      })
      .reply(201, { data: { id: '1', type: 'node--article' } });

    const api = createDrupalClient({ baseUrl: 'https://cms.example', token: 'token-123' });
    const response = await api.createNode('article', { title: 'Draft', status: false });

    expect(response.data.type).to.equal('node--article');
  });

  it('throws helpful errors on non-200', async () => {
    nock('https://cms.example')
      .get('/jsonapi')
      .reply(403, { errors: [{ detail: 'Forbidden' }] });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });

    try {
      await api.getEntryPoint();
      throw new Error('Expected failure');
    } catch (error) {
      expect(error.message).to.include('Forbidden');
    }
  });
});
