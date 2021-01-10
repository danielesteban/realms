import {
  Color,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  PlaneBufferGeometry,
  UniformsUtils,
} from '../core/three.js';

class Grid extends Mesh {
  static setupGeometry() {
    Grid.geometry = new PlaneBufferGeometry(64, 64);
    Grid.geometry.rotateX(Math.PI * -0.5);
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Grid.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        opacity: { value: 0.5 },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'varying vec2 gridPosition;',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            'gridPosition = vec3(modelMatrix * vec4(position, 1.0)).xz;',
          ].join('\n')
        ),
      fragmentShader: fragmentShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'varying vec2 gridPosition;',
            'const vec3 gridColor = vec3(0.05, 0.05, 0.1);',
            'float line(vec2 position) {',
            '  vec2 coord = abs(fract(position - 0.5) - 0.5) / fwidth(position);',
            '  return 1.0 - min(min(coord.x, coord.y), 1.0);',
            '}',
          ].join('\n')
        )
        .replace(
          'vec3 outgoingLight = reflectedLight.indirectDiffuse;',
          [
            'vec3 outgoingLight = reflectedLight.indirectDiffuse;',
            'outgoingLight *= gridColor * line(gridPosition / 2.0);',
          ].join('\n')
        ),
      fog: true,
      transparent: true,
    });
  }

  constructor() {
    if (!Grid.geometry) {
      Grid.setupGeometry();
    }
    if (!Grid.material) {
      Grid.setupMaterial();
    }
    super(Grid.geometry, Grid.material);
  }
}

export default Grid;
