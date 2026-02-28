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

    const api = createDrupalClient({ baseUrl: 'https://cms.example', maxRetries: 0 });

    try {
      await api.getEntryPoint();
      throw new Error('Expected failure');
    } catch (error) {
      expect(error.message).to.include('Forbidden');
    }
  });

  it('updates a node via PATCH', async () => {
    const uuid = 'aaaa-bbbb-cccc';
    nock('https://cms.example')
      .patch(`/jsonapi/node/article/${uuid}`, (body) => {
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        return payload?.data?.id === uuid && payload?.data?.attributes?.title === 'New title';
      })
      .reply(200, { data: { id: uuid, type: 'node--article', attributes: { title: 'New title' } } });

    const api = createDrupalClient({ baseUrl: 'https://cms.example', token: 't' });
    const result = await api.updateNode('article', uuid, { title: 'New title' });

    expect(result.data.attributes.title).to.equal('New title');
  });

  it('deletes a node via DELETE', async () => {
    const uuid = 'delete-me-id';
    nock('https://cms.example')
      .delete(`/jsonapi/node/article/${uuid}`)
      .reply(204, '');

    const api = createDrupalClient({ baseUrl: 'https://cms.example', token: 't' });
    const result = await api.deleteNode('article', uuid);

    expect(result).to.equal(null);
  });

  it('lists users', async () => {
    nock('https://cms.example')
      .get('/jsonapi/user/user')
      .reply(200, { data: [{ id: 'u1', type: 'user--user' }] });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });
    const result = await api.listUsers();

    expect(result.data).to.have.length(1);
    expect(result.data[0].id).to.equal('u1');
  });

  it('lists taxonomy terms', async () => {
    nock('https://cms.example')
      .get('/jsonapi/taxonomy_term/tags')
      .reply(200, { data: [{ id: 't1', type: 'taxonomy_term--tags', attributes: { name: 'Drupal' } }] });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });
    const result = await api.listTaxonomyTerms('tags');

    expect(result.data).to.have.length(1);
    expect(result.data[0].attributes.name).to.equal('Drupal');
  });

  describe('retry logic', () => {
    it('retries on 503 and succeeds on second attempt', async () => {
      nock('https://cms.example')
        .get('/jsonapi')
        .reply(503, { errors: [{ detail: 'Service Unavailable' }] });

      nock('https://cms.example')
        .get('/jsonapi')
        .reply(200, { links: { 'node--page': { href: '/jsonapi/node/page' } } });

      const api = createDrupalClient({
        baseUrl: 'https://cms.example',
        maxRetries: 2,
        retryDelayMs: 10
      });

      const result = await api.getEntryPoint();
      expect(result.links).to.have.property('node--page');
    });

    it('retries on 429 rate-limit and succeeds', async () => {
      nock('https://cms.example')
        .get('/jsonapi/user/user')
        .reply(429, { errors: [{ detail: 'Too Many Requests' }] });

      nock('https://cms.example')
        .get('/jsonapi/user/user')
        .reply(200, { data: [{ id: 'u1' }] });

      const api = createDrupalClient({
        baseUrl: 'https://cms.example',
        maxRetries: 1,
        retryDelayMs: 10
      });

      const result = await api.listUsers();
      expect(result.data).to.have.length(1);
    });

    it('throws after exhausting retries', async () => {
      nock('https://cms.example')
        .get('/jsonapi')
        .times(3)
        .reply(500, { errors: [{ detail: 'Internal Server Error' }] });

      const api = createDrupalClient({
        baseUrl: 'https://cms.example',
        maxRetries: 2,
        retryDelayMs: 10
      });

      try {
        await api.getEntryPoint();
        throw new Error('Expected failure');
      } catch (error) {
        expect(error.message).to.include('500');
      }
    });

    it('does not retry on 403 (non-retryable)', async () => {
      let callCount = 0;
      nock('https://cms.example')
        .get('/jsonapi')
        .reply(() => {
          callCount++;
          return [403, JSON.stringify({ errors: [{ detail: 'Forbidden' }] })];
        });

      const api = createDrupalClient({
        baseUrl: 'https://cms.example',
        maxRetries: 3,
        retryDelayMs: 10
      });

      try {
        await api.getEntryPoint();
        throw new Error('Expected failure');
      } catch (error) {
        expect(error.message).to.include('Forbidden');
        expect(callCount).to.equal(1);
      }
    });
  });
});
