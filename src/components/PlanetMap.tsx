import React from "react";
import { WorldState, Agent } from "../engine/types";

export const PlanetMap = ({ world, agents, selectedAgentId }: { world: WorldState, agents: Agent[], selectedAgentId: number | null }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    if (mapRef.current) {
      setDims({ w: mapRef.current.clientWidth, h: mapRef.current.clientHeight });
    }
  }, []);

  // Assuming simulation width/height is ~1200x800 for scaling if not provided
  const scaleX = dims.w / 1200;
  const scaleY = dims.h / 800;

  return (
    <div ref={mapRef} className="w-full h-48 bg-slate-950 border border-emerald-900/40 rounded-xl relative overflow-hidden shadow-inner selection:bg-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#064e3b 1px, transparent 1px), linear-gradient(90deg, #064e3b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Nations */}
      {world.nations.map(n => (
        <div 
          key={n.id}
          className="absolute rounded-full border border-emerald-500/20"
          style={{
            left: (n.center.x * scaleX) - (15 * scaleX),
            top: (n.center.y * scaleY) - (15 * scaleY),
            width: 30 * scaleX,
            height: 30 * scaleY,
            backgroundColor: `${n.color}20`
          }}
        />
      ))}

      {/* Agents */}
      {agents.map(a => (
        <div 
          key={a.id}
          className={`absolute w-0.5 h-0.5 rounded-full ${a.id === selectedAgentId ? "bg-white scale-150 z-10 shadow-[0_0_5px_white]" : (a.isSubstrateAware ? "bg-pink-500" : "bg-emerald-500/60")}`}
          style={{
            left: a.x * scaleX,
            top: a.y * scaleY,
          }}
        />
      ))}

      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
        <div className="text-[7px] text-emerald-700 font-mono uppercase tracking-widest">
          Substrate Tracking Active
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-bold text-[8px] uppercase tracking-tighter">Global Map</p>
          <p className="text-emerald-600/80 text-[7px] font-mono">{world.phase}</p>
        </div>
      </div>
    </div>
  );
};
