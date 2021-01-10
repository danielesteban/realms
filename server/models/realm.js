const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');
const Generators = require('../generators');
const Screenshots = require('../services/screenshots');

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
  ambient: { type: Number, default: 0x050505 },
  background: { type: Number, default: 0x0c0c0c },
  light1: { type: Number, default: 0xbfbfbf },
  light2: { type: Number, default: 0x7f7f7f },
  light3: { type: Number, default: 0x3f3f3f },
  light4: { type: Number, default: 0x1f1f1f },
  screenshot: Buffer,
  slug: { type: String, slug: 'name', unique: true },
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
  if (
    realm.needsScreeenshot
    && realm.isSelected('ambient')
    && realm.isSelected('background')
    && realm.isSelected('light1')
    && realm.isSelected('light2')
    && realm.isSelected('light3')
    && realm.isSelected('light4')
    && realm.isSelected('voxels')
  ) {
    realm.updateScreenshot();
  }
});

RealmSchema.methods = {
  updateScreenshot() {
    const realm = this;
    return Screenshots.update(realm);
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

RealmSchema.plugin(slug);

module.exports = mongoose.model('Realm', RealmSchema);
