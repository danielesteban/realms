import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Frame extends Mesh {
  static setupGeometry() {
    Frame.geometry = new BoxBufferGeometry(1, 1, 0.1);
    Frame.geometry.translate(0, 0, -0.051);
  }

  static setupMaterial() {
    Frame.material = new MeshBasicMaterial({
      color: 0x030303,
    });
  }

  constructor() {
    if (!Frame.geometry) {
      Frame.setupGeometry();
    }
    if (!Frame.material) {
      Frame.setupMaterial();
    }
    super(Frame.geometry, Frame.material);
  }
}

export default Frame;
