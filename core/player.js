import {
  AudioListener,
  BoxBufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  Vector3,
} from './three.js';
import DesktopControls from './desktop.js';
import Hand from '../renderables/hand.js';
import Head from '../renderables/head.js';
import Pointer from '../renderables/pointer.js';

// Player controller

class Player extends Group {
  constructor({
    camera,
    dom,
    xr,
  }) {
    super();
    this.add(camera);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.attachments = { left: [], right: [] };
    this.climbing = {
      bodyScale: 1,
      enabled: true,
      grip: [false, false],
      hand: new Vector3(),
      isJumping: false,
      isOnAir: false,
      lastMovement: new Vector3(),
      movement: new Vector3(),
      normal: new Vector3(),
      velocity: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      reset() {
        this.bodyScale = 1;
        this.enabled = true;
        this.grip[0] = false;
        this.grip[1] = false;
        this.isJumping = false;
        this.isOnAir = false;
      },
    };
    this.head = new AudioListener();
    this.head.rotation.order = 'YXZ';
    const physicsMaterial = new MeshBasicMaterial({ visible: false });
    this.head.physics = new Mesh(
      new BoxBufferGeometry(0.3, 0.3, 0.3),
      physicsMaterial
    );
    this.head.add(this.head.physics);
    const controllerPhysics = new Mesh(
      new BoxBufferGeometry(0.015, 0.09, 0.14),
      physicsMaterial
    );
    controllerPhysics.position.set(0, -0.1 / 3, 0.02);
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = xr.getController(i);
      this.add(controller);
      controller.buttons = {
        forwards: false,
        backwards: false,
        leftwards: false,
        rightwards: false,
        trigger: false,
        grip: false,
        primary: false,
        secondary: false,
      };
      controller.physics = controllerPhysics.clone();
      controller.pointer = new Pointer();
      controller.add(controller.pointer);
      controller.pulse = (intensity, duration) => {
        if (
          !controller.gamepad
          || !controller.gamepad.hapticActuators
          || !controller.gamepad.hapticActuators.length
        ) {
          return;
        }
        controller.gamepad.hapticActuators[0].pulse(intensity, duration);
      };
      controller.raycaster = new Raycaster();
      controller.raycaster.far = 16;
      controller.worldspace = {
        lastPosition: new Vector3(),
        movement: new Vector3(),
        position: new Vector3(),
        quaternion: new Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { handedness, gamepad } }) => {
        if (controller.hand) {
          return;
        }
        const hand = new Hand({ handedness });
        controller.hand = hand;
        controller.gamepad = gamepad;
        controller.add(hand);
        controller.add(controller.physics);
        const attachments = this.attachments[handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.add(attachment);
          });
        }
      });
      controller.addEventListener('disconnected', () => {
        if (!controller.hand) {
          return;
        }
        const attachments = this.attachments[controller.hand.handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.remove(attachment);
          });
        }
        controller.remove(controller.hand);
        controller.remove(controller.physics);
        delete controller.hand;
        delete controller.gamepad;
        controller.pointer.visible = false;
      });
      return controller;
    });
    this.desktopControls = new DesktopControls({
      cursor: dom.cursor,
      renderer: dom.renderer,
      xr,
    });
    {
      const key = 'realmsvr::skin';
      let skin = localStorage.getItem(key);
      if (!skin) {
        skin = Head.generateTexture().toDataURL();
        localStorage.setItem(key, skin);
      }
      this.skin = skin;
    }
    this.xr = xr;
  }

  attach(attachment, handedness) {
    const { attachments, controllers } = this;
    attachments[handedness].push(attachment);
    controllers.forEach((controller) => {
      if (controller.hand && controller.hand.handedness === handedness) {
        controller.add(attachment);
      }
    });
  }

  detachAll() {
    const { attachments, head, controllers } = this;
    delete head.physics.onContact;
    controllers.forEach((controller) => {
      delete controller.physics.onContact;
      const children = controller.hand && attachments[controller.hand.handedness];
      if (children) {
        children.forEach((child) => (
          controller.remove(child)
        ));
      }
    });
    attachments.left.length = 0;
    attachments.right.length = 0;
  }

  onAnimationTick({
    animation,
    camera,
    pointables,
  }) {
    const {
      auxMatrixA: rotation,
      auxVector: vector,
      controllers,
      desktopControls,
      head,
      xr,
    } = this;

    // Update input state
    camera.matrixWorld.decompose(head.position, head.quaternion, vector);
    head.updateMatrixWorld();
    controllers.forEach(({
      buttons,
      hand,
      gamepad,
      matrixWorld,
      pointer,
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
      pointer.visible = false;
      [
        ['forwards', gamepad.axes[3] <= -0.5],
        ['backwards', gamepad.axes[3] >= 0.5],
        ['leftwards', gamepad.axes[2] <= -0.5],
        ['rightwards', gamepad.axes[2] >= 0.5],
        ['trigger', gamepad.buttons[0] && gamepad.buttons[0].pressed],
        ['grip', gamepad.buttons[1] && gamepad.buttons[1].pressed],
        ['primary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
        ['secondary', gamepad.buttons[5] && gamepad.buttons[5].pressed],
      ].forEach(([key, value]) => {
        buttons[`${key}Down`] = value && buttons[key] !== value;
        buttons[`${key}Up`] = !value && buttons[key] !== value;
        buttons[key] = value;
      });
      hand.setFingers({
        thumb: gamepad.buttons[3] && gamepad.buttons[3].touched,
        index: gamepad.buttons[0] && gamepad.buttons[0].pressed,
        middle: gamepad.buttons[1] && gamepad.buttons[1].pressed,
      });
      hand.animate(animation);
      worldspace.lastPosition.copy(worldspace.position);
      matrixWorld.decompose(worldspace.position, worldspace.quaternion, vector);
      worldspace.movement.subVectors(worldspace.position, worldspace.lastPosition);
      rotation.identity().extractRotation(matrixWorld);
      raycaster.ray.origin
        .addVectors(
          worldspace.position,
          vector.set(0, -0.1 / 3, 0).applyMatrix4(rotation)
        );
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    });

    // Process input
    controllers.forEach(({
      hand,
      buttons: {
        backwards,
        forwards,
        leftwards,
        leftwardsDown,
        rightwards,
        rightwardsDown,
        secondaryDown,
      },
      pointer,
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
      if (
        hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        this.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        hand.handedness === 'right'
        && (backwards || forwards || leftwards || rightwards)
      ) {
        vector.set(0, 0, 0);
        if (backwards) {
          vector.z = 1;
        }
        if (forwards) {
          vector.z = -1;
        }
        if (leftwards) {
          vector.x = -1;
        }
        if (rightwards) {
          vector.x = 1;
        }
        this.move(
          vector
            .normalize()
            .applyQuaternion(worldspace.quaternion)
            .multiplyScalar(animation.delta * 4)
        );
      }
      if (
        secondaryDown
        && xr.enabled
        && xr.isPresenting
      ) {
        xr.getSession().end();
      }
      if (pointables.length) {
        const hit = raycaster.intersectObjects(pointables)[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
    });
    desktopControls.onAnimationTick({ animation, camera, player: this });
  }

  move(offset) {
    const { controllers, head, position } = this;
    position.add(offset);
    head.position.add(offset);
    controllers.forEach(({ hand, raycaster, worldspace }) => {
      if (hand) {
        raycaster.ray.origin.add(offset);
        worldspace.position.add(offset);
      }
    });
    this.updateMatrixWorld();
  }

  rotate(radians) {
    const {
      auxMatrixA: transform,
      auxMatrixB: matrix,
      controllers,
      head,
      position,
    } = this;
    transform.makeTranslation(
      head.position.x, position.y, head.position.z
    );
    transform.multiply(
      matrix.makeRotationY(radians)
    );
    transform.multiply(
      matrix.makeTranslation(
        -head.position.x, -position.y, -head.position.z
      )
    );
    this.applyMatrix4(transform);
    head.applyMatrix4(transform);
    controllers.forEach(({ hand, raycaster, worldspace }) => {
      if (hand) {
        raycaster.ray.origin.applyMatrix4(transform);
        worldspace.position.applyMatrix4(transform);
      }
    });
    this.updateMatrixWorld();
  }

  teleport(point) {
    const { head, position } = this;
    const headY = head.position.y - position.y;
    position
      .subVectors(point, position.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    head.position.set(
      point.x,
      point.y + headY,
      point.z
    );
    this.updateMatrixWorld();
  }

  unlock() {
    const { desktopControls, xr } = this;
    if (desktopControls.isLocked) {
      document.exitPointerLock();
    }
    if (xr.enabled && xr.isPresenting) {
      xr.getSession().end();
    }
  }
}

export default Player;
