import Renderer from './core/renderer.js';
import Router from './core/router.js';
import Server from './core/server.js';
import * as worlds from './worlds/index.js';

const server = new Server('http://localhost:8081');
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
  worlds,
});

router.addEventListener('update', ({ slug }) => {
  if (!slug) {
    router.replace('/test-realm');
    return;
  }
  renderer.scene.load('Realm', { slug });
});
router.init();
