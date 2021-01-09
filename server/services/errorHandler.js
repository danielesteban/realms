const { badData, boomify } = require('@hapi/boom');
const callsiteRecord = require('callsite-record');
const { validationResult } = require('express-validator');
const colors = require('colors/safe');
const config = require('../config');

module.exports.checkValidationResult = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    throw badData(result);
  }
  next();
};

module.exports.setup = (api) => {
  api.get('*', (req, res) => res.status(404).end());
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (!err.isBoom) {
      // Default error
      err = boomify(err);
    }
    res.status(err.output.statusCode).end();
    if (!config.production && !config.test && err.isServer) {
      const record = callsiteRecord({
        forError: err,
      });
      const stackFilter = (frame) => (
        !frame.getFileName().includes('node_modules')
      );
      console.log([
        '',
        colors.red((new Date()).toString()),
        colors.yellow(err.message),
        record.renderSync({
          stackFilter,
        }),
        '',
      ].join('\n'));
    }
  });
};
