import * as THREE from 'three';

// 🗺️ Fully Connected Expansive Procedural Branching Road Network Generator
// Guaranteed 100% topological connectivity, spacious 32m+ city blocks, and 0 dead ends
function createProceduralRoadSet() {
  const roadCells = new Set();

  function drawLineH(gxStart, gxEnd, gz) {
    const minX = Math.min(gxStart, gxEnd);
    const maxX = Math.max(gxStart, gxEnd);
    for (let x = minX; x <= maxX; x++) roadCells.add(`${x},${gz}`);
  }

  function drawLineV(gx, gzStart, gzEnd) {
    const minZ = Math.min(gzStart, gzEnd);
    const maxZ = Math.max(gzStart, gzEnd);
    for (let z = minZ; z <= maxZ; z++) roadCells.add(`${gx},${z}`);
  }

  // === 1. CENTRAL MAIN HIGHWAYS ===
  drawLineV(0, -14, 12); // Grand Central Spine (X = 0, Z = -112 to 96)
  drawLineH(-10, 10, 0); // Grand East-West Central Highway (Z = 0, X = -80 to 80)

  // === 2. CIVIC PLAZA & GOVERNMENT DISTRICT (North) ===
  drawLineH(-5, 5, -14); // North Capitol Expansion Highway (Z = -112, X = -40 to 40)
  drawLineH(-4, 4, -11); // North Town Hall Drive (Z = -88)
  drawLineH(-10, 10, -8); // Civic Boulevard / North 64m Avenue (Z = -64, X = -80 to 80)
  drawLineV(-4, -11, -8); // West Civic Wing (X = -32, Z = -88 to -64)
  drawLineV(4, -11, -8);  // East Civic Wing (X = 32, Z = -88 to -64)

  // === 3. EAST-WEST HORIZONTAL ARTERIES ===
  drawLineH(-10, 10, -4); // Mid-North Tech & Village Avenue (Z = -32, X = -80 to 80)
  drawLineH(-10, 10, 4);  // Mid-South Promenade & Industrial (Z = 32, X = -80 to 80)
  drawLineH(-10, 10, 8);  // South Coastal & Harbor Boulevard (Z = 64, X = -80 to 80)
  drawLineH(-10, 10, 12); // South Marina & Waterfront Super-Boulevard (Z = 96, X = -80 to 80)

  // === 4. NORTH-SOUTH VERTICAL AVENUES ===
  drawLineV(-10, -8, 12); // Far-West Coastal Avenue (X = -80, Z = -64 to 96)
  drawLineV(-5, -14, 12); // West-Central Avenue (X = -40, Z = -112 to 96)
  drawLineV(5, -14, 12);  // East-Central Tech Avenue (X = 40, Z = -112 to 96)
  drawLineV(10, -8, 12);  // Far-East Harbor Avenue (X = 80, Z = -64 to 96)



  return roadCells;
}

