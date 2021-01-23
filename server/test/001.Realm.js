const assert = require('assert');
const request = require('supertest');
const app = require('../main.js');

const testUser = app.get('testUser');

let anonymousRealm;

const testRealm = {
  name: 'Test Realm',
  slug: 'test-realm',
};
app.set('testRealm', testRealm);

describe('Create Realm', () => {
  it('POST /realm with authentication should return the realm slug', () => (
    request(app)
      .post('/realm')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        name: testRealm.name,
      })
      .expect(200)
      .then(({ body: slug }) => {
        assert(slug === testRealm.slug);
      })
  ));
  it('POST /realm without authentication should return the realm slug', () => (
    request(app)
      .post('/realm')
      .send()
      .expect(200)
      .then(({ body: slug }) => {
        assert(!!slug);
        anonymousRealm = slug;
      })
  ));
});

describe('List Realms', () => {
  it('GET /realms/latest/:page should return the realms list', () => (
    request(app)
      .get('/realms/latest/0')
      .expect(200)
      .then(({ body: { realms } }) => {
        assert(Array.isArray(realms));
        assert(realms[0].slug === anonymousRealm);
        assert(realms[1].name === testRealm.name);
        assert(realms[1].slug === testRealm.slug);
        testRealm._id = realms[1]._id;
      })
  ));
  it('GET /realms/popular/:page should return the realms list', () => (
    request(app)
      .get('/realms/popular/0')
      .expect(200)
      .then(({ body: { realms } }) => {
        assert(Array.isArray(realms));
        assert(realms[0]._id === testRealm._id);
        assert(realms[0].name === testRealm.name);
        assert(realms[0].slug === testRealm.slug);
      })
  ));
  it('GET /realms/user/:page without a token should return a 401', () => (
    request(app)
      .get('/realms/user/0')
      .expect(401)
  ));
  it('GET /realms/user/:page should return the user realms list', () => (
    request(app)
      .get('/realms/user/0')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200)
      .then(({ body: { realms } }) => {
        assert(Array.isArray(realms));
        assert(realms[0]._id === testRealm._id);
        assert(realms[0].name === testRealm.name);
        assert(realms[0].slug === testRealm.slug);
      })
  ));
});

describe('Fork Realm', () => {
  it('POST /realm/:id/fork with authentication should return the realm slug', () => (
    request(app)
      .post(`/realm/${testRealm._id}/fork`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send()
      .expect(200)
      .then(({ body: slug }) => {
        assert(!!slug);
      })
  ));
  it('POST /realm/:id/fork without authentication should return the realm slug', () => (
    request(app)
      .post(`/realm/${testRealm._id}/fork`)
      .send()
      .expect(200)
      .then(({ body: slug }) => {
        assert(!!slug);
      })
  ));
});
