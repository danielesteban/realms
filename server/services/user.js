const { notFound, unauthorized } = require('@hapi/boom');
const { body, param } = require('express-validator');
const passport = require('passport');
const { checkValidationResult } = require('./errorHandler');
const config = require('../config');
const { User } = require('../models');

module.exports.authenticateWithGoogle = (req, res) => {
  passport.authenticate('google', (err, user) => {
    res.send(
      '<script>'
      + 'window.addEventListener("message",({origin,source})=>{'
      + `if(origin===${JSON.stringify(config.clientOrigin)}){`
      + ''
      + `source.postMessage({${(
        (err || !user) ? (
          'err:1'
        ) : (
          `${user.firstLogin ? 'firstLogin: 1, ' : ''}session:${JSON.stringify(user.issueToken())}`
        )
      )}},origin);`
      + 'window.close()'
      + '}'
      + '},false)'
      + '</script>'
    );
  })(req, res);
};

module.exports.login = [
  body('email')
    .isEmail()
    .normalizeEmail(),
  body('password')
    .not().isEmpty()
    .trim(),
  checkValidationResult,
  (req, res, next) => {
    passport.authenticate('local', (err, user) => {
      if (err || !user) {
        next(err || unauthorized());
        return;
      }
      res.json(user.issueToken());
    })(req, res);
  },
];

module.exports.loginWithGoogle = (
  passport.authenticate('google', {
    prompt: 'select_account',
    scope: 'email profile',
  })
);

module.exports.refreshSession = (req, res) => {
  res.json(req.user.issueToken());
};

module.exports.register = [
  body('email')
    .isEmail()
    .normalizeEmail(),
  body('name')
    .not().isEmpty()
    .isLength({ min: 1, max: 25 })
    .trim(),
  body('password')
    .not().isEmpty()
    .trim(),
  checkValidationResult,
  (req, res) => {
    const user = new User({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
    });
    user.save()
      .then(() => res.json(user.issueToken()))
      .catch(() => res.status(500).end());
  },
];

module.exports.updateProfile = [
  body('name')
    .not().isEmpty()
    .isLength({ min: 1, max: 25 })
    .trim(),
  checkValidationResult,
  (req, res) => {
    req.user.name = req.body.name;
    req.user.save()
      .then(() => res.json(req.user.issueToken()))
      .catch(() => res.status(500).end());
  },
];
