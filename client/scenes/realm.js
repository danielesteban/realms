import {
  Color,
  FogExp2,
  Group,
  Vector3,
} from '../core/three.js';
import Room from '../core/room.js';
import RealmUI from '../renderables/realmUI.js';
import Voxels from '../renderables/voxels.js';

class Realm extends Group {
  constructor(world, { slug }) {
    super();

    const { player, pointables, router, server } = world;

    world.background = new Color(0);
    world.fog = new FogExp2(0, 0.02);

    this.brush = {
      color: new Color(),
      size: 1,
    };

    this.chunks = [];
    this.worker = new Worker('./core/worker/main.js', { type: 'module' });
    this.worker.addEventListener('message', this.onWorkerMessage.bind(this));

    this.room = new Room({
      onInit: this.onInit.bind(this),
      onPeerMessage: this.onPeerMessage.bind(this),
      onServerEvent: this.onServerEvent.bind(this),
      endpoint: `realm/${slug}`,
      player,
      server,
    });
    this.add(this.room);

    this.ui = new RealmUI();
    this.ui.addEventListener('button', ({ id }) => {
      player.unlock();
      switch (id) {
        case 'create':
        case 'fork':
          if (!this.config) {
            return;
          }
          server.request({
            endpoint: id === 'fork' ? `realm/${this.config._id}/fork` : 'realm',
            method: 'POST',
          })
            .then((slug) => router.push(`/${slug}`));
          break;
        case 'session':
          if (server.session) {
            server.logout();
          } else {
            server.showDialog('session');
          }
          break;
        case 'menu':
          router.push('/');
          break;
        default:
          break;
      }
    });
    this.ui.addEventListener('change', ({ id, value }) => {
      if (id !== 'brush') {
        this.room.serverRequest({
          type: 'META',
          json: { [id]: value },
        });
      }
    });
    this.ui.addEventListener('input', ({ id, value }) => {
      if (id === 'background') {
        world.background.setHex(value);
        world.fog.color.setHex(value);
      } if (id === 'brush') {
        this.brush.color.setHex(value);
      } else if (
        ['ambient', 'light1', 'light2', 'light3', 'light4'].includes(id)
      ) {
        Voxels.updateLighting({ [id]: value });
      }
    });
    player.attach(this.ui, 'left');

    this.player = player;
    // this.pointables = pointables;
    this.router = router;
    this.server = server;
  }

