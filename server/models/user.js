const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const config = require('../config');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    index: true,
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  password: String,
  photo: Buffer,
}, { timestamps: true });

UserSchema.pre('save', function onSave(next) {
  const user = this;
  const promises = [];
  if (user.isModified('password')) {
    promises.push(
      new Promise((resolve, reject) => (
        bcrypt.genSalt(5, (err, salt) => {
          if (err) return reject(err);
          return bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) return reject(err);
            user.password = hash;
            return resolve();
          });
        })
      ))
    );
  }
  if (user.isModified('photo')) {
    promises.push(
      sharp(user.photo)
        .rotate()
        .resize(100, 100)
        .jpeg({ quality: 85 })
        .toBuffer()
        .then((photo) => {
          user.photo = photo;
        })
    );
  }
  if (!promises.length) {
    return next();
  }
  return Promise
    .all(promises)
    .then(() => next())
    .catch(next);
});

UserSchema.methods = {
  comparePassword(candidatePassword) {
    const user = this;
    return new Promise((resolve, reject) => (
      bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(isMatch);
      })
    ));
  },
  issueToken() {
    return jwt.sign(
      {
        _id: this._id,
        name: this.name,
      },
      config.sessionSecret,
      { expiresIn: '7d' }
    );
  },
};

UserSchema.statics = {
  findOrCreate(selector, doc) {
    const User = this;
    return User
      .findOne(selector)
      .then((user) => {
        if (user) {
          return user;
        }
        const create = () => {
          user = new User(doc);
          user.photo = doc.photo;
          return user.save();
        };
        if (doc.photo && typeof doc.photo === 'string') {
          return fetch(doc.photo)
            .then((res) => res.buffer())
            .then((buffer) => {
              doc.photo = buffer;
              return create();
            });
        }
        return create();
      });
  },
  fromToken(token) {
    const User = this;
    return new Promise((resolve, reject) => (
      jwt.verify(token, config.sessionSecret, (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(User.findOne({ _id: decoded._id }));
      })
    ));
  },
};

module.exports = mongoose.model('User', UserSchema);
