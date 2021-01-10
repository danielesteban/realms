module.exports = ({ width, height, depth }) => {
  const center = { x: width * 0.5, z: depth * 0.5 };
  return ({ x, y, z }) => {
    const r = Math.sqrt((x - center.x) ** 2 + (z - center.z) ** 2);
    if (r < 24 && y < height - 8) {
      let type = 0x01;
      if (y === 6) {
        type = z === center.z && r > 9 && r < 11 ? (x > center.x ? 0x02 : 0x03) : 0;
      } else if (y > 8) {
        type = r > 23.5 ? 0x01 : 0x00;
      } else if (y > 2) {
        return false;
      }
      return [
        type,
        0xBB - Math.random() * 0x22,
        0xBB - Math.random() * 0x22,
        0xBB - Math.random() * 0x22,
      ];
    }
    return false;
  };
};
