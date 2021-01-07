function GetLightColor(l1, l2, l3, l4, ao, lightChannels) {
  const color = ['r', 'g', 'b'].reduce((color, key) => {
    color[key] = Math.max(
      Math.min(
        (
          l1 ** 2 * lightChannels.light1[key]
          + l2 ** 2 * lightChannels.light2[key]
          + l3 ** 2 * lightChannels.light3[key]
          + l4 ** 2 * lightChannels.light4[key]
        ),
        1
      ),
      lightChannels.ambient[key]
    ) * ao;
    return color;
  }, {});
  color.avg = (color.r + color.g + color.b) / 3;
  return color;
}

function GetLighting(
  {
    light1,
    light2,
    light3,
    light4,
  },
  neighbors,
  lightChannels,
  maxLight
) {
  return neighbors.map((neighbors) => {
    let n1 = neighbors[0].type !== 0;
    let n2 = neighbors[1].type !== 0;
    let n3 = (n1 && n2) || neighbors[2].type !== 0;
    const ao = [n1, n2, n3].reduce((ao, n) => (
      ao - (n ? 0.1 : 0)
    ), 1);
    let c = 1;
    let l1 = light1;
    let l2 = light2;
    let l3 = light3;
    let l4 = light4;
    n1 = neighbors[0].type === 0;
    n2 = neighbors[1].type === 0;
    n3 = (n1 || n2) && neighbors[2].type === 0;
    [n1, n2, n3].forEach((n, i) => {
      if (n) {
        l1 += neighbors[i].light1;
        l2 += neighbors[i].light2;
        l3 += neighbors[i].light3;
        l4 += neighbors[i].light4;
        c += 1;
      }
    });
    l1 = l1 / c / maxLight;
    l2 = l2 / c / maxLight;
    l3 = l3 / c / maxLight;
    l4 = l4 / c / maxLight;
    return GetLightColor(l1, l2, l3, l4, ao, lightChannels);
  });
}

function PushFace(
  p1,
  p2,
  p3,
  p4,
  color,
  lighting,
  geometry
) {
  const vertices = [p1, p2, p3, p4];
  if (lighting[0].avg + lighting[2].avg < lighting[1].avg + lighting[3].avg) {
    lighting.unshift(lighting.pop());
    vertices.unshift(vertices.pop());
  }
  lighting.forEach((light) => geometry.color.push(
    (color.r / 0xFF) * light.r,
    (color.g / 0xFF) * light.g,
    (color.b / 0xFF) * light.b
  ));
  vertices.forEach((vertex) => geometry.position.push(...vertex));
  [0, 1, 2, 2, 3, 0].forEach((i) => geometry.index.push(geometry.offset + i));
  geometry.offset += 4;
}

