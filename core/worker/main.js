import ComputeIntersects from './intersects.js';
import Mesher from './mesher.js';
import World from './world.js';

// eslint-disable-next-line no-restricted-globals
const context = self;

let world;

let remeshDebounce;
const remesh = () => {
  clearTimeout(remeshDebounce);
  remeshDebounce = setTimeout(() => {
    const intersects = ComputeIntersects(world);
    const { chunks, buffers } = Mesher(world);
    context.postMessage({
      type: 'update',
      chunks,
      intersects,
    }, [...buffers, intersects.buffer]);
  }, 0);
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
    case 'pick': {
      const { x, y, z } = message.voxel;
      context.postMessage({
        type: 'pick',
        voxel: world.pick(x, y, z),
      });
      break;
    }
    case 'update': {
      const {
        x, y, z,
        type,
        r, g, b,
      } = message.voxel;
      world.update(x, y, z, type, r, g, b);
      remesh();
      break;
    }
    default:
      break;
  }
});
