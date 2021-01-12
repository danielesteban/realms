import {
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  OctahedronBufferGeometry,
} from '../core/three.js';

class Stand extends Mesh {
  static setupGeometry() {
    Stand.geometry = new OctahedronBufferGeometry(1, 0);
    const position = Stand.geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(position.count * 3), 3);
    for (let i = 0, l = position.count; i < l; i += 3) {
      const c = 0.05 - (i / l / 3) * 0.3;
      color.setXYZ(i, c, c, c);
      color.setXYZ(i + 1, c, c, c);
      color.setXYZ(i + 2, c, c, c);
    }
    Stand.geometry.setAttribute('color', color);
    Stand.geometry.deleteAttribute('normal');
    Stand.geometry.deleteAttribute('uv');
  }

  static setupMaterial() {
    Stand.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
    if (!Stand.geometry) {
      Stand.setupGeometry();
    }
    if (!Stand.material) {
      Stand.setupMaterial();
    }
    super(Stand.geometry, Stand.material);
    this.scale.set(1, 2, 0.25);
    this.position.set(0, 0, -0.25);
  }
}

export default Stand;
