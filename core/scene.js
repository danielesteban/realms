import { Scene as ThreeScene } from './three.js';
import Ambient from './ambient.js';
import Player from './player.js';
import SFX from './sfx.js';

// A VR scene base class

class Scene extends ThreeScene {
  constructor({
    renderer: {
      camera,
      clock,
      dom,
      renderer,
    },
    router,
    server,
    worlds,
  }) {
    super();

    this.clock = clock;

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.add(this.player);

    this.ambient = new Ambient(this.player.head.context.state === 'running');
    this.sfx = new SFX({ listener: this.player.head });
    this.pointables = [];
    this.router = router;
    this.server = server;
    this.worlds = worlds;

    server.addEventListener('session', this.onSession.bind(this));

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      this.resumeAudio();
    };
    document.addEventListener('mousedown', onFirstInteraction);
  }

  load(world, options = {}) {
    const {
      ambient,
      player,
      pointables,
      worlds,
    } = this;
    if (this.world) {
      if (this.world.onUnload) {
        this.world.onUnload();
      }
      this.remove(this.world);
    }
    this.background = null;
    this.fog = null;
    ambient.set(null);
    player.desktopControls.reset();
    player.detachAll();
    pointables.length = 0;
    this.world = new worlds[world](this, options);
    if (this.world.resumeAudio && player.head.context.state === 'running') {
      this.world.resumeAudio();
    }
    this.add(this.world);
  }

  onAnimationTick({ animation, camera }) {
    const {
      ambient,
      player,
      pointables,
      world,
    } = this;
    ambient.onAnimationTick(animation);
    player.onAnimationTick({
      animation,
      camera,
      pointables,
    });
    if (world && world.onAnimationTick) {
      world.onAnimationTick({ animation, camera });
    }
  }

  onSession() {
    const { world } = this;
    if (world && world.onSession) {
      world.onSession();
    }
  }

  resumeAudio() {
    const { ambient, player: { head: { context } }, world } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    ambient.resume();
    if (world && world.resumeAudio) {
      world.resumeAudio();
    }
  }
}

export default Scene;
