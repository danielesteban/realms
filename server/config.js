const dotenv = require('dotenv');

dotenv.config();

const production = process.env.NODE_ENV === 'production';
const test = process.env.NODE_ENV === 'test';

const sessionSecret = process.env.SESSION_SECRET || 'superunsecuresecret';
if (
  production
  && sessionSecret === 'superunsecuresecret'
) {
  console.warn('\nSecurity warning:\nYou must provide a random SESSION_SECRET.\n');
}

module.exports = {
  clientOrigin: process.env.CLIENT_ORIGIN || 'https://localhost:5000',
  googleAuth: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_AUTH_CALLBACK || 'http://localhost:8081/user/google/authenticate',
  },
  mongoURI: (
    process.env.MONGO_URI
    || `mongodb://localhost/realmsvr${test ? '-test' : ''}`
  ),
  port: test ? 0 : (process.env.PORT || 8081),
  production,
  sessionSecret,
  test,
};