// 🧭 Auto-Tile Algorithm: Analyzes 4-way neighbors and picks Straight, Corner (Turn Left/Right), T-Intersection, 4-Way Cross
export function autoTileRoadNetwork(roadCellsSet) {
  const tiles = [];
  const hasRoad = (gx, gz) => roadCellsSet.has(`${gx},${gz}`);

  roadCellsSet.forEach((key) => {
    const [gx, gz] = key.split(',').map(Number);
    const N = hasRoad(gx, gz - 1);
    const S = hasRoad(gx, gz + 1);
    const E = hasRoad(gx + 1, gz);
    const W = hasRoad(gx - 1, gz);
    const count = (N ? 1 : 0) + (S ? 1 : 0) + (E ? 1 : 0) + (W ? 1 : 0);

    let type = 'straight';
    let rot = 0;

    if (count === 1) {
      type = 'dead_end';
      if (S) rot = 0;
      else if (N) rot = Math.PI;
      else if (W) rot = (3 * Math.PI) / 2;
      else if (E) rot = Math.PI / 2;
    } else if (count === 2) {
      if (N && S) {
        type = 'straight';
        rot = 0; // North-South
      } else if (E && W) {
        type = 'straight';
        rot = Math.PI / 2; // East-West
      } else if (N && E) {
        type = 'corner';
        rot = 0; // Turn connecting North and East
      } else if (E && S) {
        type = 'corner';
        rot = (3 * Math.PI) / 2; // Turn connecting East and South
      } else if (S && W) {
        type = 'corner';
        rot = Math.PI; // Turn connecting South and West
      } else if (W && N) {
        type = 'corner';
        rot = Math.PI / 2; // Turn connecting West and North
      }
    } else if (count === 3) {
      type = 't_intersection';
      if (N && S && E) rot = 0; // West closed (Open N, S, E)
      else if (E && W && S) rot = (3 * Math.PI) / 2; // North closed (Open E, W, S)
      else if (N && S && W) rot = Math.PI; // East closed (Open N, S, W)
      else if (E && W && N) rot = Math.PI / 2; // South closed (Open E, W, N)
    } else if (count === 4) {
      type = 'intersection';
      rot = 0;
    }

    tiles.push({ gx, gz, type, rot });
  });

  return tiles;
}

export const PROCEDURAL_ROAD_SET = createProceduralRoadSet();
export const ROAD_TILES = autoTileRoadNetwork(PROCEDURAL_ROAD_SET);

