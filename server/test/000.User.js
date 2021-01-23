process.env.NODE_ENV = 'test';

const assert = require('assert');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../main.js');

before((next) => {
  mongoose.connection.once('connected', () => {
    console.log('Wiping test db...');
    mongoose.connection.db
      .dropDatabase()
      .then(() => next())
      .catch(next);
  });
});

const testUser = {
  name: 'Test User',
  email: 'test@test.com',
  password: 'test',
};
app.set('testUser', testUser);

const getProfileFromToken = (token) => {
  const { iat, exp, ...profile } = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
  return profile;
};

describe('Sign-up User', () => {
  it('POST /user without params should return a 422', () => (
    request(app)
      .post('/user')
      .expect(422)
  ));
  it('POST /user should return a new session', () => (
    request(app)
      .post('/user')
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200)
      .then(({ body: token }) => {
        assert(!!token);
        const profile = getProfileFromToken(token);
        assert(profile.name === testUser.name);
        testUser.profile = profile;
      })
  ));
});

describe('Sign-in User', () => {
  it('PUT /user without params should return a 422', () => (
    request(app)
      .put('/user')
      .expect(422)
  ));
  it('PUT /user with a bad password should return a 401', () => (
    request(app)
      .put('/user')
      .send({
        email: testUser.email,
        password: 'badpassword',
      })
      .expect(401)
  ));
  it('PUT /user should return a new session', () => (
    request(app)
      .put('/user')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200)
      .then(({ body: token }) => {
        assert(!!token);
        const profile = getProfileFromToken(token);
        assert(profile._id === testUser.profile._id);
        assert(profile.name === testUser.name);
        testUser.token = token;
      })
  ));
});

describe('Refresh Session', () => {
  it('GET /user without a token should return a 401', () => (
    request(app)
      .get('/user')
      .expect(401)
  ));
  it('GET /user should return a session token', () => (
    request(app)
      .get('/user')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200)
      .then(({ body: token }) => {
        assert(!!token);
        const profile = getProfileFromToken(token);
        assert(profile._id === testUser.profile._id);
        assert(profile.name === testUser.name);
      })
  ));
});
