const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');
const Generators = require('../generators');
const Screenshots = require('../services/screenshots');

const Light = ({ band = 0, color = 0 }) => ({
  band: { type: Number, default: band },
  color: { type: Number, default: color },
});

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
  ambient: Light({ color: 0x050505 }),
  background: Light({ color: 0x0c0c0c }),
  light1: Light({ color: 0xbfbfbf }),
  light2: Light({ color: 0x7f7f7f }),
  light3: Light({ color: 0x3f3f3f }),
  light4: Light({ color: 0x1f1f1f }),
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
    this.isModified('ambient.color')
    || this.isModified('background.color')
    || this.isModified('light1.color')
    || this.isModified('light2.color')
    || this.isModified('light3.color')
    || this.isModified('light4.color')
    || this.isModified('voxels')
  );
  next();
});

RealmSchema.post('save', function onSaved() {
  const realm = this;
  if (
    realm.needsScreeenshot
    && realm.isSelected('ambient.color')
    && realm.isSelected('background.color')
    && realm.isSelected('light1.color')
    && realm.isSelected('light2.color')
    && realm.isSelected('light3.color')
    && realm.isSelected('light4.color')
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
