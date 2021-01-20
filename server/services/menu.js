const config = require('../config');
const Room = require('./room');

const rooms = new Map();

module.exports.onClient = (client, req) => {
  if (req.headers.origin !== config.clientOrigin) {
    client.send(Room.encode({
      type: 'ERROR',
      json: 'Origin not allowed.',
    }), Room.noop);
    client.terminate();
    return;
  }
  let room;
  let instance = 0;
  while (!room) {
    room = rooms.get(instance);
    if (!room) {
      room = new Room({});
      rooms.set(instance, room);
    } else if (room.clients.length >= room.maxClients) {
      room = false;
      instance += 1;
    }
  }
  room.onClient(client);
};