function MeshVoxel(x, y, z, world, geometry) {
  const { fields } = world.constructor;
  const { config, voxels } = world;
  const { lightChannels, maxLight } = config;
  const get = (vx, vy, vz) => {
    const voxel = world.getVoxel(x + vx, y + vy, z + vz);
    return {
      type: voxels[voxel],
      color: {
        r: voxels[voxel + fields.r],
        g: voxels[voxel + fields.g],
        b: voxels[voxel + fields.b],
      },
      light1: voxels[voxel + fields.light1],
      light2: voxels[voxel + fields.light2],
      light3: voxels[voxel + fields.light3],
      light4: voxels[voxel + fields.light4],
    };
  };
  const voxel = get(0, 0, 0);
  const top = get(0, 1, 0);
  const bottom = get(0, -1, 0);
  const south = get(0, 0, 1);
  const north = get(0, 0, -1);
  const east = get(1, 0, 0);
  const west = get(-1, 0, 0);
  if (top.type === 0) {
    const ts = get(0, 1, 1);
    const tn = get(0, 1, -1);
    const te = get(1, 1, 0);
    const tw = get(-1, 1, 0);
    PushFace(
      [x, y + 1, z + 1],
      [x + 1, y + 1, z + 1],
      [x + 1, y + 1, z],
      [x, y + 1, z],
      voxel.color,
      GetLighting(
        top,
        [
          [tw, ts, get(-1, 1, 1)],
          [te, ts, get(1, 1, 1)],
          [te, tn, get(1, 1, -1)],
          [tw, tn, get(-1, 1, -1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
  if (bottom.type === 0) {
    const bs = get(0, -1, 1);
    const bn = get(0, -1, -1);
    const be = get(1, -1, 0);
    const bw = get(-1, -1, 0);
    PushFace(
      [x, y, z],
      [x + 1, y, z],
      [x + 1, y, z + 1],
      [x, y, z + 1],
      voxel.color,
      GetLighting(
        bottom,
        [
          [bw, bn, get(-1, -1, -1)],
          [be, bn, get(1, -1, -1)],
          [be, bs, get(1, -1, 1)],
          [bw, bs, get(-1, -1, 1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
  if (south.type === 0) {
    const st = get(0, 1, 1);
    const sb = get(0, -1, 1);
    const se = get(1, 0, 1);
    const sw = get(-1, 0, 1);
    PushFace(
      [x, y, z + 1],
      [x + 1, y, z + 1],
      [x + 1, y + 1, z + 1],
      [x, y + 1, z + 1],
      voxel.color,
      GetLighting(
        south,
        [
          [sw, sb, get(-1, -1, 1)],
          [se, sb, get(1, -1, 1)],
          [se, st, get(1, 1, 1)],
          [sw, st, get(-1, 1, 1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
  if (north.type === 0) {
    const nt = get(0, 1, -1);
    const nb = get(0, -1, -1);
    const ne = get(1, 0, -1);
    const nw = get(-1, 0, -1);
    PushFace(
      [x + 1, y, z],
      [x, y, z],
      [x, y + 1, z],
      [x + 1, y + 1, z],
      voxel.color,
      GetLighting(
        north,
        [
          [ne, nb, get(1, -1, -1)],
          [nw, nb, get(-1, -1, -1)],
          [nw, nt, get(-1, 1, -1)],
          [ne, nt, get(1, 1, -1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
  if (east.type === 0) {
    const et = get(1, 1, 0);
    const eb = get(1, -1, 0);
    const es = get(1, 0, 1);
    const en = get(1, 0, -1);
    PushFace(
      [x + 1, y, z + 1],
      [x + 1, y, z],
      [x + 1, y + 1, z],
      [x + 1, y + 1, z + 1],
      voxel.color,
      GetLighting(
        east,
        [
          [es, eb, get(1, -1, 1)],
          [en, eb, get(1, -1, -1)],
          [en, et, get(1, 1, -1)],
          [es, et, get(1, 1, 1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
  if (west.type === 0) {
    const wt = get(-1, 1, 0);
    const wb = get(-1, -1, 0);
    const ws = get(-1, 0, 1);
    const wn = get(-1, 0, -1);
    PushFace(
      [x, y, z],
      [x, y, z + 1],
      [x, y + 1, z + 1],
      [x, y + 1, z],
      voxel.color,
      GetLighting(
        west,
        [
          [wn, wb, get(-1, -1, -1)],
          [ws, wb, get(-1, -1, 1)],
          [ws, wt, get(-1, 1, 1)],
          [wn, wt, get(-1, 1, -1)],
        ],
        lightChannels,
        maxLight
      ),
      geometry
    );
  }
}

function MeshChunk(cx, cy, cz, world) {
  const { config, voxels } = world;
  const { chunkSize } = config;
  const geometry = {
    color: [],
    index: [],
    position: [],
    offset: 0,
  };
  cx *= chunkSize;
  cy *= chunkSize;
  cz *= chunkSize;
  for (let z = 0; z < chunkSize; z += 1) {
    const vz = cz + z;
    for (let y = 0; y < chunkSize; y += 1) {
      const vy = cy + y;
      for (let x = 0; x < chunkSize; x += 1) {
        const vx = cx + x;
        const voxel = world.getVoxel(vx, vy, vz);
        if (voxels[voxel] !== 0) {
          MeshVoxel(vx, vy, vz, world, geometry);
        }
      }
    }
  }
  const buffers = {
    color: new Float32Array(geometry.color),
    position: new Uint8Array(geometry.position),
    index: new Uint16Array(geometry.index),
  };
  return {
    buffers: [buffers.color.buffer, buffers.position.buffer, buffers.index.buffer],
    geometry: buffers,
  };
}

function Mesher(world) {
  const {
    chunkSize,
    width,
    height,
    depth,
  } = world.config;
  const buffers = [];
  const chunks = [];

  const cx = width / chunkSize;
  const cy = height / chunkSize;
  const cz = depth / chunkSize;

  for (let z = 0; z < cz; z += 1) {
    for (let y = 0; y < cy; y += 1) {
      for (let x = 0; x < cx; x += 1) {
        const chunk = MeshChunk(x, y, z, world);
        buffers.push(...chunk.buffers);
        chunks.push(chunk.geometry);
      }
    }
  }

  return { buffers, chunks };
}

export default Mesher;
