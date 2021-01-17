import { Scene } from './three.js';
import Music from './music.js';
import Player from './player.js';
import SFX from './sfx.js';

// A VR scene base class

class World extends Scene {
  constructor({
    renderer: {
      camera,
      clock,
      dom,
      renderer,
    },
    router,
    server,
    scenes,
  }) {
    super();

    this.clock = clock;

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.add(this.player);

    this.music = new Music(this.player.head.context);
    this.sfx = new SFX({ listener: this.player.head });
    this.pointables = [];
    this.router = router;
    this.server = server;
    this.scenes = scenes;

    server.addEventListener('session', this.onSession.bind(this));

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      this.resumeAudio();
    };
    document.addEventListener('mousedown', onFirstInteraction);
  }

  load(scene, options = {}) {
    const {
      player,
      pointables,
      scenes,
    } = this;
    if (this.scene) {
      if (this.scene.onUnload) {
        this.scene.onUnload();
      }
      this.remove(this.scene);
    }
    this.background = null;
    this.fog = null;
    player.desktopControls.reset();
    player.detachAll();
    pointables.length = 0;
    this.scene = new scenes[scene](this, options);
    if (this.scene.resumeAudio && player.head.context.state === 'running') {
      this.scene.resumeAudio();
    }
    this.add(this.scene);
  }

  onAnimationTick({ animation, camera }) {
    const {
      player,
      pointables,
      scene,
    } = this;
    player.onAnimationTick({
      animation,
      camera,
      pointables,
    });
    if (scene && scene.onAnimationTick) {
      scene.onAnimationTick({ animation, camera });
    }
  }

  onSession() {
    const { scene } = this;
    if (scene && scene.onSession) {
      scene.onSession();
    }
  }

  resumeAudio() {
    const { music, player: { head: { context } }, scene } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    music.resume();
    if (scene && scene.resumeAudio) {
      scene.resumeAudio();
    }
  }
}

export default World;
