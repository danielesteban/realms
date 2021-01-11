const { vec3 } = require('gl-matrix');
const {
  getNoise,
  sampleColorFromNoise,
} = require('./utils');

module.exports = ({ width, height, depth }) => {
  // M.C. Escher's Cubic Space Division
  const noise = getNoise();
  const cube = 8;
  const corners = [
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(width - 1, 0, 0),
    vec3.fromValues(0, 0, depth - 1),
    vec3.fromValues(width - 1, 0, depth - 1),
    vec3.fromValues(0, height - 1, 0),
    vec3.fromValues(width - 1, height - 1, 0),
    vec3.fromValues(0, height - 1, depth - 1),
    vec3.fromValues(width - 1, height - 1, depth - 1),
  ];
  const radius = vec3.length(vec3.fromValues(width, height, depth));
  return ({ x, y, z }) => {
    const p = vec3.fromValues(x, y, z);
    const d = corners.reduce((d, c) => (
      Math.min(d, vec3.distance(c, p))
    ), radius);
    if (
      d < cube
      || (z === 0 && x === 0)
      || (z === depth - 1 && x === 0)
      || (z === depth - 1 && x === width - 1)
      || (z === 0 && x === width - 1)
      || (
        (y === 0 || y === height - 1)
        && (
          x === 0 || x === width - 1
          || z === 0 || z === depth - 1
        )
      )
    ) {
      return sampleColorFromNoise({
        noise,
        x,
        y,
        z,
        type: d < cube ? 0x02 : 0x01,
      });
    }
    return false;
  };
};
