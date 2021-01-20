const nocache = require('nocache');
const { authenticate, authenticateWS, requireAuth } = require('./services/passport');
const menu = require('./services/menu');
const realm = require('./services/realm');
const user = require('./services/user');

const preventCache = nocache();

module.exports = (api) => {
  // Menu

  api.ws(
    '/menu',
    menu.onClient
  );

  // Realms

  api.ws(
    '/realm/:slug',
    authenticateWS,
    realm.onClient
  );

  api.post(
    '/realm',
    preventCache,
    authenticate,
    realm.create
  );

  api.post(
    '/realm/:id/fork',
    preventCache,
    authenticate,
    realm.fork
  );

  api.get(
    '/realm/:id/screenshot',
    realm.getScreenshot
  );

  // Listings

  api.get(
    '/realms/latest/:page',
    preventCache,
    realm.list('latest')
  );

  api.get(
    '/realms/popular/:page',
    preventCache,
    realm.list('popular')
  );

  api.get(
    '/realms/user/:page',
    preventCache,
    requireAuth,
    realm.list('user')
  );

  // User

  api.post(
    '/user',
    preventCache,
    user.register
  );

  api.put(
    '/user',
    preventCache,
    user.login
  );

  api.get(
    '/user',
    preventCache,
    requireAuth,
    user.refreshSession
  );

  api.put(
    '/user/profile',
    preventCache,
    requireAuth,
    user.updateProfile
  );

  api.get(
    '/user/google',
    preventCache,
    user.loginWithGoogle
  );

  api.get(
    '/user/google/authenticate',
    preventCache,
    user.authenticateWithGoogle
  );
};
