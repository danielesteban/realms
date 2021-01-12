const { notFound } = require('@hapi/boom');
const { body, param } = require('express-validator');
const namor = require('namor');
const config = require('../config');
const { checkValidationResult } = require('./errorHandler');
const generators = Object.keys(require('../generators'));
const { Realm } = require('../models');
const RealmRoom = require('./realmRoom');

const rooms = new Map();

module.exports.onClient = (client, req) => {
  if (req.headers.origin !== config.clientOrigin) {
    client.send(RealmRoom.encode({
      type: 'ERROR',
      json: 'Origin not allowed.',
    }), RealmRoom.noop);
    client.terminate();
    return;
  }
  client.isHeadless = !!(
    ~(req.headers['user-agent'] || '').indexOf('Headless')
  );
  let { slug } = req.params;
  slug = `${slug}`;

  let room = rooms.get(slug);
  if (!room) {
    room = Realm
      .findOne({ slug })
      .select('creator name width height depth ambient background light1 light2 light3 light4 views voxels')
      .populate('creator', 'name')
      .then((realm) => {
        if (!realm) {
          throw notFound();
        }
        const room = new RealmRoom({
          realm,
          onEmpty: () => {
            rooms.delete(slug);
          },
        });
        rooms.set(slug, room);
        return room;
      });
    rooms.set(slug, room);
  }
  (room instanceof Promise ? room : Promise.resolve(room))
    .then((room) => (
      room.onClient(client)
    ))
    .catch(() => {
      client.send(RealmRoom.encode({
        type: 'ERROR',
        json: 'Couldn\'t load room.',
      }), RealmRoom.noop);
      client.terminate();
    });
};

module.exports.create = [
  body('name')
    .optional()
    .not().isEmpty()
    .isLength({ min: 1, max: 25 })
    .trim(),
  body('generator')
    .optional()
    .isIn(generators),
  checkValidationResult,
  (req, res, next) => {
    const generator = req.body.generator || 'default';
    const name = req.body.name || namor.generate({ words: 3, saltLength: 0 });
    const width = 64;
    const height = 64;
    const depth = 64;
    const realm = new Realm({
      ...(req.user ? { creator: req.user._id } : {}),
      name,
      width,
      height,
      depth,
      voxels: Realm.generateVoxels({
        generator,
        width,
        height,
        depth,
      }),
    });
    realm
      .save()
      .then(({ slug }) => (
        res.json(slug)
      ))
      .catch(next);
  },
];

module.exports.fork = [
  param('id')
    .isMongoId(),
  checkValidationResult,
  (req, res, next) => {
    Realm
      .findById(req.params.id)
      .then((realm) => {
        if (!realm) {
          throw notFound();
        }
        const fork = new Realm({
          ...(req.user ? { creator: req.user._id } : {}),
          name: namor.generate({ words: 3, saltLength: 0 }),
          width: realm.width,
          height: realm.height,
          depth: realm.depth,
          ambient: realm.ambient,
          background: realm.background,
          light1: realm.light1,
          light2: realm.light2,
          light3: realm.light3,
          light4: realm.light4,
          voxels: realm.voxels,
        });
        fork
          .save()
          .then(({ slug }) => (
            res.json(slug)
          ))
          .catch(next);
      });
  },
];

module.exports.getScreenshot = [
  param('id')
    .isMongoId(),
  checkValidationResult,
  (req, res, next) => {
    Realm
      .findOne({
        _id: req.params.id,
        screenshot: { $exists: true },
      })
      .select('updatedAt')
      .then((realm) => {
        if (!realm) {
          throw notFound();
        }
        const lastModified = realm.updatedAt.toUTCString();
        if (req.get('if-modified-since') === lastModified) {
          return res.status(304).end();
        }
        return Realm
          .findById(realm._id)
          .select('-_id screenshot')
          .then(({ screenshot }) => (
            res
              .set('Cache-Control', 'must-revalidate')
              .set('Content-Type', 'image/png')
              .set('Last-Modified', lastModified)
              .send(screenshot)
          ));
      })
      .catch(next);
  },
];

module.exports.list = (filter) => ([
  param('page')
    .isInt(),
  checkValidationResult,
  (req, res, next) => {
    const { page } = req.params;
    const pageSize = 5;
    const selector = filter === 'user' ? (
      { creator: req.user._id }
    ) : (
      { creator: { $exists: true } }
    );
    let sorting;
    switch (filter) {
      default:
        sorting = '-createdAt';
        break;
      case 'popular':
        sorting = '-views';
        break;
      case 'user':
        sorting = '-updatedAt';
        break;
    }
    Realm
      .countDocuments(selector)
      .then((count) => (
        Realm
          .find(selector)
          .sort(sorting)
          .skip(page * pageSize)
          .limit(pageSize)
          .select('name slug createdAt')
          .then((realms) => (
            res.json({
              pages: Math.ceil(count / pageSize),
              realms,
            })
          ))
      ))
      .catch(next);
  },
]);
