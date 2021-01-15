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
import Stand from '../renderables/stand.js';
import UI from '../renderables/ui.js';
import Welcome from '../renderables/welcome.js';

class Menu extends Group {
  constructor(world) {
    super();

    const { player, pointables, router, server } = world;

    world.background = new Color(0x010A1A);
    world.fog = new FogExp2(world.background.clone(), 0.075);
    player.desktopControls.speed = 3;
    player.teleport(new Vector3(0, 0, 0));

    this.add(new Grid());
    this.add(new Dome());

    const realms = [...Array(5)].map(() => {
      const realm = new Realm();
      pointables.push(realm);
      this.add(realm);
      return realm;
    });
    this.realms = realms;

    const ui = new UI({
      buttons: [
        {
          x: 40,
          y: 8,
          width: 44,
          height: 44,
          label: '<',
          isDisabled: true,
          pagination: 'prev',
          onPointer: () => this.setPage(Menu.page - 1),
        },
        {
          x: 172,
          y: 8,
          width: 44,
          height: 44,
          label: '>',
          isDisabled: true,
          pagination: 'next',
          onPointer: () => this.setPage(Menu.page + 1),
        },
        {
          x: 16,
          y: 76,
          width: 224,
          height: 44,
          label: 'Most popular',
          isActive: true,
          filter: 'popular',
          onPointer: () => this.setFilter('popular'),
        },
        {
          x: 16,
          y: 136,
          width: 224,
          height: 44,
          label: 'Latest',
          filter: 'latest',
          onPointer: () => this.setFilter('latest'),
        },
        {
          x: 16,
          y: 196,
          width: 224,
          height: 44,
          label: 'Your realms',
          filter: 'user',
          onPointer: () => this.setFilter('user'),
        },
        {
          x: 16,
          y: 256,
          width: 224,
          height: 44,
          label: 'Create new',
          onPointer: () => (
            server.request({
              endpoint: 'realm',
              method: 'POST',
            })
              .then((slug) => router.push(`/${slug}`))
          ),
        },
      ],
      graphics: [({ ctx }) => {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 256, 60);
        ctx.strokeStyle = '#000';
        ctx.moveTo(0, 60);
        ctx.lineTo(256, 60);
        ctx.stroke();
      }],
      labels: [
        {
          x: 128,
          y: 31,
          text: '···',
          pagination: true,
        },
      ],
      height: 0.49375,
      textureHeight: 316,
    });
    ui.add(new Frame());
    const stand = new Stand();
    stand.position.set(0, -1, -0.1);
    stand.scale.set(0.25, 1.5, 0.125);
    ui.add(stand);
    ui.position.set(0, 1.125, -2.125);
    ui.lookAt(0, 1.6, 0);
    pointables.push(ui);
    this.add(ui);
    this.ui = ui;

    this.player = player;
    this.pointables = pointables;
    this.router = router;
    this.server = server;
    this.setFilter(Menu.filter, Menu.page);

    Welcome.showDialog();
  }

  onAnimationTick({ animation }) {
    const {
      realms,
      player,
      pointables,
      router,
    } = this;
    const { auxVector: wrap, position } = player;
    const maxDistance = 6;
    const distance = wrap.length(wrap.set(position.x, 0, position.z));
    wrap.set(0, 0, 0);
    if (position.y !== 0) wrap.y = -position.y;
    if (distance > maxDistance) {
      const scale = (distance - maxDistance) / distance;
      wrap.x = -position.x * scale;
      wrap.z = -position.z * scale;
    }
    if (wrap.length()) {
      player.move(wrap);
    }
    realms.forEach((realm, i) => {
      if (!realm.visible) {
        return;
      }
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

  setFilter(filter, page = 0) {
    const { player, server, ui } = this;
    if (filter === 'user' && !server.session) {
      player.unlock();
      server.showDialog('session');
      return;
    }
    Menu.filter = filter;
    this.setPage(page);
    ui.buttons.forEach((button) => {
      button.isActive = button.filter === filter;
    });
    ui.draw();
  }

  setPage(page) {
    const {
      realms,
      server,
      ui,
    } = this;
    const { filter } = Menu;
    Menu.page = page;
    realms.forEach((realm) => {
      realm.visible = false;
    });
    ui.buttons.forEach((button) => {
      if (button.pagination) {
        button.isDisabled = true;
      }
    });
    ui.labels.forEach((label) => {
      if (label.pagination) {
        label.text = '···';
      }
    });
    ui.draw();
    server.request({
      endpoint: `realms/${filter}/${page}`,
    })
      .then(({ realms: data, pages }) => {
        const count = data.length;
        const dist = 2.5;
        const slice = Math.PI / 4;
        const offset = Math.PI * -1 - slice * (count - 5) * 0.5;
        data.forEach((meta, i) => {
          const realm = realms[i];
          realm.update({
            ...meta,
            screenshot: `${server.baseURL}/realm/${meta._id}/screenshot`,
          });
          const angle = offset + slice * i;
          realm.position.set(Math.cos(angle) * dist, 1.5, Math.sin(angle) * dist * 0.75 - 2);
          realm.lookAt(0, 1.6, -1);
          realm.animation = { position: realm.position.y, rotation: realm.rotation.y };
        });
        ui.buttons.forEach((button) => {
          if (button.pagination === 'prev') {
            button.isDisabled = page === 0;
          }
          if (button.pagination === 'next') {
            button.isDisabled = page + 1 >= pages;
          }
        });
        ui.labels.forEach((label) => {
          if (label.pagination) {
            label.text = `${page + 1} / ${pages}`;
          }
        });
        ui.draw();
      });
  }

  onUnload() {
    const { realms, ui } = this;
    realms.forEach((realm) => realm.dispose());
    ui.dispose();
  }
}

Menu.filter = 'popular';

export default Menu;
