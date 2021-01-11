const {
  getNoise,
  sampleColorFromNoise,
} = require('./utils');

module.exports = ({ width, height, depth }) => {
  const noise = getNoise();
  const size = Math.max(width, depth);
  const radius = size * 0.5;
  return ({ x, y, z }) => {
    // HourGlass
    if (x > width * 0.5) x -= width;
    if (z > depth * 0.5) z -= depth;
    const h = radius * Math.exp(-(x * x + z * z) / (size * 2));
    if (
      y <= h || y > size - h
    ) {
      return sampleColorFromNoise({
        noise,
        s: 20,
        x,
        y,
        z,
        type: (y === 0 || y === height * 0.5) ? 0x02 : 0x01,
      });
    }
    return false;
  };
};
