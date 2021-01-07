import ComputeIntersects from './intersects.js';
import Mesher from './mesher.js';
import World from './world.js';

// eslint-disable-next-line no-restricted-globals
const context = self;

let world;

const remesh = () => {
  const intersects = ComputeIntersects(world);
  const { chunks, buffers } = Mesher(world);
  context.postMessage({
    type: 'update',
    chunks,
    intersects,
  }, [...buffers, intersects.buffer]);
};

context.addEventListener('message', ({ data: message }) => {
  switch (message.type) {
    case 'init':
      world = new World(message.config);
      break;
    case 'load':
      world.load(message.data);
      remesh();
      break;
    case 'update': {
      const {
        x, y, z,
        size,
        type,
        r, g, b,
      } = message.voxel;
      const noise = ((r + g + b) / 3) * 0.15;
      const radius = Math.sqrt(((size * 0.5) ** 2) * 3);
      for (let bz = -size; bz <= size; bz += 1) {
        for (let by = -size; by <= size; by += 1) {
          for (let bx = -size; bx <= size; bx += 1) {
            if (Math.sqrt(bx ** 2 + by ** 2 + bz ** 2) < radius) {
              world.update(
                x + bx,
                y + by,
                z + bz,
                type,
                r + (Math.random() - 0.5) * noise,
                g + (Math.random() - 0.5) * noise,
                b + (Math.random() - 0.5) * noise
              );
            }
          }
        }
      }
      remesh();
      break;
    }
    default:
      break;
  }
});
