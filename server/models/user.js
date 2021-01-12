const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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
}, { timestamps: true });

UserSchema.pre('save', function onSave(next) {
  const user = this;
  if (user.isModified('password')) {
    return bcrypt.genSalt(5, (err, salt) => {
      if (err) {
        return next(err);
      }
      return bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          return next(err);
        }
        user.password = hash;
        return next();
      });
    });
  }
  return next();
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
        user = new User(doc);
        return user.save()
          .then(() => {
            user.firstLogin = true;
            return user;
          });
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
