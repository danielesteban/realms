import Renderer from './core/renderer.js';
import Router from './core/router.js';
import Server from './core/server.js';
import * as scenes from './scenes/index.js';

const server = new Server(`https://${document.location.host}`);
const router = new Router();
const renderer = new Renderer({
  dom: {
    cursor: document.getElementById('cursor'),
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    renderer: document.getElementById('renderer'),
    support: document.getElementById('support'),
  },
  router,
  server,
  scenes,
});

router.addEventListener('update', ({ slug }) => {
  if (!slug) {
    renderer.world.load('Menu');
    return;
  }
  renderer.world.load('Realm', { slug });
});
router.update();
