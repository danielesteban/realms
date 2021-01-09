const Room = require('./room');

class RealmRoom extends Room {
  constructor(realm) {
    super({});
    this.realm = realm;
  }

  onInit(client, payload) {
    const {
      _doc: {
        _id,
        creator,
        voxels,
        ...meta
      },
    } = this.realm;

    client.isCreator = !!(
      client.user
      && creator._id.equals(client.user._id)
    );

    if (
      !client.isCreator
      && !client.isHeadless
    ) {
      this.realm.views += 1;
      this.realm.save().catch(Room.noop);
    }

    return {
      ...payload,
      json: {
        ...payload.json,
        ...meta,
        creator: creator.name,
        isCreator: client.isCreator,
      },
      buffer: voxels,
    };
  }

  static sanitizeColor(input) {
    if (!input) {
      return false;
    }
    const color = {
      r: parseFloat(`${input.r}`),
      g: parseFloat(`${input.g}`),
      b: parseFloat(`${input.b}`),
    };
    if (
      Number.isNaN(color.r)
      || Number.isNaN(color.g)
      || Number.isNaN(color.b)
    ) {
      return false;
    }
    return color;
  }

  onRequest(client, request) {
    super.onRequest(client, request);
    const { realm } = this;
    const { sanitizeColor } = RealmRoom;
    switch (request.type) {
      case 'META': {
        // if (!client.isCreator) {
        //   return;
        // }
        let {
          name,
          background,
          ambient,
          light1,
          light2,
          light3,
          light4,
        } = request.json || {};
        name = `${name || ''}`;
        background = sanitizeColor(background);
        ambient = sanitizeColor(ambient);
        light1 = sanitizeColor(light1);
        light2 = sanitizeColor(light2);
        light3 = sanitizeColor(light3);
        light4 = sanitizeColor(light4);
        if (
          !name && !background && !ambient && !light1 && !light2 && !light3 && !light4
        ) {
          return;
        }
        if (name) realm.name = name;
        if (background) realm.background = background;
        if (ambient) realm.ambient = ambient;
        if (light1) realm.light1 = light1;
        if (light2) realm.light2 = light2;
        if (light3) realm.light3 = light3;
        if (light4) realm.light4 = light4;
        this.broadcast({
          type: 'META',
          json: {
            ...(name ? { name } : {}),
            ...(background ? { background } : {}),
            ...(ambient ? { ambient } : {}),
            ...(light1 ? { light1 } : {}),
            ...(light2 ? { light2 } : {}),
            ...(light3 ? { light3 } : {}),
            ...(light4 ? { light4 } : {}),
          },
        }, { exclude: client.id });
        realm.save().catch(Room.noop);
        break;
      }
      case 'VOXEL': {
        // if (!client.isCreator) {
        //   return;
        // }
        const {
          width, height, depth,
          voxels,
        } = realm;
        let {
          x, y, z,
          type,
          r, g, b,
        } = request.json || {};
        x = parseInt(`${x}`, 10);
        y = parseInt(`${y}`, 10);
        z = parseInt(`${z}`, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(y)
          || Number.isNaN(z)
        ) {
          return;
        }
        if (x < 0) x += width;
        if (x >= width) x -= width;
        if (y < 0) y += height;
        if (y >= height) y -= height;
        if (z < 0) z += depth;
        if (z >= depth) z -= depth;
        type = parseInt(`${type}`, 10);
        if (
          Number.isNaN(type)
          || type < 0
          || type > 5
        ) {
          return;
        }
        r = parseInt(`${r}`, 10);
        g = parseInt(`${g}`, 10);
        b = parseInt(`${b}`, 10);
        if (
          Number.isNaN(r)
          || Number.isNaN(g)
          || Number.isNaN(b)
          || r < 0
          || r > 0xFF
          || g < 0
          || g > 0xFF
          || g < 0
          || g > 0xFF
        ) {
          return;
        }
        const voxel = ((z * width * height) + (y * width) + x) * 4;
        voxels[voxel] = type;
        voxels[voxel + 1] = type !== 0 ? r : 0;
        voxels[voxel + 2] = type !== 0 ? g : 0;
        voxels[voxel + 3] = type !== 0 ? b : 0;
        this.broadcast({
          type: 'VOXEL',
          json: {
            x, y, z,
            type,
            r, g, b,
          },
        }, { exclude: client.id });
        realm.markModified('voxels');
        realm.save().catch(Room.noop);
        break;
      }
      default:
        break;
    }
  }
}

module.exports = RealmRoom;
