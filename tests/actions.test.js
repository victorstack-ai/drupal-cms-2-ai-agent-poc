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
});
