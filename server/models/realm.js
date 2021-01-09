const mongoose = require('mongoose');
const URLSlugs = require('mongoose-url-slugs');
// const config = require('../config');
const Generators = require('../generators');
// const Screenshots = require('../screenshots');

const RealmSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  name: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  depth: { type: Number, required: true },
  ambient: {
    r: { type: Number, default: 0.02 },
    g: { type: Number, default: 0.02 },
    b: { type: Number, default: 0.02 },
  },
  background: {
    r: { type: Number, default: 0.05 },
    g: { type: Number, default: 0.05 },
    b: { type: Number, default: 0.05 },
  },
  light1: {
    r: { type: Number, default: 0.75 },
    g: { type: Number, default: 0.75 },
    b: { type: Number, default: 0.75 },
  },
  light2: {
    r: { type: Number, default: 0.5 },
    g: { type: Number, default: 0.5 },
    b: { type: Number, default: 0.5 },
  },
  light3: {
    r: { type: Number, default: 0.25 },
    g: { type: Number, default: 0.25 },
    b: { type: Number, default: 0.25 },
  },
  light4: {
    r: { type: Number, default: 0.125 },
    g: { type: Number, default: 0.125 },
    b: { type: Number, default: 0.125 },
  },
  screenshot: Buffer,
  views: {
    type: Number,
    default: 0,
    index: -1,
  },
  voxels: { type: Buffer, required: true },
  createdAt: { type: Date, index: -1 },
  updatedAt: Date,
}, { timestamps: true });

RealmSchema.pre('save', function onSave(next) {
  this.needsScreeenshot = (
    this.isModified('ambient')
    || this.isModified('background')
    || this.isModified('light1')
    || this.isModified('light2')
    || this.isModified('light3')
    || this.isModified('light4')
    || this.isModified('voxels')
  );
  next();
});

RealmSchema.post('save', function onSaved() {
  const realm = this;
  if (realm.needsScreeenshot) {
    realm.updateScreenshot();
  }
});

RealmSchema.methods = {
  updateScreenshot() {
    // const realm = this;
    // return Screenshots.update({
    //   model: realm,
    //   url: `${config.clientOrigin}/${realm.slug}`,
    // });
  },
};

RealmSchema.statics = {
  generateVoxels({
    generator,
    width,
    height,
    depth,
  }) {
    generator = (Generators[generator] || (() => () => (0)))({ width, height, depth });
    const voxels = Buffer.alloc(width * height * depth * 4);
    const air = [0, 0, 0, 0];
    for (let z = 0, i = 0; z < depth; z += 1) {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1, i += 4) {
          voxels.set(generator({ x, y, z }) || air, i);
        }
      }
    }
    return voxels;
  },
};

RealmSchema.plugin(URLSlugs(['name']));

module.exports = mongoose.model('Realm', RealmSchema);
