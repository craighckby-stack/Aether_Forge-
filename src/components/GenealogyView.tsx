import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GitFork, Globe, Activity, Cpu, ShieldAlert, Check, X, LogIn, Plus, Sparkles, AlertCircle, Info, Calendar
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { EpochType, CosmicPhase, Ideology } from "../engine/types";

interface WorldNode {
  id: string;
  name: string;
  parentWorldId: string | null;
  creatorAgentId?: number | null;
  creatorAgentName?: string | null;
  creatorAgentArchetype?: string | null;
  clock?: number;
  complexity?: number;
  integrity?: number;
  population?: number;
  epoch?: EpochType;
  phase?: CosmicPhase;
  updatedAt?: number;
  agents?: any[];
  nations?: any[];
}

interface GenealogyViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorldId: string;
  onSelectWorld: (worldId: string) => void;
  onCreateNewWorld: (name: string, parentWorldId: string | null) => Promise<string | null>;
}

export const GenealogyView: React.FC<GenealogyViewProps> = ({
  isOpen,
  onClose,
  selectedWorldId,
  onSelectWorld,
  onCreateNewWorld
}) => {
  const [worlds, setWorlds] = useState<WorldNode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to the "worlds" collection in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "worlds"), (snapshot) => {
      const list: WorldNode[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || doc.id,
          parentWorldId: data.parentWorldId || null,
          creatorAgentId: data.creatorAgentId || null,
          creatorAgentName: data.creatorAgentName || null,
          creatorAgentArchetype: data.creatorAgentArchetype || null,
          clock: data.clock || 0,
          complexity: data.complexity || 0,
          integrity: data.integrity || 100,
          population: data.population || 0,
          epoch: data.epoch || EpochType.PRIMAL,
          phase: data.phase || CosmicPhase.GENESIS,
          updatedAt: data.updatedAt || 0,
          agents: data.agents || [],
          nations: data.nations || []
        });
      });

      // Ensure prime-resonance always exists in the local render list
      const hasPrime = list.some(w => w.id === "prime-resonance");
      if (!hasPrime) {
        list.unshift({
          id: "prime-resonance",
          name: "Prime Resonance [ROOT]",
          parentWorldId: null,
          creatorAgentName: "Direct Divine Origin",
          creatorAgentArchetype: "OBSERVER_DIVINE",
          clock: 0,
          complexity: 0,
          integrity: 100,
          population: 20,
          epoch: EpochType.PRIMAL,
          phase: CosmicPhase.GENESIS
        });
      }

      setWorlds(list);
    }, (error) => {
      console.warn("Could not synchronize world genealogy list:", error);
    });

    return () => unsub();
  }, []);

  // 2. Compute tree layout positions (X, Y) dynamically
  const layout = useMemo(() => {
    if (worlds.length === 0) return { nodes: [], connections: [], width: 500, height: 400 };

    // Build map parentId -> child Node IDs
    const worldMap: Record<string, string[]> = {};
    const nodesConfig: Record<string, WorldNode> = {};

    worlds.forEach(w => {
      nodesConfig[w.id] = w;
      if (w.parentWorldId) {
        if (!worldMap[w.parentWorldId]) {
          worldMap[w.parentWorldId] = [];
        }
        worldMap[w.parentWorldId].push(w.id);
      }
    });

    // Roots are nodes without parent, or parent ID doesn't exist
    const roots = worlds.filter(w => !w.parentWorldId || !nodesConfig[w.parentWorldId]).map(w => w.id);

    // Compute node depths
    const depthGroups: Record<number, string[]> = {};
    const nodeCoords: Record<string, { x: number; y: number; depth: number }> = {};

    const computeCoords = (id: string, currentDepth: number) => {
      if (!depthGroups[currentDepth]) {
        depthGroups[currentDepth] = [];
      }
      if (!depthGroups[currentDepth].includes(id)) {
        depthGroups[currentDepth].push(id);
      }
      
      const children = worldMap[id] || [];
      children.forEach(childId => computeCoords(childId, currentDepth + 1));
    };

    roots.forEach(rId => computeCoords(rId, 0));

    // Distribute X and Y based on depth levels
    const totalDepths = Object.keys(depthGroups).length;
    const nodeWidth = 260; // card spacing width
    const nodeHeight = 160; // card spacing height

    const finalNodes: Array<{ id: string; x: number; y: number; info: WorldNode }> = [];
    const connections: Array<{ fromId: string; toId: string; px1: number; py1: number; px2: number; py2: number }> = [];

    // Calculate maximum width to properly size the layout arena
    let maxGroupSize = 1;
    Object.values(depthGroups).forEach(group => {
      if (group.length > maxGroupSize) maxGroupSize = group.length;
    });

    const canvasWidth = Math.max(1000, maxGroupSize * 300 + 400);
    const canvasHeight = Math.max(600, totalDepths * 220 + 200);
    const centerX = canvasWidth / 2;

    Object.keys(depthGroups).forEach(dKey => {
      const depth = parseInt(dKey, 10);
      const group = depthGroups[depth];
      const levelWidth = (group.length - 1) * 300;

      group.forEach((id, idx) => {
        // Center-align each level group
        const x = centerX - (levelWidth / 2) + (idx * 300);
        const y = 80 + (depth * 200);

        nodeCoords[id] = { x, y, depth };
        finalNodes.push({ id, x, y, info: nodesConfig[id] });
      });
    });

    // Build connections with relative line attachment points
    worlds.forEach(w => {
      if (w.parentWorldId && nodeCoords[w.parentWorldId] && nodeCoords[w.id]) {
        const parentCoord = nodeCoords[w.parentWorldId];
        const childCoord = nodeCoords[w.id];

        connections.push({
          fromId: w.parentWorldId,
          toId: w.id,
          px1: parentCoord.x,
          py1: parentCoord.y + 65, // Bottom of parent card
          px2: childCoord.x,
          py2: childCoord.y - 65  // Top of child card
        });
      }
    });

    return {
      nodes: finalNodes,
      connections,
      width: canvasWidth,
      height: canvasHeight
    };
  }, [worlds]);

  const handleOpenCreateModal = (parentId: string | null) => {
    setCreateParentId(parentId);
    setNewWorldName(parentId ? `Generation ${layout.nodes.find(n => n.id === parentId)?.info.name.split(" ").pop() || ""} Sub-Matrix` : "Paradox Universe");
    setShowCreateModal(true);
  };

  const handleCreateSubmitted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const newId = await onCreateNewWorld(newWorldName.trim(), createParentId);
      if (newId) {
        setShowCreateModal(false);
        setNewWorldName("");
      } else {
        setErrorMsg("Failed to format or deploy new world configuration.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Unknown error during world creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50">
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tighter text-white monospace uppercase flex items-center gap-2">
              <GitFork className="rotate-90 text-emerald-400" size={16} />
              Viral Genealogy Lattice
            </h2>
            <p className="text-[10px] text-slate-500 monospace uppercase tracking-wider">
              Observe recursive parent-child descendants spawned by agent self-genesis & manual observer triggers.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenCreateModal(null)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] rounded font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
            >
              <Plus size={12} />
              Create Root World
            </button>
            <button 
              onClick={onClose}
              className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs monospace flex items-center gap-1 transition-colors border border-slate-700/50"
            >
              <X size={12} /> ESC
            </button>
          </div>
        </div>

        {/* Tree Arena */}
        <div className="flex-1 overflow-auto relative bg-slate-950/40 p-10 custom-scrollbar" ref={canvasRef}>
          {worlds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center animate-spin">
                <Globe size={18} className="text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 font-mono">Synthesizing substrate worlds collection...</p>
            </div>
          ) : (
            <div 
              style={{ width: layout.width, height: layout.height }} 
              className="relative min-w-full"
            >
              {/* SVG Connector Lines */}
              <svg 
                className="absolute inset-0 pointer-events-none w-full h-full"
                style={{ width: layout.width, height: layout.height }}
              >
                <defs>
                  <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {layout.connections.map((conn, idx) => {
                  const dx = conn.px2 - conn.px1;
                  const dy = conn.py2 - conn.py1;
                  const cp1y = conn.py1 + dy * 0.5;
                  const cp2y = conn.py2 - dy * 0.5;

                  return (
                    <g key={idx}>
                      <path
                        d={`M ${conn.px1} ${conn.py1} C ${conn.px1} ${cp1y}, ${conn.px2} ${cp2y}, ${conn.px2} ${conn.py2}`}
                        fill="none"
                        stroke="url(#emeraldGradient)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <circle 
                        cx={conn.px2} 
                        cy={conn.py2 - 4} 
                        r="3" 
                        fill="#10b981"
                        className="animate-pulse"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Node Cards */}
              {layout.nodes.map(node => {
                const isActive = node.id === selectedWorldId;
                const creatorText = node.info.creatorAgentName 
                  ? `${node.info.creatorAgentName} (${node.info.creatorAgentArchetype || "CREATOR"})`
                  : "Original Substrate";

                return (
                  <div
                    key={node.id}
                    className="absolute transition-transform duration-300"
                    style={{
                      left: (typeof node.x === 'number' && !isNaN(node.x)) ? node.x - 130 : 0, // nodeWidth / 2
                      top: (typeof node.y === 'number' && !isNaN(node.y)) ? node.y - 65 : 0,  // nodeHeight / 2
                      width: 260,
                      height: 130
                    }}
                  >
                    <div 
                      className={`h-full border rounded-xl p-4 flex flex-col justify-between transition-all ${
                        isActive 
                          ? "bg-slate-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30" 
                          : "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                      }`}
                    >
                      {/* Name / Badge */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-white uppercase monospace truncate tracking-tight">{node.info.name}</span>
                          <span className="text-[8px] text-slate-500 monospace truncate">Id: {node.id.substring(0, 16)}...</span>
                        </div>
                        {isActive && (
                          <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider monospace animate-pulse border border-emerald-500/20 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] text-slate-400 monospace">
                        <div className="flex items-center gap-1 min-w-0">
                          <Globe size={8} className="text-emerald-400 shrink-0" />
                          <span className="truncate">Era: {node.info.epoch}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <Activity size={8} className="text-emerald-400 shrink-0" />
                          <span className="truncate">Pop: {node.info.population}</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2 min-w-0 mt-0.5 border-t border-slate-800/50 pt-0.5">
                          <Calendar size={8} className="text-slate-600 shrink-0" />
                          <span className="truncate text-slate-500">Gen: {creatorText}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 items-center border-t border-slate-800/80 pt-2 shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => onSelectWorld(node.id)}
                            className="flex-1 py-1 hover:bg-emerald-300 hover:text-slate-950 border border-slate-700 hover:border-emerald-400 rounded text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all text-emerald-300 font-mono"
                          >
                            <LogIn size={8} /> Teleport
                          </button>
                        ) : (
                          <div className="flex-1 py-1 text-center bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-extrabold rounded text-[8px] font-mono select-none flex items-center justify-center gap-1 uppercase tracking-widest">
                            <Check size={8} /> Selected
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenCreateModal(node.id)}
                          title="Spawn child universe"
                          className="p-1 border border-slate-700/80 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 rounded hover:bg-emerald-500/10 transition-all shrink-0"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inner Create Matrix Prompt */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
            >
              <motion.form 
                onSubmit={handleCreateSubmitted}
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-black tracking-widest text-emerald-400 monospace uppercase flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-pulse" />
                    Engineer New Sub-Matrix
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  {createParentId ? (
                    <div className="flex gap-2 p-2 rounded bg-emerald-950/20 border border-emerald-500/20 items-center">
                      <GitFork size={12} className="text-emerald-400 shrink-0" />
                      <p className="text-[9px] text-emerald-200 monospace">
                        Parent Universe: <span className="text-yellow-400 font-bold">{layout.nodes.find(n => n.id === createParentId)?.info.name}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2 p-2 rounded bg-slate-950 border border-slate-800 items-center">
                      <Globe size={12} className="text-emerald-400 shrink-0" />
                      <p className="text-[9px] text-slate-400 monospace">
                        New root simulation starting independent of parent lineage.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-500 uppercase monospace font-bold tracking-widest block">Universe IdentName</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Neo Prime, Glitch Sanctuary, Chronos-X..."
                      value={newWorldName}
                      onChange={(e) => setNewWorldName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white monospace focus:outline-none focus:border-emerald-500 rounded transition-colors"
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex gap-2 p-2 rounded bg-red-950/20 border border-red-500/30 text-red-400 items-center">
                      <AlertCircle size={12} className="shrink-0" />
                      <p className="text-[9px] monospace leading-relaxed">{errorMsg}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-slate-800/80 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:text-white transition-colors text-[9px] uppercase font-bold tracking-wider rounded font-mono text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 font-black text-slate-950 text-[9px] uppercase tracking-widest rounded font-mono disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                        Forging...
                      </>
                    ) : "Engage Genesis"}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
