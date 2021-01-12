class World {
  constructor(config) {
    const { fields } = World;
    const { width, height, depth } = config;
    this.config = config;
    this.voxels = new Uint8ClampedArray(width * height * depth * fields.count);
  }

  getVoxel(x, y, z) {
    const { fields } = World;
    const { width, height, depth } = this.config;
    if (x < 0) x += width;
    if (x >= width) x -= width;
    if (y < 0) y += height;
    if (y >= height) y -= height;
    if (z < 0) z += depth;
    if (z >= depth) z -= depth;
    return (
      ((z * width * height) + (y * width) + x) * fields.count
    );
  }

  floodLight(queue, field) {
    const { voxelNeighbors } = World;
    const { voxels } = this;
    while (queue.length) {
      const { x, y, z } = queue.shift();
      const light = voxels[this.getVoxel(x, y, z) + field];
      voxelNeighbors.forEach((offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        const voxel = this.getVoxel(nx, ny, nz);
        const nl = light - 1;
        if (
          voxels[voxel] !== 0
          || voxels[voxel + field] >= nl
        ) {
          return;
        }
        voxels[voxel + field] = nl;
        queue.push({ x: nx, y: ny, z: nz });
      });
    }
  }

  removeLight(x, y, z, field) {
    const { voxelNeighbors } = World;
    const { voxels } = this;
    const voxel = this.getVoxel(x, y, z);
    const fill = [];
    const queue = [];
    queue.push({
      x,
      y,
      z,
      light: voxels[voxel + field],
    });
    voxels[voxel + field] = 0;
    while (queue.length) {
      const {
        x,
        y,
        z,
        light,
      } = queue.shift();
      voxelNeighbors.forEach((offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        const voxel = this.getVoxel(nx, ny, nz);
        const nl = voxels[voxel + field];
        if (nl === 0) {
          return;
        }
        if (nl < light) {
          queue.push({
            x: nx,
            y: ny,
            z: nz,
            light: nl,
          });
          voxels[voxel + field] = 0;
        } else if (nl >= light) {
          fill.push({
            x: nx,
            y: ny,
            z: nz,
          });
        }
      });
    }
    this.floodLight(fill, field);
  }

  load(data) {
    const { fields } = World;
    const { config, voxels } = this;
    const { width, height, depth } = config;
    const lightQueues = [[], [], [], []];
    for (let z = 0, i = 0, j = 0; z < depth; z += 1) {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1, i += fields.count, j += 4) {
          const type = data[j];
          voxels[i] = type;
          voxels[i + fields.r] = data[j + 1];
          voxels[i + fields.g] = data[j + 2];
          voxels[i + fields.b] = data[j + 3];
          if (type > 1) {
            const light = type - 1;
            lightQueues[light - 1].push({ x, y, z });
            voxels[i + fields[`light${light}`]] = config.maxLight;
          }
        }
      }
    }
    this.floodLight(lightQueues[0], fields.light1);
    this.floodLight(lightQueues[1], fields.light2);
    this.floodLight(lightQueues[2], fields.light3);
    this.floodLight(lightQueues[3], fields.light4);
  }

  pick(x, y, z) {
    const { fields } = World;
    const { voxels } = this;
    const voxel = this.getVoxel(x, y, z);
    return {
      type: voxels[voxel],
      r: voxels[voxel + fields.r],
      g: voxels[voxel + fields.g],
      b: voxels[voxel + fields.b],
    };
  }

  update(
    x,
    y,
    z,
    type,
    r,
    g,
    b
  ) {
    const { fields, voxelNeighbors } = World;
    const { config, voxels } = this;
    const voxel = this.getVoxel(x, y, z);
    const current = voxels[voxel];
    voxels[voxel] = type;
    voxels[voxel + fields.r] = type !== 0 ? r : 0;
    voxels[voxel + fields.g] = type !== 0 ? g : 0;
    voxels[voxel + fields.b] = type !== 0 ? b : 0;
    if (current > 1) {
      this.removeLight(x, y, z, fields[`light${current - 1}`]);
    } else if (current === 0 && type !== 0) {
      ['light1', 'light2', 'light3', 'light4'].forEach((field) => {
        if (voxels[voxel + fields[field]] !== 0) {
          this.removeLight(x, y, z, fields[field]);
        }
      });
    }
    if (type > 1) {
      const field = `light${type - 1}`;
      voxels[voxel + fields[field]] = config.maxLight;
      this.floodLight([{ x, y, z }], fields[field]);
    } else if (type === 0 && current !== 0) {
      ['light1', 'light2', 'light3', 'light4'].forEach((field) => {
        const queue = [];
        voxelNeighbors.forEach((offset) => {
          const nx = x + offset.x;
          const ny = y + offset.y;
          const nz = z + offset.z;
          const nv = this.getVoxel(nx, ny, nz);
          if (voxels[nv + fields[field]] !== 0) {
            queue.push({ x: nx, y: ny, z: nz });
          }
        });
        this.floodLight(queue, fields[field]);
      });
    }
  }
}

World.fields = {
  type: 0,
  r: 1,
  g: 2,
  b: 3,
  light1: 4,
  light2: 5,
  light3: 6,
  light4: 7,
  count: 8,
};

World.voxelNeighbors = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];

export default World;