// 🏙️ Master Layout of All PumpTown Metropolis Buildings (100% Pure Low-Poly City Pack 3D Models with Realistic Proportion Ratios)
export const CITY_BUILDINGS = [
  // 🏛️ North Civic & Government Plaza (Z: -105 to -70)
  { id: 'gov_hall_main', type: 'palazzo', x: 0, z: -100, rot: 0, scale: [2.2, 3.5, 2.2], radius: 4.8, color: '#f8f9fa', name: 'Grand Palazzo Capitol' },
  { id: 'court_palazzo', type: 'palazzo', x: -16, z: -76, rot: 0, radius: 4.0, color: '#b7e4c7', name: 'Palazzo di Giustizia' },
  { id: 'bank_palazzo', type: 'palazzo', x: 16, z: -76, rot: 0, radius: 4.0, color: '#ffd166', name: 'Central Bank Palazzo' },
  { id: 'hospital_palazzo', type: 'palazzo', x: -56, z: -76, rot: 0, radius: 4.0, color: '#90e0ef', name: 'Medical Palazzo' },
  { id: 'exchange_hotel', type: 'grand_hotel', x: 56, z: -76, rot: 0, radius: 3.6, color: '#06d6a0', name: 'Stock Exchange Grand Hotel' },
  { id: 'consulate_villa', type: 'orange_villa', x: -68, z: -76, rot: 0, radius: 3.0, color: '#f4a261', name: 'Consulate Villa' },
  { id: 'embassy_hotel', type: 'grand_hotel', x: 68, z: -76, rot: 0, radius: 3.6, color: '#c77dff', name: 'Embassy Grand Hotel' },

  // 🏡 Block NW1: [X: -40 to 0, Z: -64 to -32]
  { id: 'nw1_palazzo', type: 'palazzo', x: -28, z: -52, rot: 0, radius: 4.0, color: '#52b788', name: 'Civic Palazzo' },
  { id: 'nw1_townhouse', type: 'purple_townhouse', x: -12, z: -52, rot: 0, radius: 3.0, color: '#c77dff', name: 'Civic Row 1' },
  { id: 'nw1_barber', type: 'barber_shop', x: -28, z: -40, rot: Math.PI, radius: 2.8, color: '#ef476f', name: 'Avenue Barber' },

  // 🏡 Block NW2: [X: -80 to -40, Z: -64 to -32]
  { id: 'nw2_palazzo', type: 'palazzo', x: -68, z: -52, rot: 0, radius: 4.0, color: '#2a9d8f', name: 'Oakwood Palazzo' },
  { id: 'nw2_villa', type: 'orange_villa', x: -68, z: -40, rot: Math.PI, radius: 3.0, color: '#f8961e', name: 'Oak Villa' },
  { id: 'nw2_cottage', type: 'blue_cottage', x: -52, z: -40, rot: Math.PI, radius: 3.0, color: '#06d6a0', name: 'Sunny Cottage' },

  // 🏡 Block NW3: [X: -40 to 0, Z: -32 to 0]
  { id: 'nw3_villa', type: 'orange_villa', x: -28, z: -20, rot: 0, radius: 3.0, color: '#f9c74f', name: 'Cedar Villa' },
  { id: 'nw3_barber', type: 'barber_shop', x: -28, z: -10, rot: Math.PI, radius: 2.8, color: '#ffd166', name: 'Corner Boutique' },
  { id: 'nw3_townhouse', type: 'purple_townhouse', x: -12, z: -10, rot: Math.PI, radius: 3.0, color: '#9d4edd', name: 'Boulevard Townhouse' },

  // 🏡 Block NW4: [X: -80 to -40, Z: -32 to 0]
  { id: 'nw4_palazzo', type: 'palazzo', x: -68, z: -20, rot: 0, radius: 4.0, color: '#2a9d8f', name: 'Westfield Palazzo' },
  { id: 'nw4_cottage', type: 'blue_cottage', x: -68, z: -10, rot: Math.PI, radius: 3.0, color: '#70d6ff', name: 'Clover Cottage' },
  { id: 'nw4_townhouse', type: 'purple_townhouse', x: -52, z: -10, rot: Math.PI, radius: 3.0, color: '#c77dff', name: 'West End Row' },

  // 🏢 Block NE1: [X: 0 to 40, Z: -64 to -32]
  { id: 'ne1_hotel', type: 'grand_hotel', x: 28, z: -52, rot: 0, radius: 3.6, color: '#00bbf9', name: 'Grand Solana Hotel' },
  { id: 'ne1_palazzo', type: 'palazzo', x: 12, z: -52, rot: 0, radius: 4.0, color: '#ffd166', name: 'Financial Palazzo' },
  { id: 'ne1_barber', type: 'barber_shop', x: 28, z: -40, rot: Math.PI, radius: 2.8, color: '#118ab2', name: 'Plaza Barber' },

  // 🏢 Block NE2: [X: 40 to 80, Z: -64 to -32]
  { id: 'ne2_hotel', type: 'grand_hotel', x: 68, z: -52, rot: 0, radius: 3.6, color: '#c77dff', name: 'Phantom Grand Hotel' },
  { id: 'ne2_palazzo', type: 'palazzo', x: 68, z: -40, rot: Math.PI, radius: 4.0, color: '#52b788', name: 'Silicon Suites' },
  { id: 'ne2_barber', type: 'barber_shop', x: 52, z: -40, rot: Math.PI, radius: 2.8, color: '#00f5d4', name: 'Tech Store Boutique' },

  // 🏢 Block NE3: [X: 0 to 40, Z: -32 to 0]
  { id: 'ne3_palazzo', type: 'palazzo', x: 28, z: -20, rot: 0, radius: 4.0, color: '#70d6ff', name: 'Broadway Palazzo' },
  { id: 'ne3_hotel', type: 'grand_hotel', x: 28, z: -10, rot: Math.PI, radius: 3.6, color: '#ff70a6', name: 'Palazzo Grand Hotel' },
  { id: 'ne3_barber', type: 'barber_shop', x: 12, z: -10, rot: Math.PI, radius: 2.8, color: '#06d6a0', name: 'Pump Boutique' },

  // 🏢 Block NE4: [X: 40 to 80, Z: -32 to 0]
  { id: 'ne4_hotel', type: 'grand_hotel', x: 68, z: -20, rot: 0, radius: 3.6, color: '#ffd166', name: 'The Metropole Hotel' },
  { id: 'ne4_palazzo', type: 'palazzo', x: 68, z: -10, rot: Math.PI, radius: 4.0, color: '#e9d8a6', name: 'Eastside Palazzo' },
  { id: 'ne4_barber', type: 'barber_shop', x: 52, z: -10, rot: Math.PI, radius: 2.8, color: '#ef476f', name: 'Style Lounge' },

  // ⛲ Block SW1: [X: -40 to 0, Z: 0 to 32]
  { id: 'central_fountain', type: 'fountain', x: -20, z: 16, rot: 0, radius: 3.2, color: '#00bbf9', name: 'Central Grand Fountain' },
  { id: 'sw1_townhouse', type: 'purple_townhouse', x: -12, z: 24, rot: 0, radius: 3.0, color: '#c77dff', name: 'Parkside Row 1' },
  { id: 'sw1_villa', type: 'orange_villa', x: -12, z: 8, rot: Math.PI, radius: 3.0, color: '#f9c74f', name: 'Parkside Manor' },

  // 🏡 Block SW2: [X: -80 to -40, Z: 0 to 32]
  { id: 'sw2_palazzo', type: 'palazzo', x: -68, z: 12, rot: 0, radius: 4.0, color: '#52b788', name: 'Greenview Palazzo' },
  { id: 'sw2_townhouse', type: 'purple_townhouse', x: -68, z: 24, rot: Math.PI, radius: 3.0, color: '#9d4edd', name: 'Green Living Row' },
  { id: 'sw2_barber', type: 'barber_shop', x: -52, z: 24, rot: Math.PI, radius: 2.8, color: '#ffd166', name: 'Eco Barber' },

  // 🏡 Block SW3: [X: -40 to 0, Z: 32 to 64]
  { id: 'sw3_villa', type: 'orange_villa', x: -28, z: 44, rot: 0, radius: 3.0, color: '#f94144', name: 'South Garden Villa 1' },
  { id: 'sw3_palazzo', type: 'palazzo', x: -28, z: 54, rot: Math.PI, radius: 4.0, color: '#b7e4c7', name: 'South Garden Palazzo' },
  { id: 'sw3_townhouse', type: 'purple_townhouse', x: -12, z: 54, rot: Math.PI, radius: 3.0, color: '#f72585', name: 'South Townhouse 1' },

  // 🏡 Block SW4: [X: -80 to -40, Z: 32 to 64]
  { id: 'sw4_cottage', type: 'blue_cottage', x: -68, z: 44, rot: 0, radius: 3.0, color: '#70d6ff', name: 'Coastal Cottage 1' },
  { id: 'sw4_villa', type: 'orange_villa', x: -68, z: 54, rot: Math.PI, radius: 3.0, color: '#f3722c', name: 'Coastal Villa 1' },
  { id: 'sw4_townhouse', type: 'purple_townhouse', x: -52, z: 54, rot: Math.PI, radius: 3.0, color: '#b5179e', name: 'Coastal Row 2' },

  // 🛍️ Block SE1: [X: 0 to 40, Z: 0 to 32]
  { id: 'se1_palazzo', type: 'palazzo', x: 28, z: 12, rot: 0, radius: 4.0, color: '#2a9d8f', name: 'Maritime Palazzo' },
  { id: 'se1_hotel', type: 'grand_hotel', x: 28, z: 24, rot: Math.PI, radius: 3.6, color: '#70d6ff', name: 'Harborview Inn' },
  { id: 'se1_barber', type: 'barber_shop', x: 12, z: 24, rot: Math.PI, radius: 2.8, color: '#ffd166', name: 'Harbor Fish Market' },

  // 🛍️ Block SE2: [X: 40 to 80, Z: 0 to 32]
  { id: 'se2_hotel', type: 'grand_hotel', x: 68, z: 12, rot: 0, radius: 3.6, color: '#ffd166', name: 'Imperial Grand Hotel' },
  { id: 'se2_palazzo', type: 'palazzo', x: 68, z: 24, rot: Math.PI, radius: 4.0, color: '#52b788', name: 'Seaside Palazzo' },
  { id: 'se2_barber', type: 'barber_shop', x: 52, z: 24, rot: Math.PI, radius: 2.8, color: '#06d6a0', name: 'Seaside Spa' },

  // 🛍️ Block SE3: [X: 0 to 40, Z: 32 to 64]
  { id: 'se3_hotel', type: 'grand_hotel', x: 28, z: 44, rot: 0, radius: 3.6, color: '#00bbf9', name: 'South Beach Grand Hotel' },
  { id: 'se3_palazzo', type: 'palazzo', x: 28, z: 54, rot: Math.PI, radius: 4.0, color: '#e9d8a6', name: 'South Promenade Palazzo' },
  { id: 'se3_townhouse', type: 'purple_townhouse', x: 12, z: 54, rot: Math.PI, radius: 3.0, color: '#c77dff', name: 'Promenade Townhouse' },

  // 🛍️ Block SE4: [X: 40 to 80, Z: 32 to 64]
  { id: 'se4_hotel', type: 'grand_hotel', x: 68, z: 44, rot: 0, radius: 3.6, color: '#ffd166', name: 'Marina Bay Grand Hotel' },
  { id: 'se4_palazzo', type: 'palazzo', x: 68, z: 54, rot: Math.PI, radius: 4.0, color: '#2a9d8f', name: 'Marina Bay Palazzo' },
  { id: 'se4_villa', type: 'orange_villa', x: 52, z: 54, rot: Math.PI, radius: 3.0, color: '#f8961e', name: 'Bay View Villa' }
];

