import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { WorldState, Agent, ResourceNode } from "../engine/types";

export const Viewport = ({ 
  agents, resources, world, isPaused, onUpdate, onSelectAgent, selectedAgentId,
  isStoryPlaying, setIsStoryPlaying, storyFrames
}: {
  agents: Agent[];
  resources: ResourceNode[];
  world: WorldState;
  isPaused?: boolean;
  onUpdate: (dt: number, width: number, height: number) => void;
  onSelectAgent: (id: number | null) => void;
  selectedAgentId: number | null;
  isStoryPlaying?: boolean;
  setIsStoryPlaying?: (v: boolean) => void;
  storyFrames?: { clock: number; agents: Partial<Agent>[]; nations: any[]; events: any[] }[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playbackProgress, setPlaybackProgress] = React.useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let playbackTime = 0;
    const PLAYBACK_DURATION = 15; // 15 seconds to replay the 10m chunks

    // Reset playback when story starts
    if (isStoryPlaying) {
      setPlaybackProgress(prev => prev === 0 ? prev : 0);
      playbackTime = 0;
    }

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      if (isStoryPlaying && storyFrames && storyFrames.length > 0) {
        playbackTime += dt;
        if (playbackTime >= PLAYBACK_DURATION) {
          setIsStoryPlaying?.(false);
          playbackTime = 0;
        } else {
          setPlaybackProgress(playbackTime / PLAYBACK_DURATION);
        }
      } else {
        if (containerRef.current) {
          onUpdate(dt, containerRef.current.clientWidth, containerRef.current.clientHeight);
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onUpdate, isStoryPlaying, storyFrames, setIsStoryPlaying]);

  let renderAgents = agents as Partial<Agent>[];
  let overlayEvents: any[] = [];
  
  if (isStoryPlaying && storyFrames && storyFrames.length > 0) {
     const frameIndex = Math.min(Math.floor(playbackProgress * storyFrames.length), storyFrames.length - 1);
     const frame = storyFrames[frameIndex];
     renderAgents = frame.agents;
     overlayEvents = frame.events || [];
  }

  return (
    <div ref={containerRef} className="absolute inset-0 bg-slate-950 overflow-hidden cursor-crosshair">
      <div 
        className="absolute w-[200px] h-[200px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ backgroundColor: world.integrity < 50 ? 'red' : '#10b981' }}
      />

      {/* Nation Regions */}
      {world.nations.map(nation => (
        <div
          key={nation.id}
          className="absolute rounded-full border border-dashed border-emerald-500/10 pointer-events-none flex items-center justify-center"
          style={{
            left: nation.center.x - 100,
            top: nation.center.y - 100,
            width: 200,
            height: 200,
            backgroundColor: `${nation.color}10`,
          }}
        >
          <span className="text-[8px] text-emerald-500/30 uppercase tracking-[0.4em] font-mono whitespace-nowrap">
            {nation.name} [{nation.ideology}]
          </span>
        </div>
      ))}

      {renderAgents.map(agent => (
        <motion.div
          key={agent.id}
          className="absolute w-2 h-2 rounded-full cursor-pointer z-10 transition-transform"
          style={{
            x: (typeof agent.x === 'number' && !isNaN(agent.x)) ? agent.x : 0,
            y: (typeof agent.y === 'number' && !isNaN(agent.y)) ? agent.y : 0,
            backgroundColor: agent.isSubstrateAware ? '#ec4899' : '#10b981',
            boxShadow: agent.id === selectedAgentId ? '0 0 10px 2px white' : 'none',
            opacity: isStoryPlaying ? 0.7 : 1
          }}
          onClick={() => agent.id && onSelectAgent?.(agent.id)}
        />
      ))}
      {!isStoryPlaying && resources.map(res => (
        <div
          key={res.id}
          className="absolute w-1.5 h-1.5 bg-emerald-600 rounded-sm opacity-60"
          style={{ 
            left: (typeof res.x === 'number' && !isNaN(res.x)) ? res.x : 0, 
            top: (typeof res.y === 'number' && !isNaN(res.y)) ? res.y : 0 
          }}
        />
      ))}

      {isStoryPlaying && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 pointer-events-none backdrop-blur-sm">
          <h2 className="text-2xl font-black text-emerald-400 monospace uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            Agent Transcendence Memoir
          </h2>
          <p className="text-slate-300 mt-2 text-sm uppercase tracking-widest monospace">
            Replaying the last 10 minutes of civilization
          </p>
          <div className="w-1/2 h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500" 
              style={{ width: `${playbackProgress * 100}%` }}
              layout
            />
          </div>
          <div className="mt-8 space-y-2 text-center max-w-xl">
            {overlayEvents.map((ev, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={ev.timestamp + idx}
                className="text-white monospace text-xs p-2 bg-emerald-900/40 border border-emerald-500/30 rounded"
              >
                {ev.message}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isPaused && !isStoryPlaying && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/40 pointer-events-none backdrop-blur-[2px]">
          <h2 className="text-2xl font-black text-rose-500 monospace uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
            SYSTEM SUSPENDED
          </h2>
          <p className="text-slate-300 mt-2 text-sm uppercase tracking-widest monospace">
            Observer intervention in progress.
          </p>
        </div>
      )}
    </div>
  );
};
