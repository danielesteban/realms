const HSV2RGB = require('hsv-rgb');
const { Noise } = require('noisejs');

module.exports.getNoise = () => {
  const noise = new Noise();
  noise.seed(Math.random());
  return noise;
};

module.exports.sampleColorFromNoise = ({
  noise,
  s = 60,
  x,
  y,
  z,
  type = 0x01,
}) => {
  const [r, g, b] = HSV2RGB(
    Math.min(Math.floor(
      Math.abs(noise.perlin3((x + 24) / 8, (y + 24) / 8, (z + 24) / 8)) * 359
    ), 359),
    s,
    Math.min(Math.floor(
      (Math.abs(noise.perlin3((x + 32) / 8, (y + 32) / 8, (z + 32) / 8)) + 0.05) * 100
    ), 100)
  );
  return [type, r, g, b];
};
