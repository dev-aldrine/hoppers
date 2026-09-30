// 🚦 Shared Real-Time Spatial Registry for Dynamic Traffic & Pedestrian Collision Avoidance
export const citizenPositions = new Map();
export const vehiclePositions = new Map();

export function registerCitizenPos(id, x, z) {
  citizenPositions.set(id, { x, z });
}

export function unregisterCitizenPos(id) {
  citizenPositions.delete(id);
}

export function registerVehiclePos(id, x, z, heading, speed) {
  vehiclePositions.set(id, { x, z, heading, speed });
}

export function unregisterVehiclePos(id) {
  vehiclePositions.delete(id);
}
