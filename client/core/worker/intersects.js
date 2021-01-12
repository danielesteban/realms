function ComputeIntersects(world) {
  const { config, voxels } = world;
  const { width, height, depth } = config;

  const boxes = [];
  const map = new Map();

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let z = 0; z < depth; z += 1) {
        if (voxels[world.getVoxel(x, y, z)] !== 0 && !map.has(`${x}:${y}:${z}`)) {
          const box = {
            position: { x, y, z },
            size: { x: 0, y: 0, z: 0 },
          };
          boxes.push(box);

          for (let i = x + 1; i <= width; i += 1) {
            if (i === width || voxels[world.getVoxel(i, y, z)] === 0 || map.has(`${i}:${y}:${z}`)) {
              box.size.x = i - x;
              break;
            }
          }

          box.size.y = height - y;
          for (let i = x; i < x + box.size.x; i += 1) {
            for (let j = y + 1; j <= y + box.size.y; j += 1) {
              if (j === height || voxels[world.getVoxel(i, j, z)] === 0 || map.has(`${i}:${j}:${z}`)) {
                box.size.y = j - y;
              }
            }
          }

          box.size.z = depth - z;
          for (let i = x; i < x + box.size.x; i += 1) {
            for (let j = y; j < y + box.size.y; j += 1) {
              for (let k = z + 1; k <= z + box.size.z; k += 1) {
                if (k === depth || voxels[world.getVoxel(i, j, k)] === 0 || map.has(`${i}:${j}:${k}`)) {
                  box.size.z = k - z;
                }
              }
            }
          }

          for (let i = x; i < x + box.size.x; i += 1) {
            for (let j = y; j < y + box.size.y; j += 1) {
              for (let k = z; k < z + box.size.z; k += 1) {
                map.set(`${i}:${j}:${k}`, true);
              }
            }
          }
        }
      }
    }
  }

  const buffer = new Uint8Array(boxes.length * 6);
  boxes.forEach(({ position, size }, i) => {
    buffer.set([
      position.x, position.y, position.z,
      size.x, size.y, size.z,
    ], i * 6);
  });
  return buffer;
}

export default ComputeIntersects;
