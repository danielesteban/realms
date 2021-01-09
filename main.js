import Renderer from './core/renderer.js';
import Server from './core/server.js';
import * as worlds from './worlds/index.js';

const server = new Server('http://localhost:8081');

const renderer = new Renderer({
  dom: {
    cursor: document.getElementById('cursor'),
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    renderer: document.getElementById('renderer'),
    support: document.getElementById('support'),
  },
  server,
  worlds,
});

const onRoute = (slug) => {
  if (slug) {
    renderer.scene.load('Realm', { slug });
  } else {
    renderer.scene.load('Menu');
  }
};

// TODO: Implement the router!
onRoute('test-realm-11');