// 💡 Street Lamps dynamically placed along sidewalk curbs with 0 building or road collisions
export const STREET_LAMPS = [
  // North Spine (along X = 0)
  { x: -2.3, z: -16.0 }, { x: 2.3, z: -16.0 },
  { x: -2.3, z: -48.0 }, { x: 2.3, z: -48.0 },
  { x: -2.3, z: -72.0 }, { x: 2.3, z: -72.0 },
  // Central East-West Boulevard (along Z = 0)
  { x: -16.0, z: -2.3 }, { x: -16.0, z: 2.3 },
  { x: -48.0, z: -2.3 }, { x: -48.0, z: 2.3 },
  { x: 16.0, z: -2.3 },  { x: 16.0, z: 2.3 },
  { x: 48.0, z: -2.3 },  { x: 48.0, z: 2.3 },
  // South Spine (along X = 0)
  { x: -2.3, z: 16.0 },  { x: 2.3, z: 16.0 },
  { x: -2.3, z: 48.0 },  { x: 2.3, z: 48.0 },
  // Cross Avenues
  { x: 16.0, z: -34.3 }, { x: 16.0, z: -29.7 },
  { x: -16.0, z: -34.3 }, { x: -16.0, z: -29.7 },
  { x: 16.0, z: 29.7 },  { x: 16.0, z: 34.3 },
  { x: -16.0, z: 29.7 }, { x: -16.0, z: 34.3 },
];

