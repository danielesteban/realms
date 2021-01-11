import Pako from './pako.js';
import { protocol } from './protocol.js';
import SimplePeer from './simplepeer.js';
import { Group } from './three.js';
import Peer from '../renderables/peer.js';

class Peers extends Group {
  constructor({
    endpoint,
    onInit,
    onLeave,
    onJoin,
    onPeerMessage,
    onServerEvent,
    player,
    server,
  }) {
    super();
    this.endpoint = endpoint;
    this.onInit = onInit;
    this.onLeave = onLeave;
    this.onJoin = onJoin;
    this.onPeerMessage = onPeerMessage;
    this.onServerEvent = onServerEvent;
    this.peers = [];
    this.player = player;
    this.server = server;
    this.connectToServer();
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(this.onUserMedia.bind(this))
        .catch(() => {});
    }
  }

  animate({ delta }) {
    const { peers, player } = this;

    const hands = player.controllers
      .filter(({ hand }) => (!!hand))
      .sort(({ hand: { handedness: a } }, { hand: { handedness: b } }) => b.localeCompare(a));

    const update = new Float32Array([
      ...player.head.position.toArray(),
      ...player.head.quaternion.toArray(),
      ...(hands.length === 2 ? (
        hands.reduce((hands, { hand: { state }, worldspace: { position, quaternion } }) => {
          hands.push(
            ...position.toArray(),
            ...quaternion.toArray(),
            state
          );
          return hands;
        }, [])
      ) : []),
    ]);
    const payload = new Uint8Array(1 + update.byteLength);
    payload[0] = 0x01;
    payload.set(new Uint8Array(update.buffer), 1);

    peers.forEach(({ connection, controllers }) => {
      if (
        connection
        && connection._channel
        && connection._channel.readyState === 'open'
      ) {
        try {
          connection.send(payload);
        } catch (e) {
          return;
        }
        if (!connection.hasSentSkin) {
          connection.hasSentSkin = true;
          const encoded = (new TextEncoder()).encode(player.skin);
          const payload = new Uint8Array(1 + encoded.length);
          payload.set(encoded, 1);
          try {
            connection.send(payload);
          } catch (e) {
            // console.log(e);
          }
        }
      }
      controllers.forEach((controller) => {
        if (controller.visible) {
          controller.hand.animate({ delta });
        }
      });
    });
  }

  broadcast(message, { exclude, include } = {}) {
    const { peers } = this;
    const isRaw = message instanceof Uint8Array;
    const encoded = !isRaw ? (new TextEncoder()).encode(JSON.stringify(message)) : message;
    const payload = new Uint8Array(1 + encoded.byteLength);
    payload[0] = isRaw ? 0x02 : 0x03;
    payload.set(new Uint8Array(encoded.buffer), 1);
    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }
    if (include && !Array.isArray(include)) {
      include = [include];
    }
    peers.forEach((peer) => {
      const { connection, peer: id } = peer;
      if (
        connection
        && connection._channel
        && connection._channel.readyState === 'open'
        && (!include || ~include.indexOf(id))
        && (!exclude || exclude.indexOf(id) === -1)
      ) {
        try {
          connection.send(payload);
        } catch (e) {
          // console.log(e);
        }
      }
    });
  }

  connectToPeer({ id, creator, initiator = false }) {
    const {
      onJoin,
      player,
      userMedia,
    } = this;
    const connection = new SimplePeer({
      initiator,
      stream: userMedia,
    });
    const peer = new Peer({
      peer: id,
      connection,
      isCreator: creator,
      listener: player.head,
    });
    connection.on('error', () => {});
    connection.on('data', (data) => this.onPeerData(peer, data));
    connection.on('signal', (signal) => (
      this.serverRequest({
        type: 'SIGNAL',
        json: {
          peer: id,
          signal: JSON.stringify(signal),
        },
      })
    ));
    connection.on('track', peer.onTrack.bind(peer));
    this.add(peer);
    if (onJoin) {
      onJoin(peer);
    }
    return peer;
  }

  connectToServer() {
    const { endpoint, server } = this;
    if (this.socket) {
      this.disconnect();
    }
    const socket = new WebSocket(`${server.baseURL.replace(/http/, 'ws')}/${endpoint}`, server.session);
    socket.binaryType = 'arraybuffer';
    socket.onerror = () => {};
    socket.onclose = () => {
      this.reset();
      if (socket.error) {
        // const dialog = document.createElement('div');
        // dialog.id = 'error';
        // dialog.innerText = socket.error;
        // document.body.appendChild(dialog);
        return;
      }
      this.reconnectTimer = setTimeout(this.connectToServer.bind(this), 1000);
    };
    socket.onmessage = this.onMessage.bind(this);
    this.socket = socket;
  }

  disconnect() {
    const { socket } = this;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (!socket) {
      return;
    }
    socket.onclose = null;
    socket.onmessage = null;
    socket.close();
    this.reset();
  }

  onMessage({ data: buffer }) {
    const { peers, socket } = this;
    let event;
    try {
      event = Peers.decode(new Uint8Array(buffer));
    } catch (e) {
      return;
    }
    switch (event.type) {
      case 'ERROR':
        socket.error = event.json;
        if (this.onServerEvent) {
          this.onServerEvent(event);
        }
        break;
      case 'INIT':
        this.peers = event.json.peers.map(({ id, creator }) => (
          this.connectToPeer({ id, creator, initiator: true })
        ));
        if (this.onInit) {
          this.onInit(event);
        }
        break;
      case 'JOIN':
        peers.push(this.connectToPeer(event.json));
        break;
      case 'LEAVE': {
        const index = peers.findIndex(({ peer: id }) => (id === event.json));
        if (~index) {
          const [peer] = peers.splice(index, 1);
          this.remove(peer);
          peer.dispose();
          if (this.onLeave) {
            this.onLeave(peer);
          }
        }
        break;
      }
      case 'SIGNAL': {
        const { connection } = peers[
          peers.findIndex(({ peer: id }) => (id === event.json.peer))
        ] || {};
        if (connection && !connection.destroyed) {
          let signal;
          try {
            signal = JSON.parse(event.json.signal);
          } catch (e) {
            return;
          }
          connection.signal(signal);
        }
        break;
      }
      default:
        if (this.onServerEvent) {
          this.onServerEvent(event);
        }
        break;
    }
  }

  onPeerData(peer, data) {
    const { onPeerMessage } = this;
    switch (data[0]) {
      case 0x02:
        if (onPeerMessage) {
          onPeerMessage({ peer, message: new Uint8Array(data.slice(1)) });
        }
        break;
      case 0x03:
        if (onPeerMessage) {
          let message = data.slice(1);
          try {
            message = JSON.parse(message);
          } catch (e) {
            break;
          }
          onPeerMessage({ peer, message });
        }
        break;
      default:
        peer.onData(data);
        break;
    }
  }

  onUserMedia(stream) {
    const { peers } = this;
    this.userMedia = stream;
    peers.forEach(({ connection }) => {
      if (!connection.destroyed) {
        connection.addStream(stream);
      }
    });
  }

  serverRequest(message) {
    const { socket } = this;
    socket.send(Peers.encode(message));
  }

  reset() {
    const { peers, onLeave } = this;
    peers.forEach((peer) => {
      this.remove(peer);
      peer.dispose();
      if (onLeave) {
        onLeave(peer);
      }
    });
    peers.length = 0;
  }

  static decode(buffer) {
    if (buffer[0] === 0x78 && buffer[1] === 0x9c) {
      buffer = Pako.inflate(buffer);
    }
    const message = protocol.Message.decode(buffer);
    message.type = protocol.Message.Type[message.type];
    if (message.json) {
      message.json = JSON.parse(message.json);
    }
    return message;
  }

  static encode(message) {
    message.type = protocol.Message.Type[message.type];
    if (message.json) {
      message.json = JSON.stringify(message.json);
    }
    return protocol.Message.encode(protocol.Message.create(message)).finish();
  }
}

export default Peers;
