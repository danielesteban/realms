module.exports = ({ width, depth }) => {
  const center = { x: width * 0.5, z: depth * 0.5 };
  return ({ x, y, z }) => {
    // Platform
    if (
      y === 0
      && x >= center.x - 3
      && x <= center.x + 2
      && z >= center.z - 3
      && z <= center.z + 2
    ) {
      if (
        x >= center.x - 1
        && x <= center.x
        && z >= center.z - 1
        && z <= center.z
      ) {
        return [0x02, 0xBF, 0xBF, 0xBF];
      }
      const intensity = 0xAA - Math.floor(Math.random() * 16);
      return [0x01, intensity, intensity, intensity];
    }
    return false;
  };
};
