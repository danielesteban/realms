import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';
import Frame from './frame.js';
import Stand from './stand.js';

class Realm extends Mesh {
  static setupGeometry() {
    Realm.geometry = new PlaneBufferGeometry(1, 1);
  }

  constructor() {
    if (!Realm.geometry) {
      Realm.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      Realm.geometry,
      new MeshBasicMaterial({ map: texture })
    );
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const draw = (image) => {
      const canvas = this.material.map.image;
      const ctx = canvas.getContext('2d');
      if (image) {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
      } else {
        canvas.width = 512;
        canvas.height = 512;
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - 64, canvas.width, 64);
      ctx.fillStyle = '#fff';
      ctx.font = '700 30px monospace';
      ctx.fillText(this.meta.name, 20, canvas.height - 22);
      this.material.map.needsUpdate = true;
      this.visible = true;
    };
    image.onerror = () => draw();
    image.onload = () => draw(image);
    this.image = image;
    this.scale.set(0.6, 0.6, 1);
    this.add(new Frame());
    this.add(new Stand());
    this.visible = false;
  }

  dispose() {
    const { material } = this;
    material.map.dispose();
    material.dispose();
  }

  update(meta) {
    const { image } = this;
    this.meta = meta;
    image.src = meta.screenshot;
  }
}

export default Realm;
