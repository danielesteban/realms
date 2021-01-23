import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  GLTFExporter,
  MeshBasicMaterial,
  Vector3,
  Vector4,
} from './three.js';

class Exporter {
  constructor() {
    this.downloader = document.createElement('a');
    this.downloader.style.display = 'none';
    document.body.appendChild(this.downloader);
    this.exporter = new GLTFExporter();
  }

  dispose() {
    const { downloader } = this;
    document.body.removeChild(downloader);
  }

  download({
    config,
    chunks,
    instances,
    scale,
  }) {
    const { downloader, exporter } = this;
    const vector = new Vector3();
    const offsets = [];
    const center = new Vector3(config.width * 0.5 * scale, 0, config.depth * 0.5 * scale);
    for (let z = -instances; z <= instances; z += 1) {
      for (let y = -instances; y <= instances; y += 1) {
        for (let x = -instances; x <= instances; x += 1) {
          if (vector.set(x, y, z).length() >= instances) {
            // eslint-disable-next-line no-continue
            continue;
          }
          offsets.push((new Vector3(
            x * config.width * scale,
            y * config.height * scale,
            z * config.depth * scale
          )).sub(center));
        }
      }
    }
    const lights = {
      ambient: new Color(config.lighting.ambient.color),
      light1: new Color(config.lighting.light1.color),
      light2: new Color(config.lighting.light2.color),
      light3: new Color(config.lighting.light3.color),
      light4: new Color(config.lighting.light4.color),
    };
    const light = new Vector4();
    const material = new MeshBasicMaterial({ vertexColors: true });
    exporter.parse(chunks.filter(({ visible }) => (visible)).reduce((meshes, { geometry: model }) => {
      const position = model.getAttribute('position');
      const color = model.getAttribute('color');
      const combined = new Float32Array(color.array);
      const lighting = model.getAttribute('lighting');
      const geometry = new BufferGeometry();
      for (let i = 0, l = combined.length; i < l; i += 3) {
        light.fromBufferAttribute(lighting, i / 3).divideScalar(0xFF);
        ['r', 'g', 'b'].forEach((component, j) => {
          combined[i + j] = Math.min(1, (combined[i + j] / 0xFF) * Math.max(
            lights.ambient[component],
            (light.x ** 2) * lights.light1[component]
            + (light.y ** 2) * lights.light2[component]
            + (light.z ** 2) * lights.light3[component]
            + (light.w ** 2) * lights.light4[component]
          ));
        });
      }
      geometry.setIndex(model.getIndex());
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(position.array), 3));
      geometry.setAttribute('color', new BufferAttribute(combined, 3));
      const mesh = new Mesh(geometry, material);
      mesh.scale.setScalar(scale);
      offsets.forEach((offset) => {
        const instance = mesh.clone();
        instance.position.copy(offset);
        meshes.push(instance);
      });
      return meshes;
    }, []), (buffer) => {
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      downloader.download = `${config.name}.glb`;
      downloader.href = URL.createObjectURL(blob);
      downloader.click();
    }, {
      binary: true,
    });
  }
}

export default Exporter;
