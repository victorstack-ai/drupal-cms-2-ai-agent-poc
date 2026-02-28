import { expect } from 'chai';
import nock from 'nock';
import { createDrupalClient } from '../src/drupalClient.js';
import { createDrupalTools } from '../src/actions.js';

describe('Drupal tools', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('lists content types from entrypoint', async () => {
    nock('https://cms.example')
      .get('/jsonapi')
      .reply(200, {
        links: {
          'node--article': { href: 'https://cms.example/jsonapi/node/article' },
          'node--page': { href: 'https://cms.example/jsonapi/node/page' }
        }
      });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });
    const tools = createDrupalTools(api);

    const types = await tools.listContentTypes();

    expect(types).to.deep.equal(['article', 'page']);
  });

  it('delegates updateNode to the client', async () => {
    const uuid = 'aaaa-1111';
    nock('https://cms.example')
      .patch(`/jsonapi/node/article/${uuid}`)
      .reply(200, { data: { id: uuid, type: 'node--article', attributes: { title: 'Updated' } } });

    const api = createDrupalClient({ baseUrl: 'https://cms.example', token: 't' });
    const tools = createDrupalTools(api);

    const result = await tools.updateNode('article', uuid, { title: 'Updated' });
    expect(result.data.attributes.title).to.equal('Updated');
  });

  it('delegates deleteNode to the client', async () => {
    const uuid = 'del-1234';
    nock('https://cms.example')
      .delete(`/jsonapi/node/article/${uuid}`)
      .reply(204, '');

    const api = createDrupalClient({ baseUrl: 'https://cms.example', token: 't' });
    const tools = createDrupalTools(api);

    const result = await tools.deleteNode('article', uuid);
    expect(result).to.equal(null);
  });

  it('delegates listUsers to the client', async () => {
    nock('https://cms.example')
      .get('/jsonapi/user/user')
      .reply(200, { data: [{ id: 'user-1', type: 'user--user' }] });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });
    const tools = createDrupalTools(api);

    const result = await tools.listUsers();
    expect(result.data).to.have.length(1);
  });

  it('delegates listTaxonomyTerms to the client', async () => {
    nock('https://cms.example')
      .get('/jsonapi/taxonomy_term/tags')
      .reply(200, { data: [{ id: 'term-1', attributes: { name: 'Drupal' } }] });

    const api = createDrupalClient({ baseUrl: 'https://cms.example' });
    const tools = createDrupalTools(api);

    const result = await tools.listTaxonomyTerms('tags');
    expect(result.data[0].attributes.name).to.equal('Drupal');
  });
});
