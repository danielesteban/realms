const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const expressWS = require('express-ws');
const fs = require('fs');
const helmet = require('helmet');
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const multer = require('multer');
const config = require('./config');
const setupEndpoints = require('./endpoints');
const { setup: setupErrorHandler } = require('./services/errorHandler');
const { setup: setupPassport } = require('./services/passport');

// Setup mongoose
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connection.on('error', console.error);
mongoose.connection.on('disconnected', () => mongoose.connect(config.mongoURI));
mongoose.connect(config.mongoURI);

// Setup express
const app = express();
const server = (process.env.TLS_KEY && process.env.TLS_CERT ? https : http).createServer({
  key: process.env.TLS_KEY ? fs.readFileSync(process.env.TLS_KEY) : undefined,
  cert: process.env.TLS_CERT ? fs.readFileSync(process.env.TLS_CERT) : undefined,
}, app).listen(process.env.PORT || 8081, () => (
  console.log(`Listening on port: ${server.address().port}`)
));
app.set('trust proxy', 'loopback');
app.set('multer', multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1048576, // 1mb
  },
}));
app.use(bodyParser.json({
  limit: '1mb',
}));
app.use(cors({ origin: config.clientOrigin }));
if (config.production) {
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
}
expressWS(app, server, { clientTracking: false });
setupPassport();
setupEndpoints(app);
setupErrorHandler(app);

// Graceful shutdown
const shutdown = () => (
  server.close(() => (
    mongoose.connection.close(
      false,
      () => process.exit(0)
    )
  ))
);
process
  .on('SIGTERM', shutdown)
  .on('SIGINT', shutdown);

module.exports = app;
