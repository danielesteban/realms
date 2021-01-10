import {
  Color,
  FogExp2,
  Group,
  Vector3,
} from '../core/three.js';
import Grid from '../renderables/grid.js';
import Dome from '../renderables/dome.js';
import Frame from '../renderables/frame.js';
import Realm from '../renderables/realm.js';
import UI from '../renderables/ui.js';

class Menu extends Group {
  constructor(scene) {
    super();

    const { player, pointables, router, server } = scene;

    scene.background = new Color(0x010A1A);
    scene.fog = new FogExp2(scene.background.clone(), 0.075);
    player.desktopControls.speed = 3;
    player.teleport(new Vector3(0, 0, 0));

    this.add(new Grid());
    this.add(new Dome());

    const dist = 2.5;
    const slice = Math.PI / 4;
    const realms = [...Array(5)].map((v, i) => {
      const realm = new Realm();
      const angle = Math.PI * -1 + slice * i;
      realm.position.set(Math.cos(angle) * dist, 1.4, Math.sin(angle) * dist * 0.75 - 2);
      realm.lookAt(0, 1.6, -1);
      realm.animation = { position: realm.position.y, rotation: realm.rotation.y };
      pointables.push(realm);
      this.add(realm);
      return realm;
    });
    this.realms = realms;

    const ui = new UI({
      buttons: [
        {
          x: 16,
          y: 16,
          width: 224,
          height: 48,
          label: 'Most popular',
          isActive: true,
          filter: 'popular',
          onPointer: () => setFilter('popular'),
        },
        {
          x: 16,
          y: 80,
          width: 224,
          height: 48,
          label: 'Latest',
          filter: 'latest',
          onPointer: () => setFilter('latest'),
        },
        {
          x: 16,
          y: 140,
          width: 224,
          height: 48,
          label: 'Your Realms',
          filter: 'user',
          onPointer: () => setFilter('user'),
        },
        {
          x: 64,
          y: 200,
          width: 48,
          height: 40,
          label: '<',
          isDisabled: true,
        },
        {
          x: 144,
          y: 200,
          width: 48,
          height: 40,
          label: '>',
          isDisabled: true,
        },
      ],
    });
    ui.add(new Frame());
    ui.position.set(0, 1, -2.25);
    ui.lookAt(0, 1.6, 0);
    pointables.push(ui);
    this.add(ui);
    this.ui = ui;

    const setFilter = (filter) => {
      if (filter === 'user' && !server.session) {
        player.unlock();
        server.showDialog('session');
        return;
      }
      this.filter = filter;
      this.setPage(0);
      ui.buttons.forEach((button) => {
        button.isActive = button.filter === filter;
      });
      ui.draw();
    };
    this.player = player;
    this.pointables = pointables;
    this.router = router;
    this.server = server;
    setFilter('popular');
  }

  onAnimationTick({ animation }) {
    const {
      realms,
      player,
      pointables,
      router,
    } = this;
    const { auxVector: wrap, position } = player;
    wrap.set(0, 0, 0);
    if (position.y !== 0) wrap.y = -position.y;
    if (wrap.length()) {
      player.move(wrap);
    }
    realms.forEach((realm, i) => {
      const t = animation.time + i * 2;
      realm.position.y = realm.animation.position + Math.sin(t) * 0.02;
      realm.rotation.y = realm.animation.rotation + Math.sin(t * 0.75) * 0.1;
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
        (hand && pointer.visible && buttons.triggerDown)
        || (isDesktop && buttons.primaryDown)
      ) {
        const hit = isDesktop ? (
          raycaster.intersectObjects(pointables)[0] || false
        ) : pointer.target;
        if (hit) {
          const { object, point } = hit;
          if (object.onPointer) {
            object.onPointer(point);
          } else if (object.meta) {
            router.push(`/${object.meta.slug}`);
          }
        }
      }
    });
  }

  setPage(page) {
    const { filter, realms, server } = this;
    server.request({
      endpoint: `realms/${filter}/${page}`,
    })
      .then(({ realms: data }) => {
        realms.forEach((realm, i) => {
          const meta = data[i];
          if (meta) {
            realm.update({
              ...meta,
              screenshot: `${server.baseURL}/realm/${meta._id}/screenshot`,
            });
          } else {
            realm.visible = false;
          }
        });
        // TODO: Update pagination!
      });
  }

  onUnload() {
    const { realms, ui } = this;
    realms.forEach((realm) => realm.dispose());
    ui.dispose();
  }
}

export default Menu;
