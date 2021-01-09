const { unauthorized } = require('@hapi/boom');
const colors = require('colors/safe');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local');
const config = require('../config');
const { User } = require('../models');

const authenticate = (req, state, next) => {
  let token;
  if (req.headers.authorization) {
    const [type, value] = req.headers.authorization.split(' ');
    if (type === 'Bearer') {
      token = value;
    }
  } else if (req.headers['sec-websocket-protocol']) {
    token = req.headers['sec-websocket-protocol'];
  } else if (req.query.auth) {
    token = req.query.auth;
  }
  if (!token) {
    next();
    return;
  }
  User
    .fromToken(token)
    .then((user) => {
      if (user) {
        state.user = user;
      }
      next();
    })
    .catch(next);
};

module.exports.authenticate = (req, res, next) => (
  authenticate(req, req, next)
);

module.exports.authenticateWS = (client, req, next) => (
  authenticate(req, client, next)
);

module.exports.requireAuth = (req, res, next) => (
  authenticate(req, req, (err) => {
    if (err || !req.user) {
      next(unauthorized(err));
      return;
    }
    next();
  })
);

module.exports.setup = () => {
  // Setup GoogleStrategy
  if (
    !config.googleAuth.clientID
    || !config.googleAuth.clientSecret
  ) {
    console.log(
      colors.red('\nMissing config:\n'),
      'You must provide both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to have user sessions.\n'
    );
    return;
  }
  passport.use(new GoogleStrategy(config.googleAuth, (accessToken, refreshToken, profile, done) => {
    const {
      displayName: name,
      emails,
      photos,
    } = profile;
    const [email] = emails
      .map(({ value }) => (value));
    const [photo] = photos
      .map(({ value }) => (value));
    User
      .findOrCreate(
        { email },
        {
          email,
          name,
          photo,
        }
      )
      .then((user) => done(null, user))
      .catch(done);
  }));

  // Setup LocalStrategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
  }, (email, password, done) => (
    User
      .findOne({ email })
      .then((user) => {
        if (!user) {
          return done(null, false);
        }
        return user
          .comparePassword(password)
          .then((isMatch) => {
            if (!isMatch) {
              done(null, false);
              return;
            }
            done(null, user);
          });
      })
      .catch(done)
  )));
};
