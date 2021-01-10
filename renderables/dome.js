import {
  BackSide,
  BufferAttribute,
  IcosahedronBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Dome extends Mesh {
  static setupGeometry() {
    Dome.geometry = new IcosahedronBufferGeometry(24, 3);
    const position = Dome.geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(position.count * 3), 3);
    for (let i = 0, l = position.count; i < l; i += 3) {
      const r = Math.random();
      const g = Math.random();
      const b = Math.random();
      color.setXYZ(i + Math.floor(Math.random() * 3), r, g, b);
    }
    Dome.geometry.setAttribute('color', color);
  }

  static setupMaterial() {
    Dome.material = new MeshBasicMaterial({
      side: BackSide,
      vertexColors: true,
    });
  }

  constructor() {
    if (!Dome.geometry) {
      Dome.setupGeometry();
    }
    if (!Dome.material) {
      Dome.setupMaterial();
    }
    super(Dome.geometry, Dome.material);
  }
}

export default Dome;
