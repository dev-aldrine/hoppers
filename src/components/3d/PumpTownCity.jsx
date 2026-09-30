import React from 'react';
import { STREET_LAMPS, ROAD_TILES, CITY_BUILDINGS, CITY_TREES, CONSTRUCTION_PLOTS } from './cityData';
import { ModularRoadGrid } from './ModularRoads';
import { CartoonPineTree, CartoonOakTree } from './EnvironmentProps';
import {
  GLBOrangeVilla,
  GLBBlueCottage,
  GLBPurpleTownhouse,
  GLBGrandHotel,
  GLBPalazzo,
  GLBBarberShop,
  GLBStoneFountain,
  GLBParkBench,
  GLBCityLamp,
} from './CityGLBModels';
import { CityTraffic } from './CityTraffic';
import { ConstructionPlot3D } from './ConstructionPlot3D';

// 🏛️ Master Entity Renderer for all Low-Poly City Pack Buildings
function CityBuildingEntity({ building }) {
  const { type, x, z, rot = 0, scale, color, tint } = building;
  const pos = [x, 0, z];
  const rotation = [0, rot, 0];
  const tintColor = tint || color || null;

  switch (type) {
    case 'palazzo':
      return <GLBPalazzo position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'grand_hotel':
      return <GLBGrandHotel position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'orange_villa':
      return <GLBOrangeVilla position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'blue_cottage':
      return <GLBBlueCottage position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'purple_townhouse':
      return <GLBPurpleTownhouse position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'barber_shop':
      return <GLBBarberShop position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    case 'fountain':
      return <GLBStoneFountain position={pos} rotation={rotation} scale={scale} tint={tintColor} />;
    default:
      return null;
  }
}

// 🏙️ Complete Metropolis City Component using 100% Low-Poly City Pack GLB Models & Dynamic Construction Plots
export function PumpTownCity({ launchedBuildings = {}, onSelectPlot }) {
  return (
    <group name="pumptown-city">
      {/* 🛣️ Modular Grid Road Network */}
      <ModularRoadGrid tiles={ROAD_TILES} />

      {/* 🏙️ Dense Side-by-Side Metropolis Low-Poly GLB Buildings */}
      {CITY_BUILDINGS.map((building) => (
        <CityBuildingEntity key={building.id} building={building} />
      ))}

      {/* 🏗️ 8 Dynamic Construction Plots for Web3 / Phantom Launched Buildings */}
      {CONSTRUCTION_PLOTS.map((plot) => (
        <ConstructionPlot3D
          key={plot.id}
          plot={plot}
          launchedBuilding={launchedBuildings[plot.id] || null}
          onSelectPlot={onSelectPlot}
        />
      ))}

      {/* 🪑 Central Botanical Park Benches (Low-Poly GLB Pack) */}
      <GLBParkBench position={[-20, 0, 20]} rotation={[0, Math.PI, 0]} scale={2.5} />
      <GLBParkBench position={[-20, 0, 12]} rotation={[0, 0, 0]} scale={2.5} />
      <GLBParkBench position={[-14, 0, 16]} rotation={[0, Math.PI / 2, 0]} scale={2.5} />
      <GLBParkBench position={[-26, 0, 16]} rotation={[0, -Math.PI / 2, 0]} scale={2.5} />

      {/* 💡 Authentic Low-Poly City Street Lamps */}
      {STREET_LAMPS.map((lamp, i) => (
        <GLBCityLamp key={i} position={[lamp.x, 0, lamp.z]} scale={1.8} />
      ))}

      {/* 🌲 Tasteful Urban Greenery (Trees in Vacant Plots & Plazas) */}
      {CITY_TREES.map((tree, i) => {
        const pos = [tree.x, 0, tree.z];
        if (tree.type === 'pine') {
          return <CartoonPineTree key={`tree-${i}`} position={pos} scale={tree.scale} />;
        }
        return <CartoonOakTree key={`tree-${i}`} position={pos} scale={tree.scale} />;
      })}

      {/* 🚗 Dynamic Moving Traffic System (Taxis, Police Cruisers, Transit Buses, Sedans) */}
      <CityTraffic />
    </group>
  );
}

export default PumpTownCity;
