import {
  Color,
  FogExp2,
  Group,
  Vector3,
} from '../core/three.js';
import Voxels from '../renderables/voxels.js';

class Realm extends Group {
  constructor(scene) {
    super();

    const { player } = scene;

    this.config = {
      width: 96,
      height: 96,
      depth: 96,
      background: { r: 0.1, g: 0.1, b: 0.15 },
      lightChannels: {
        ambient: { r: 0.02, g: 0.02, b: 0.02 },
        light1: {
          r: Math.random() * 0.5 + 0.2,
          g: Math.random() * 0.5 + 0.2,
          b: Math.random() * 0.5 + 0.2,
        },
        light2: {
          r: Math.random() * 0.5 + 0.2,
          g: Math.random() * 0.5 + 0.2,
          b: Math.random() * 0.5 + 0.2,
        },
        light3: {
          r: Math.random() * 0.5 + 0.2,
          g: Math.random() * 0.5 + 0.2,
          b: Math.random() * 0.5 + 0.2,
        },
        light4: {
          r: Math.random() * 0.5 + 0.2,
          g: Math.random() * 0.5 + 0.2,
          b: Math.random() * 0.5 + 0.2,
        },
      },
      maxLight: 16,
      chunkSize: 32,
      renderRadius: 5,
    };

    scene.background = (new Color()).copy(this.config.background);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    Voxels.setupOffsets(this.config);
    this.chunks = [];
    this.worker = new Worker('./core/worker/main.js', { type: 'module' });
    this.worker.addEventListener('message', ({ data: message }) => {
      switch (message.type) {
        case 'update':
          message.chunks.forEach((geometry, chunk) => {
            let voxels = this.chunks[chunk];
            if (!voxels) {
              voxels = new Voxels();
              scene.add(voxels);
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
    });
    this.worker.postMessage({
      type: 'init',
      config: this.config,
    });

    const data = new Uint8ClampedArray(
      this.config.width * this.config.height * this.config.depth * 4
    );
    const center = { x: this.config.width * 0.5, z: this.config.depth * 0.5 };
    for (let z = 0; z < this.config.depth; z += 1) {
      for (let x = 0; x < this.config.width; x += 1) {
        const r = Math.sqrt((x - center.x) ** 2 + (z - center.z) ** 2);
        if (r < 12) {
          for (let y = 0; y < 3; y += 1) {
            const i = (
              (z * this.config.width * this.config.height) + (y * this.config.width) + x
            ) * 4;
            if (y === 2) {
              data[i] = r < 2 ? 0x02 : 0;
            } else {
              data[i] = 0x01;
            }
            data[i + 1] = 0xAA - Math.random() * 0x22;
            data[i + 2] = 0xAA - Math.random() * 0x22;
            data[i + 3] = 0xAA - Math.random() * 0x22;
          }
        }
      }
    }
    this.worker.postMessage({
      type: 'load',
      data,
    });

    player.teleport(
      new Vector3(this.config.width * Voxels.scale * 0.5, 0, this.config.depth * Voxels.scale * 0.5)
    );
    this.player = player;
  }

  onAnimationTick({ camera }) {
    const { chunks, config, player } = this;
    const { position } = player;
    if (position.x < 0) position.x += config.width * Voxels.scale;
    if (position.x >= config.width * Voxels.scale) position.x -= config.width * Voxels.scale;
    if (position.y < 0) position.y += config.height * Voxels.scale;
    if (position.y >= config.height * Voxels.scale) position.y -= config.height * Voxels.scale;
    if (position.z < 0) position.z += config.depth * Voxels.scale;
    if (position.z >= config.depth * Voxels.scale) position.z -= config.depth * Voxels.scale;
    player.updateMatrixWorld();
    Voxels.updateOffsets(camera);
    chunks.forEach((chunk) => {
      chunk.geometry.instanceCount = Voxels.offsets.visible;
    });
    if (
      player.desktopControls.buttons.primaryDown
      || player.desktopControls.buttons.secondaryDown
    ) {
      const hit = player.desktopControls.raycaster.intersectObjects(Voxels.intersects)[0] || false;
      if (hit) {
        const placing = player.desktopControls.buttons.primaryDown;
        hit.point
          .divideScalar(Voxels.scale)
          .addScaledVector(hit.face.normal, placing ? 0.25 : -0.25)
          .floor();
        let type = 0;
        let color = {
          r: 0xBB,
          g: 0xBB,
          b: 0xBB,
        };
        if (placing) {
          type = player.desktopControls.brush.type + 1;
          if (type > 1) {
            color = {
              r: 0xEE,
              g: 0xEE,
              b: 0xEE,
            };
          }
        }
        this.worker.postMessage({
          type: 'update',
          voxel: {
            x: hit.point.x,
            y: hit.point.y,
            z: hit.point.z,
            type,
            size: player.desktopControls.brush.size,
            r: color.r,
            g: color.g,
            b: color.b,
          },
        });
      }
    }
  }
}

export default Realm;
