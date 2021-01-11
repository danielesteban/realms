module.exports = () => {
  const color = { r: 0.4, g: 0.6, b: 1 };
  return ({ x, y, z }) => {
    // Sea of holes
    if (
      y === 0
      && (
        (Math.floor(x / 2) * Math.floor(z / 2)) % 2 === 0
      )
    ) {
      const light = 127 - Math.floor(Math.random() * 32);
      return [
        0x02,
        Math.floor(light * color.r),
        Math.floor(light * color.g),
        Math.floor(light * color.b),
      ];
    }
    return false;
  };
};
