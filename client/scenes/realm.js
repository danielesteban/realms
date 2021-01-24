import {
  Color,
  FogExp2,
  Group,
  Vector3,
} from '../core/three.js';
import Exporter from '../core/exporter.js';
import Room from '../core/room.js';
import RealmUI from '../renderables/realmUI.js';
import Sharing from '../renderables/sharing.js';
import Voxels from '../renderables/voxels.js';

class Realm extends Group {
  constructor(world, { slug }) {
    super();

    const { player, server, sfx } = world;

    world.background = new Color(0);
    world.fog = new FogExp2(0, navigator.userAgent.includes('Mobile') ? 0.03 : 0.02);

    this.auxColor = new Color();
    this.background = world.background;
    this.fog = world.fog;
    this.music = world.music;
    this.player = player;
    this.pointables = world.pointables;
    this.router = world.router;
    this.server = server;
    this.slug = slug;

    this.brush = {
      color: new Color(),
      noise: 0.15,
      shape: Realm.brushShapes.box,
      size: 1,
      type: 0,
    };

    this.chunks = [];
    this.exporter = new Exporter();
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

    Promise.all([...Array(10)].map(() => (
      sfx.load('./sounds/plop.ogg')
        .then((sound) => {
          sound.filter = sound.context.createBiquadFilter();
          sound.setFilter(sound.filter);
          sound.setRefDistance(3);
          this.add(sound);
          return sound;
        })
    )))
      .then((sounds) => {
        this.sounds = sounds;
      });

    this.ui = new RealmUI();
    this.ui.addEventListener('button', this.onUIButton.bind(this));
    this.ui.addEventListener('change', this.onUIChange.bind(this));
    this.ui.addEventListener('input', this.onUIInput.bind(this));
    player.attach(this.ui, 'left');
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      auxColor,
      background,
      brush,
      chunks,
      config,
      fog,
      music,
      player,
      pointables,
      room,
      ui,
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

    const octaves = music.getOctaves(animation.delta);
    Object.keys(config.lighting).forEach((key) => {
      const { band, color } = config.lighting[key];
      auxColor.setHex(color);
      if (band !== 0) {
        auxColor.multiplyScalar(octaves[band - 1]);
      }
      if (key === 'background') {
        background.copy(auxColor);
        fog.color.copy(auxColor);
      } else {
        Voxels.updateLighting(key, auxColor.getHex());
      }
    });
    if (!isXR) {
      ui.visualizer.update(octaves);
    }

    // Cleanup:
    // I need to unify this pointables logic with the one from the menu
    // into the world animationTick and just move the voxels pointer logic
    // into a onPointer method on each Voxels.intersects
    // But first:
    // I need refactor the UI class so I can delegate the button state handling to it's onPointer method
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
          raycaster.intersectObjects(pointables)[0] || false
        ) : pointer.target;
        if (hit) {
          if (hit.object.onPointer) {
            if (
              (hand && buttons.triggerDown)
              || (isDesktop && buttons.primaryDown)
            ) {
              hit.object.onPointer(hit.point);
            }
            return;
          }
          const isPlacing = isDesktop ? buttons.primaryDown : buttons.triggerDown;
          const isPicking = isDesktop ? buttons.tertiaryDown : buttons.primaryDown;
          if (!isPicking) {
            this.playSound({
              filter: isPlacing ? 'lowpass' : 'highpass',
              position: hit.point,
            });
          }
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
            const type = isPlacing ? brush.type + 1 : 0;
            const color = {
              r: Math.floor(brush.color.r * 0xFF),
              g: Math.floor(brush.color.g * 0xFF),
              b: Math.floor(brush.color.b * 0xFF),
            };
            const noise = ((color.r + color.g + color.b) / 3) * brush.noise;
            Realm.getBrush(brush).forEach(({ x, y, z }) => {
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
            });
          }
        } else if (!config.canEdit) {
          this.requestEdit();
        }
      }
    });
  }

  onInit({ json: meta, buffer: voxels }) {
    const {
      player,
      server,
      worker,
      ui,
    } = this;
    if (!this.config) {
      this.config = {
        _id: meta._id,
        width: meta.width,
        height: meta.height,
        depth: meta.depth,
        maxLight: 16,
        chunkSize: 32,
        renderRadius: navigator.userAgent.includes('Mobile') ? 3 : 4,
      };
      Voxels.setupOffsets(this.config);
      worker.postMessage({
        type: 'init',
        config: this.config,
      });
      player.teleport(
        new Vector3(
          this.config.width * Voxels.scale * 0.5,
          0.5,
          this.config.depth * Voxels.scale * 0.5
        )
      );
    }
    this.config.canEdit = !meta.creator || meta.isCreator;
    this.config.lighting = {
      ambient: meta.ambient,
      background: meta.background,
      light1: meta.light1,
      light2: meta.light2,
      light3: meta.light3,
      light4: meta.light4,
    };
    this.updatePointables();

    worker.postMessage({
      type: 'load',
      data: voxels,
    });

    ui.update({
      creator: meta.creator || 'Anonymous',
      canEdit: this.config.canEdit,
      isCreator: meta.isCreator,
      name: meta.name,
      hasSession: !!server.session,
      ...this.config.lighting,
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
        this.updatePointables();
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
        const color = r << 16 ^ g << 8 ^ b << 0;
        this.brush.color.setHex(color);
        this.brush.type = type - 1;
        this.ui.update({ blockType: type - 1, brushColor: color });
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

  onUIButton({ id }) {
    const {
      chunks,
      config,
      exporter,
      player,
      router,
      server,
      slug,
    } = this;
    switch (id) {
      case 'download':
        exporter.download({
          config,
          chunks,
          instances: 6,
          scale: Voxels.scale,
        });
        break;
      case 'fork':
        if (!config) {
          return;
        }
        server.request({
          endpoint: `realm/${config._id}/fork`,
          method: 'POST',
        })
          .then((slug) => router.push(`/${slug}`));
        break;
      case 'session':
        if (server.session) {
          server.logout();
        } else {
          player.unlock();
          server.showDialog('session');
        }
        break;
      case 'share':
        player.unlock();
        Sharing.showDialog(`${server.baseURL}/${slug}`);
        break;
      case 'menu':
        router.push('/');
        break;
      default:
        break;
    }
  }

  onUIChange({ id, value }) {
    const { room } = this;
    if (['brushColor', 'brushNoise', 'brushSize', 'brushShape', 'blockType'].includes(id)) {
      return;
    }
    room.serverRequest({
      type: 'META',
      json: { [id]: value },
    });
  }

  onUIInput({ id, value }) {
    const {
      brush,
      config,
    } = this;
    if (!config) {
      return;
    }
    switch (id) {
      case 'brushColor':
        brush.color.setHex(value);
        break;
      case 'brushNoise':
        brush.noise = value;
        break;
      case 'brushSize':
        brush.size = value;
        break;
      case 'brushShape':
        brush.shape = value;
        break;
      case 'blockType':
        brush.type = value;
        break;
      case 'name':
        config.name = value;
        break;
      default:
        if (Object.keys(config.lighting).includes(id)) {
          config.lighting[id] = value;
        }
        break;
    }
  }

  onUnload() {
    const {
      chunks,
      exporter,
      room,
      worker,
      ui,
    } = this;
    chunks.forEach((chunk) => chunk.dispose());
    exporter.dispose();
    room.disconnect();
    worker.terminate();
    ui.dispose();
  }

  playSound({ filter, position }) {
    const { sounds } = this;
    if (!sounds) {
      return;
    }
    const sound = sounds.find(({ isPlaying }) => (!isPlaying));
    if (sound && sound.context.state === 'running') {
      sound.filter.type = filter;
      sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
      sound.position.copy(position);
      sound.play();
    }
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

  updatePointables() {
    const { config, pointables, ui } = this;
    pointables.length = 0;
    pointables.push(ui);
    if (config.canEdit) {
      pointables.push(...Voxels.intersects);
    }
  }

  static getBrush({ shape, size }) {
    const { brushShapes, brushes } = Realm;
    const key = `${shape}:${size}`;
    let brush = brushes.get(key);
    if (!brush) {
      brush = [];
      if (shape === brushShapes.box) {
        size -= 1;
      }
      const radius = Math.sqrt(((size * 0.5) ** 2) * 3);
      for (let z = -size; z <= size; z += 1) {
        for (let y = -size; y <= size; y += 1) {
          for (let x = -size; x <= size; x += 1) {
            if (
              shape === brushShapes.box
              || Math.sqrt(x ** 2 + y ** 2 + z ** 2) < radius
            ) {
              brush.push({ x, y, z });
            }
          }
        }
      }
      brush.sort((a, b) => (
        Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2) - Math.sqrt(b.x ** 2 + b.y ** 2 + b.z ** 2)
      ));
      brushes.set(key, brush);
    }
    return brush;
  }
}

Realm.brushShapes = {
  box: 0,
  sphere: 1,
};

Realm.brushes = new Map();

export default Realm;
