const { notFound } = require('@hapi/boom');
const { body, param } = require('express-validator');
const namor = require('namor');
const { checkValidationResult } = require('./errorHandler');
const RealmRoom = require('./realmRoom');
const generators = Object.keys(require('../generators'));
const { Realm } = require('../models');

const rooms = new Map();

module.exports.onClient = (client, req) => {
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
    const name = req.body.name || namor.generate();
    const width = 96;
    const height = 96;
    const depth = 96;
    const realm = new Realm({
      creator: req.user._id,
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
    const selector = filter === 'user' ? { creator: req.user._id } : {};
    const sorting = `${filter === 'popular' ? '-views ' : '-createdAt'}`;
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
