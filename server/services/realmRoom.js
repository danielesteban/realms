const Room = require('./room');

class RealmRoom extends Room {
  constructor({ realm, onEmpty }) {
    super({});
    this.realm = realm;
    this.onEmpty = onEmpty;
  }

  onInit(client) {
    const { clients } = this;
    const {
      _doc: {
        creator,
        voxels,
        ...meta
      },
    } = this.realm;

    client.isCreator = !!(
      client.user
      && creator
      && creator._id.equals(client.user._id)
    );

    client.canEdit = !creator || client.isCreator;

    if (!client.isCreator) {
      this.realm.views += 1;
      this.realm.save().catch(Room.noop);
    }

    return {
      json: {
        ...meta,
        ...(creator ? { creator: creator.name } : {}),
        isCreator: client.isCreator,
        peers: clients.map(({ id, user }) => ({
          id,
          ...(user && creator._id.equals(user._id) ? { creator: true } : {}),
        })),
      },
      buffer: voxels,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  onJoin(client, payload) {
    return {
      ...payload,
      json: {
        ...payload.json,
        creator: client.isCreator,
      },
    };
  }

  static sanitizeLight(color) {
    if (color === undefined) {
      return false;
    }
    color = parseInt(`${color}`, 10);
    if (
      Number.isNaN(color)
      || color < 0
      || color > 0xffffff
    ) {
      return false;
    }
    return color;
  }

  onRequest(client, request) {
    super.onRequest(client, request);
    const { clients, realm } = this;
    const { sanitizeLight } = RealmRoom;
    switch (request.type) {
      case 'ALLOW': {
        if (!client.isCreator) {
          return;
        }
        let { peer } = request.json || {};
        peer = `${peer}`;
        peer = peer && clients.find(({ id }) => (id === peer));
        if (!peer) {
          return;
        }
        peer.canEdit = true;
        this.broadcast({
          type: 'ALLOW',
        }, {
          include: peer.id,
        });
        break;
      }
      case 'META': {
        if (!client.canEdit) {
          return;
        }
        let {
          name,
          background,
          ambient,
          light1,
          light2,
          light3,
          light4,
        } = request.json || {};
        name = client.isCreator ? `${name || ''}` : false;
        background = sanitizeLight(background);
        ambient = sanitizeLight(ambient);
        light1 = sanitizeLight(light1);
        light2 = sanitizeLight(light2);
        light3 = sanitizeLight(light3);
        light4 = sanitizeLight(light4);
        if (
          !name
          && background === false
          && ambient === false
          && light1 === false
          && light2 === false
          && light3 === false
          && light4 === false
        ) {
          return;
        }
        if (name) realm.name = name;
        if (background !== false) realm.background = background;
        if (ambient !== false) realm.ambient = ambient;
        if (light1 !== false) realm.light1 = light1;
        if (light2 !== false) realm.light2 = light2;
        if (light3 !== false) realm.light3 = light3;
        if (light4 !== false) realm.light4 = light4;
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
        realm.save()
          .then((realm) => {
            if (name) {
              this.broadcast({
                type: 'META',
                json: {
                  slug: realm.slug,
                },
              });
            }
          })
          .catch(Room.noop);
        break;
      }
      case 'VOXEL': {
        if (!client.canEdit) {
          return;
        }
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
