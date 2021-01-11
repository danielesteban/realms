const path = require('path');
const protobuf = require('protobufjs');
const { v4: uuid } = require('uuid');
const zlib = require('zlib');

const Message = protobuf
  .loadSync(path.join(__dirname, '..', 'messages.proto'))
  .lookupType('protocol.Message');

class Room {
  constructor({
    maxClients = 16,
  }) {
    this.clients = [];
    this.maxClients = maxClients;
  }

  onClose(client) {
    const { clients, pingInterval } = this;
    const index = clients.findIndex(({ id }) => (id === client.id));
    if (~index) {
      clients.splice(index, 1);
      this.broadcast({
        type: 'LEAVE',
        json: client.id,
      });
      if (!clients.length) {
        if (pingInterval) {
          clearInterval(pingInterval);
          delete this.pingInterval;
        }
        if (this.onEmpty) {
          this.onEmpty();
        }
      }
    }
  }

  onClient(client) {
    const {
      clients,
      maxClients,
      pingInterval,
    } = this;
    if (clients.length >= maxClients) {
      client.send(Room.encode({
        type: 'ERROR',
        json: 'Room is full. Try again later.',
      }), Room.noop);
      client.terminate();
      return;
    }
    client.id = uuid();
    const defaultInit = {
      json: { peers: clients.map(({ id }) => ({ id })) },
    };
    client.send(Room.encode({
      type: 'INIT',
      ...(this.onInit ? this.onInit(client, defaultInit) : defaultInit),
    }), Room.noop);
    const defaultJoin = {
      json: { id: client.id },
    };
    this.broadcast({
      type: 'JOIN',
      ...(this.onJoin ? this.onJoin(client, defaultJoin) : defaultJoin),
    });
    clients.push(client);
    client.isAlive = true;
    client.once('close', () => this.onClose(client));
    client.on('message', (data) => this.onMessage(client, data));
    client.on('pong', () => {
      client.isAlive = true;
    });
    if (!pingInterval) {
      this.pingInterval = setInterval(this.ping.bind(this), 30000);
    }
  }

  onMessage(client, data) {
    let request;
    try {
      request = Room.decode(data);
    } catch (e) {
      return;
    }
    this.onRequest(client, request);
  }

  onRequest(client, request) {
    const { clients } = this;
    switch (request.type) {
      case 'SIGNAL': {
        let { peer, signal } = request.json || {};
        peer = `${peer}`;
        signal = `${signal}`;
        if (!(
          !peer
          || !signal
          || clients.findIndex(({ id }) => (id === peer)) === -1
        )) {
          this.broadcast({
            type: 'SIGNAL',
            json: {
              peer: client.id,
              signal,
            },
          }, {
            include: peer,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  broadcast(event, { exclude, include } = {}) {
    const { clients } = this;
    const encoded = Room.encode(event);
    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }
    if (include && !Array.isArray(include)) {
      include = [include];
    }
    clients.forEach((client) => {
      if (
        (!include || ~include.indexOf(client.id))
        && (!exclude || exclude.indexOf(client.id) === -1)
      ) {
        client.send(encoded, Room.noop);
      }
    });
  }

  ping() {
    const { clients } = this;
    clients.forEach((client) => {
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping(Room.noop);
    });
  }

  static decode(buffer) {
    const message = Message.decode(buffer);
    message.type = Message.Type[message.type];
    if (message.json) {
      message.json = JSON.parse(message.json);
    }
    return message;
  }

  static encode(message) {
    message.type = Message.Type[message.type];
    if (message.json) {
      message.json = JSON.stringify(message.json);
    }
    const buffer = Message.encode(Message.create(message)).finish();
    if (buffer.length > 1024) {
      return zlib.deflateSync(buffer);
    }
    return buffer;
  }

  static noop() {}
}

module.exports = Room;
