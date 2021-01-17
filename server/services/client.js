const express = require('express');
const { param } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { checkValidationResult } = require('./errorHandler');
const { Realm } = require('../models');
const config = require('../config');

const clientPath = path.join(__dirname, '..', '..', 'client');

module.exports = (app) => {
  let index;
  const indexPath = path.join(clientPath, 'index.html');
  const loadIndex = () => {
    index = fs.readFileSync(indexPath, 'utf-8');
  };
  if (process.env.NODE_ENV !== 'production') {
    fs.watchFile(indexPath, loadIndex);
  }
  loadIndex();

  app.use('/', express.static(clientPath, config.production ? { maxAge: '10m' } : {}));

  app.get('/:slug', [
    param('slug')
      .not().isEmpty(),
    checkValidationResult,
    (req, res, next) => {
      Realm
        .findOne({ slug: `${req.params.slug}` })
        .select('name')
        .then((realm) => {
          if (!realm) {
            res.redirect(config.clientOrigin);
            return;
          }
          res
            .type('text/html')
            .send(
              index
                .replace(
                  '<meta property="og:title" content="realms" />',
                  `<meta property="og:title" content=${JSON.stringify(realm.name)} />`
                )
                .replace(
                  '<meta property="og:image" content="https://realms.gatunes.com/screenshot.png" />',
                  `<meta property="og:image" content="https://${req.headers.host}/realm/${realm._id}/screenshot" />`
                )
            );
        })
        .catch(next);
    },
  ]);
};