  onAnimationTick({ animation, camera }) {
    const {
      brush,
      chunks,
      config,
      player,
      room,
    } = this;

    if (!config) {
      return;
    }

    const { auxVector: wrap, head: { position } } = player;
    wrap.set(0, 0, 0);
    if (position.x < 0) wrap.x = config.width * Voxels.scale;
    if (position.x >= config.width * Voxels.scale) wrap.x = -config.width * Voxels.scale;
    if (position.y < 0) wrap.y = config.height * Voxels.scale;
    if (position.y >= config.height * Voxels.scale) wrap.y = -config.height * Voxels.scale;
    if (position.z < 0) wrap.z = config.depth * Voxels.scale;
    if (position.z >= config.depth * Voxels.scale) wrap.z = -config.depth * Voxels.scale;
    if (wrap.length()) {
      player.move(wrap);
    }
    room.animate(animation);

    Voxels.updateOffsets(camera);
    chunks.forEach((chunk) => {
      chunk.geometry.instanceCount = Voxels.offsets.visible;
    });

    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({
      buttons,
      hand,
      isDesktop,
      pointer,
      raycaster,
    }) => {
      if (
        (
          hand && pointer.visible
          && (buttons.triggerDown || buttons.gripDown || buttons.primaryDown)
        )
        || (isDesktop && (buttons.primaryDown || buttons.secondaryDown || buttons.tertiaryDown))
      ) {
        const hit = isDesktop ? (
          raycaster.intersectObjects(Voxels.intersects)[0] || false
        ) : pointer.target;
        if (hit) {
          if (!config.canEdit) {
            this.requestEdit();
            return;
          }
          const isPlacing = isDesktop ? buttons.primaryDown : buttons.triggerDown;
          const isPicking = isDesktop ? buttons.tertiaryDown : buttons.primaryDown;
          hit.point
            .divideScalar(Voxels.scale)
            .addScaledVector(hit.face.normal, isPlacing ? 0.25 : -0.25)
            .floor();
          if (isPicking) {
            this.worker.postMessage({
              type: 'pick',
              voxel: {
                x: hit.point.x,
                y: hit.point.y,
                z: hit.point.z,
              },
            });
          } else {
            // TODO: move this out of desktop controls with events
            const type = isPlacing ? player.desktopControls.brush.type + 1 : 0;
            const color = {
              r: Math.floor(brush.color.r * 0xFF),
              g: Math.floor(brush.color.g * 0xFF),
              b: Math.floor(brush.color.b * 0xFF),
            };
            // TODO: get a scalar from the ui for this
            const noise = ((color.r + color.g + color.b) / 3) * 0.15;

            // TODO: move this out of desktop controls with wheel events
            // const { size } = player.desktopControls.brush;
            // Limit the size to 1 until I got multiple realms working
            const size = 1;
            const radius = Math.sqrt(((size * 0.5) ** 2) * 3);
            for (let z = -size; z <= size; z += 1) {
              for (let y = -size; y <= size; y += 1) {
                for (let x = -size; x <= size; x += 1) {
                  if (Math.sqrt(x ** 2 + y ** 2 + z ** 2) < radius) {
                    const voxel = {
                      x: hit.point.x + x,
                      y: hit.point.y + y,
                      z: hit.point.z + z,
                      type,
                      r: Math.min(Math.max(color.r + (Math.random() - 0.5) * noise, 0), 0xFF),
                      g: Math.min(Math.max(color.g + (Math.random() - 0.5) * noise, 0), 0xFF),
                      b: Math.min(Math.max(color.b + (Math.random() - 0.5) * noise, 0), 0xFF),
                    };
                    this.worker.postMessage({
                      type: 'update',
                      voxel,
                    });
                    this.room.serverRequest({
                      type: 'VOXEL',
                      json: voxel,
                    });
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  onInit({ json: meta, buffer: voxels }) {
    if (!this.config) {
      this.config = {
        _id: meta._id,
        width: meta.width,
        height: meta.height,
        depth: meta.depth,
        maxLight: 16,
        chunkSize: 32,
        // This is prolly to crazy for quest one
        // It seems to work fine with something like 3
        // As long as I scaled the fog.. Will see.
        renderRadius: 4,
      };
      Voxels.setupOffsets(this.config);
      // Disable VR controls until I got the UI working
      // this.pointables.push(...Voxels.intersects);
      this.worker.postMessage({
        type: 'init',
        config: this.config,
      });
      this.player.teleport(
        new Vector3(
          this.config.width * Voxels.scale * 0.5,
          0.5,
          this.config.depth * Voxels.scale * 0.5
        )
      );
    }
    this.config.canEdit = !meta.creator || meta.isCreator;

    this.worker.postMessage({
      type: 'load',
      data: voxels,
    });

    this.ui.update({
      ...meta,
      creator: meta.creator || 'Anonymous',
      canEdit: this.config.canEdit,
      hasSession: !!this.server.session,
    });
  }

  onSession() {
    const { room } = this;
    // Force reload when session changes
    room.reconnect();
  }

  onPeerMessage({ peer, message }) {
    const { room, ui } = this;
    if (message instanceof Uint8Array) {
      return;
    }
    switch (message.type) {
      case 'edit':
        ui.showRequest({
          name: message.name,
          onAllow: () => (
            room.serverRequest({
              type: 'ALLOW',
              json: { peer: peer.peer },
            })
          ),
        });
        break;
      default:
        break;
    }
  }

  onServerEvent({ type, json }) {
    const { config, router, worker } = this;
    switch (type) {
      case 'ALLOW':
        config.canEdit = true;
        this.ui.update({ canEdit: true });
        break;
      case 'ERROR':
        router.replace('/');
        break;
      case 'META':
        if (json.slug) {
          router.replace(`/${json.slug}`);
          return;
        }
        this.ui.update(json);
        break;
      case 'VOXEL':
        worker.postMessage({
          type: 'update',
          voxel: json,
        });
        break;
      default:
        break;
    }
  }

  onWorkerMessage({ data: message }) {
    switch (message.type) {
      case 'pick': {
        const { type, r, g, b } = message.voxel;
        this.brush.color.setHex(
          r << 16 ^ g << 8 ^ b << 0
        );
        // TODO: move this out of desktop controls with events
        this.player.desktopControls.brush.type = type - 1;
        break;
      }
      case 'update':
        message.chunks.forEach((geometry, chunk) => {
          let voxels = this.chunks[chunk];
          if (!voxels) {
            voxels = new Voxels();
            this.add(voxels);
            this.chunks.push(voxels);
          }
          voxels.update(geometry);
        });
        if (this.chunks.length > message.chunks.length) {
          this.chunks.slice(message.chunks.length).forEach((chunk) => {
            chunk.visible = false;
          });
        }
        Voxels.updateIntersects(message.intersects);
        break;
      default:
        break;
    }
  }

  onUnload() {
    const {
      chunks,
      room,
      worker,
      ui,
    } = this;
    chunks.forEach((chunk) => chunk.dispose());
    room.disconnect();
    worker.terminate();
    ui.dispose();
  }

  requestEdit() {
    const { room, server } = this;
    const creator = room.peers.find(({ isCreator }) => (isCreator));
    if (creator) {
      room.broadcast({
        type: 'edit',
        name: server.session ? server.profile.name : 'Anonymous',
      }, { include: creator.peer });
    }
  }
}

export default Realm;