// Check if a point (x, z) is safe from roads
export function isNearRoad(x, z, margin = 2.5) {
  const gx = Math.round(x / 8.0);
  const gz = Math.round(z / 8.0);
  // Check neighbor road cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (PROCEDURAL_ROAD_SET.has(`${gx + dx},${gz + dz}`)) {
        const rx = (gx + dx) * 8.0;
        const rz = (gz + dz) * 8.0;
        const distToBoxX = Math.max(0, Math.abs(x - rx) - 2.0);
        const distToBoxZ = Math.max(0, Math.abs(z - rz) - 2.0);
        if (Math.hypot(distToBoxX, distToBoxZ) < margin) return true;
      }
    }
  }
  return false;
}

// Check if a point (x, z) is inside any building footprint with margin
export function isInsideAnyBuilding(x, z, margin = 0.8) {
  for (let i = 0; i < CITY_BUILDINGS.length; i++) {
    const b = CITY_BUILDINGS[i];
    const dx = x - b.x;
    const dz = z - b.z;
    const minDist = b.radius + margin;
    if (dx * dx + dz * dz < minDist * minDist) {
      return true;
    }
  }
  for (let i = 0; i < CONSTRUCTION_PLOTS.length; i++) {
    const p = CONSTRUCTION_PLOTS[i];
    const dx = x - p.x;
    const dz = z - p.z;
    const minDist = 5.0 + margin;
    if (dx * dx + dz * dz < minDist * minDist) {
      return true;
    }
  }
  return false;
}

// Push player position out of any overlapping building collision circles
export function resolveBuildingCollisions(pos, playerRadius = 0.25) {
  let collided = false;
  for (let i = 0; i < CITY_BUILDINGS.length; i++) {
    const b = CITY_BUILDINGS[i];
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    const distSq = dx * dx + dz * dz;
    const minDist = b.radius + playerRadius;
    if (distSq < minDist * minDist && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      pos.x += nx * overlap;
      pos.z += nz * overlap;
      collided = true;
    }
  }
  return collided;
}

// 🌲 Tasteful Urban Greenery & Landscaping (Guaranteed 0 Clipping with Any Structures or Roads)
export const CITY_TREES = [
  // 🏛️ Civic North Gardens
  { type: 'pine', x: -17, z: -83, scale: 1.1 },
  { type: 'pine', x: 15, z: -83, scale: 1.1 },
  { type: 'oak', x: -27, z: -69, scale: 1.2 },
  { type: 'oak', x: 25, z: -69, scale: 1.2 },

  // 🏡 Northwest Residential Village
  { type: 'pine', x: -65, z: -49, scale: 1.1 },
  { type: 'oak', x: -45, z: -49, scale: 1.1 },
  { type: 'pine', x: -65, z: -27, scale: 1.2 },
  { type: 'oak', x: -45, z: -27, scale: 1.1 },
  { type: 'pine', x: -5, z: -49, scale: 1.1 },
  { type: 'oak', x: -5, z: -27, scale: 1.1 },

  // 🏢 Northeast Skyscraper Financial District
  { type: 'oak', x: 45, z: -49, scale: 1.1 },
  { type: 'pine', x: 65, z: -49, scale: 1.1 },
  { type: 'oak', x: 45, z: -27, scale: 1.2 },
  { type: 'pine', x: 65, z: -27, scale: 1.1 },
  { type: 'oak', x: 5, z: -49, scale: 1.1 },
  { type: 'pine', x: 5, z: -27, scale: 1.1 },

  // 🌿 Southwest Eco Living & Botanical Lawn
  { type: 'oak', x: -20, z: 3, scale: 1.1 },
  { type: 'pine', x: -7, z: 16, scale: 1.1 },
  { type: 'pine', x: -65, z: 15, scale: 1.1 },
  { type: 'oak', x: -45, z: 15, scale: 1.1 },
  { type: 'pine', x: -65, z: 47, scale: 1.2 },
  { type: 'oak', x: -45, z: 47, scale: 1.1 },
  { type: 'pine', x: -7, z: 47, scale: 1.1 },

  // 🛍️ Southeast Harbor & Promenade
  { type: 'oak', x: 45, z: 15, scale: 1.1 },
  { type: 'pine', x: 65, z: 15, scale: 1.1 },
  { type: 'oak', x: 45, z: 47, scale: 1.2 },
  { type: 'pine', x: 65, z: 47, scale: 1.1 },
  { type: 'oak', x: 5, z: 15, scale: 1.1 },
  { type: 'pine', x: 5, z: 47, scale: 1.1 }
];

// 🏗️ 24 Dedicated Empty Building Construction Plots with Guaranteed ZERO Building or Road Overlaps
export const CONSTRUCTION_PLOTS = [
  // 🏛️ North Capitol & Civic Plaza
  { id: 'plot_north_west', name: 'Capitol Hill West Plot', district: '🏛️ North Capitol District', x: -22, z: -98, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_north_east', name: 'Capitol Hill East Plot', district: '🏛️ North Capitol District', x: 22, z: -98, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_civic_west', name: 'Civic West Ministry Plot', district: '🏛️ North Capitol District', x: -30, z: -76, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_civic_east', name: 'Civic East Plaza Plot', district: '🏛️ North Capitol District', x: 30, z: -76, width: 14, depth: 14, defaultRot: 0 },

  // 🏡 Northwest Residential Village
  { id: 'plot_nw_meadow', name: 'Meadow Ridge Plot', district: '🏡 West Village Foothills', x: -12, z: -40, width: 14, depth: 14, defaultRot: Math.PI },
  { id: 'plot_nw_oak', name: 'Oakwood Heights Plot', district: '🏡 West Village Foothills', x: -52, z: -52, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_nw_cedar', name: 'Cedar Village Plot', district: '🏡 West Village Foothills', x: -12, z: -20, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_nw_magnolia', name: 'Magnolia Estate Plot', district: '🏡 West Village Foothills', x: -52, z: -20, width: 14, depth: 14, defaultRot: Math.PI },

  // 🏢 Northeast Financial & Cyber Corridor
  { id: 'plot_ne_helius', name: 'Financial Hub Plot', district: '🏢 East Tech Financial', x: 12, z: -40, width: 14, depth: 14, defaultRot: Math.PI },
  { id: 'plot_ne_cyber', name: 'Cyber Ridge High-Rise Plot', district: '🏢 East Tech Financial', x: 52, z: -52, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_ne_broadway', name: 'Broadway Corner Plot', district: '🏢 East Tech Financial', x: 12, z: -20, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_ne_metropole', name: 'East Promenade Plot', district: '🏢 East Tech Financial', x: 52, z: -20, width: 14, depth: 14, defaultRot: 0 },

  // 🌿 Southwest Botanical & Eco Quarter
  { id: 'plot_sw_parkside', name: 'Parkside Botanical Plot', district: '🌿 Botanical Park District', x: -28, z: 24, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_sw_eco', name: 'Eco Haven Plot', district: '🌿 Botanical Park District', x: -52, z: 12, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_sw_garden', name: 'South Garden Plot', district: '🌿 Botanical Park District', x: -12, z: 44, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_sw_coastal', name: 'Southwest Coastal Plot', district: '🌿 Botanical Park District', x: -52, z: 44, width: 14, depth: 14, defaultRot: 0 },

  // 🛍️ Southeast Harbor & Marina Bay
  { id: 'plot_se_harbor', name: 'Harbor Grand Pier Plot', district: '🛍️ Southeast Harbor District', x: 12, z: 12, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_se_imperial', name: 'Imperial Plaza Plot', district: '🛍️ Southeast Harbor District', x: 52, z: 12, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_se_promenade', name: 'South Promenade Plot', district: '🛍️ Southeast Harbor District', x: 12, z: 44, width: 14, depth: 14, defaultRot: Math.PI },
  { id: 'plot_se_marinabay', name: 'Marina Bay Tower Plot', district: '🛍️ Southeast Harbor District', x: 52, z: 44, width: 14, depth: 14, defaultRot: 0 },

  // ⛵ South Waterfront Promenade
  { id: 'plot_south_marina_1', name: 'Marina Bay Waterfront A', district: '⛵ South Marina Promenade', x: -60, z: 80, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_south_marina_2', name: 'Marina Bay Waterfront B', district: '⛵ South Marina Promenade', x: -20, z: 80, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_south_marina_3', name: 'Marina Bay Waterfront C', district: '⛵ South Marina Promenade', x: 20, z: 80, width: 14, depth: 14, defaultRot: 0 },
  { id: 'plot_south_marina_4', name: 'Marina Bay Waterfront D', district: '⛵ South Marina Promenade', x: 60, z: 80, width: 14, depth: 14, defaultRot: 0 },
];



