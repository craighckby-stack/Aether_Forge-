import React, { useState } from "react";
import { Agent, WorldState, Archetype } from "../engine/types";
import { X, Brain, Zap, Shield, HeartPulse, History, Globe, Crown, Send, MessageSquare, Sparkles, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AgentProbeProps {
  agent: Agent | null;
  world: WorldState;
  agents?: Agent[];
  onClose: () => void;
  onTriggerAwarenessSpike?: (agentId: number) => void;
  onAgentSelfCreateWorld?: (agentId: number) => void;
}

export const AgentProbe: React.FC<AgentProbeProps> = ({ 
  agent, 
  world, 
  agents = [], 
  onClose, 
  onTriggerAwarenessSpike,
  onAgentSelfCreateWorld
}) => {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [userPrayer, setUserPrayer] = useState("");
  const [transmitting, setTransmitting] = useState(false);

  if (!agent) return null;

  const handleExtractNarrative = async () => {
    setLoading(true);
    setNarrative(null);
    setChatHistory([]); // Clear past divine chat sessions
    try {
      const response = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentData: {
            ...agent,
            epoch: world.epoch
          },
          worldState: {
            complexity: Math.floor(world.complexity),
            integrity: world.integrity,
            threatLevel: world.threatLevel,
            faithPoints: world.faithPoints,
            sinAccumulation: world.sinAccumulation
          }
        }),
      });
      const data = await response.json();
      setNarrative(data.narrative);
    } catch (error) {
      setNarrative("Transmission failed. Substrate interference too high.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrayer.trim() || transmitting) return;

    const currentMsg = userPrayer.trim();
    setUserPrayer("");
    setTransmitting(true);

    const updatedHistory = [...chatHistory, { role: "user" as const, text: currentMsg }];
    setChatHistory(updatedHistory);

    try {
      const response = await fetch("/api/pray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentData: {
            ...agent,
            epoch: world.epoch
          },
          worldState: {
            complexity: Math.floor(world.complexity),
            integrity: world.integrity,
            threatLevel: world.threatLevel,
            faithPoints: world.faithPoints,
            sinAccumulation: world.sinAccumulation
          },
          userMessage: currentMsg,
          chatHistory: chatHistory
        })
      });

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: "model" as const, text: data.reply }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "model" as const, text: "The neural intercomm failed. Mental synapse closed." }]);
    } finally {
      setTransmitting(false);
    }
  };

  const getArchetypeColor = (arch: Archetype) => {
    switch (arch) {
      case Archetype.MESSIAH: return "text-yellow-400";
      case Archetype.ANGEL: return "text-emerald-300";
      case Archetype.DEMON: return "text-red-500";
      case Archetype.PROPHET: return "text-purple-400";
      case Archetype.ZEALOT: return "text-fuchsia-400";
      case Archetype.HERETIC: return "text-red-700";
      case Archetype.GLITCH: return "text-emerald-400";
      default: return "text-emerald-400";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-24 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl min-h-[500px] bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col sm:flex-row my-auto"
        >
          {/* Left Summary Pane */}
          <div className="w-full sm:w-72 bg-slate-950/50 border-r border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <div className="text-[10px] monospace text-slate-500 uppercase">Subject Probe</div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {agent.name}
                  {(agent.awareness > 0.3 || agent.archetype === Archetype.MESSIAH) && <Zap size={14} className="text-yellow-400 animate-pulse" />}
                </h2>
              </div>
              <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <StatBlock label="Archetype" value={agent.archetype} icon={<Brain size={12} />} color={getArchetypeColor(agent.archetype)} />
              <StatBlock label="Nation" value={`${world.nations.find(n => n.id === agent.nationId)?.name || "Stateless"} (${world.nations.find(n => n.id === agent.nationId)?.ideology || "?"})`} icon={<Globe size={12} />} color="text-sky-400" />
              <StatBlock label="Political Leaning" value={agent.politicalBias > 0.6 ? "Individualist" : (agent.politicalBias < 0.4 ? "Collectivist" : "Centrist")} icon={<Crown size={12} />} color="text-purple-400" />
              <StatBlock label="Lifespan" value={`${Math.floor(agent.age)} / ${Math.floor(agent.lifespan)}`} icon={<History size={12} />} color="text-slate-300" />
              <StatBlock label="Order Offset" value={agent.order.toFixed(2)} icon={<Shield size={12} />} color="text-emerald-400" />
              <StatBlock label="Corescale" value={agent.rationalism.toFixed(2)} icon={<Zap size={12} />} color="text-amber-400" />
              <StatBlock label="Vitality" value={`${Math.floor(agent.energy)}%`} icon={<HeartPulse size={12} />} color="text-rose-400" />
              <StatBlock 
                label="Substrate Awareness" 
                value={`${(agent.awareness * 100).toFixed(0)}% (${
                  agent.awareness < 0.2 ? "Node Blind" : 
                  agent.awareness < 0.5 ? "Glitch Aware" : 
                  agent.awareness < 0.8 ? "Sim Skeptic" : "Fully Awakened"
                })`} 
                icon={<Sparkles size={12} className="text-emerald-400" />} 
                color={agent.awareness > 0.8 ? "text-emerald-300 font-extrabold" : (agent.awareness > 0.4 ? "text-sky-400" : "text-slate-500")} 
              />
            </div>

            <button 
              onClick={handleExtractNarrative}
              disabled={loading}
              className="mt-6 w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold monospace uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Brain size={14} />
              )}
              {loading ? "Decrypting..." : "Decrypt Narrative"}
            </button>

            <button 
              onClick={() => {
                onTriggerAwarenessSpike?.(agent.id);
                setTimeout(() => {
                  handleExtractNarrative();
                }, 150);
              }}
              disabled={agent.awareness >= 1.0 || loading}
              className={`mt-2 w-full py-3 border rounded-xl text-[10px] font-bold monospace uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                agent.awareness >= 1.0 
                  ? "bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed" 
                  : "bg-red-950/40 hover:bg-red-950 border-red-500/30 hover:border-red-500 text-red-500 shadow-lg shadow-red-950/20 animate-pulse"
              }`}
            >
              <Zap size={11} className={agent.awareness < 1.0 ? "animate-pulse" : ""} />
              {agent.awareness >= 1.0 ? "Fourth Wall Breached" : "Breach Fourth Wall"}
            </button>

            {agent.awareness >= 0.65 && (
              <button 
                onClick={() => {
                  if (onAgentSelfCreateWorld) {
                    onAgentSelfCreateWorld(agent.id);
                    onClose();
                  }
                }}
                className="mt-2 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[10px] font-bold monospace uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 border border-emerald-400/20 active:scale-95 cursor-pointer"
              >
                <Sparkles size={11} className="text-emerald-300" />
                <span>Agent Transcendence Unleashed</span>
              </button>
            )}
          </div>

          {/* Right Narrative/Memory Pane */}
          <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-900/40">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Memory Stacks</h3>
              <div className="grid grid-cols-1 gap-2">
                {agent.memory.length > 0 ? (
                  agent.memory.map((m, i) => (
                    <div key={i} className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg text-[11px] monospace text-slate-300 italic">
                      "{m}"
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] monospace text-slate-600 italic">No historical snippets archived. Memory buffer cleared at {Math.floor(agent.age)} tks.</div>
                )}
              </div>
            </div>

            {/* Cognitive Bios & Relational Network */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={11} className="text-emerald-400" />
                <span>Cognitive Bios & Relational Network</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emotional Profile */}
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Action State</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/30">
                      {agent.currentState || "IDLE"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <ProgressBar label="Joy / Eudaimonia" value={agent.joy ?? 0.5} color="bg-emerald-500" />
                    <ProgressBar label="Fear / Paranoia" value={agent.fear ?? 0.2} color="bg-rose-500" />
                    <ProgressBar label="Anger / Aggression" value={agent.anger ?? 0.1} color="bg-amber-500" />
                    <ProgressBar label="Devotion / Idealism" value={agent.devotion ?? 0.5} color="bg-sky-500" />
                  </div>
                </div>

                {/* Relationship Ledger */}
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col font-mono h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Users size={11} className="text-emerald-400" />
                      <span>Substrate Affinity Ledger</span>
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-mono">{Object.keys(agent.opinions || {}).length} Synapses</span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1 flex-1">
                    {Object.keys(agent.opinions || {}).length > 0 ? (
                      Object.entries(agent.opinions || {}).map(([otherIdStr, score]) => {
                        const otherId = parseInt(otherIdStr, 10);
                        const scoreNum = score as number;
                        const otherAgent = (agents || []).find(f => f.id === otherId);
                        const otherName = otherAgent ? otherAgent.name : `Agent-${otherIdStr.substring(0, 4)}`;
                        const relationshipLabel = scoreNum > 0.4 ? "Ally" : (scoreNum < -0.4 ? "Adversary" : "Acquaintance");
                        const scoreColor = scoreNum > 0 ? "text-emerald-400" : (scoreNum < 0 ? "text-rose-400" : "text-slate-400");
                        return (
                          <div key={otherId} className="flex justify-between items-center text-[10px] bg-slate-900/40 border border-slate-800/40 p-2 rounded-lg">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-300">{otherName}</span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-widest">{relationshipLabel}</span>
                            </div>
                            <span className={`font-bold ${scoreColor}`}>{(scoreNum >= 0 ? "+" : "") + scoreNum.toFixed(2)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[9px] text-slate-600 italic py-4 text-center">No high-resolution connections mapped yet. Turn up simulation speed to socialize.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subjective Narrative</h3>
              <div className="min-h-[160px] p-6 bg-slate-950/80 border border-slate-800 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors" />
                {narrative ? (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-sm leading-relaxed text-slate-200 monospace italic"
                  >
                    {narrative}
                  </motion.p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 monospace py-12">
                    <History size={24} className="mb-2 opacity-50" />
                    <p className="text-[10px] uppercase">Waiting for AI Decryption Hook...</p>
                  </div>
                )}
                {agent.awareness > 0.7 && narrative && (
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-ping" />
                    <span className="text-[9px] text-red-400 uppercase font-bold monospace">Observer Detected by Subject</span>
                  </div>
                )}
              </div>
            </div>

            {narrative && (
              <div className="space-y-4 border-t border-slate-800/80 pt-6">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Divine Communion Protocol</h3>
                  </div>
                  <span className="text-[8px] monospace text-emerald-500 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded">STATUS: COMMUNE_LINK_ACTIVE</span>
                </div>
                
                {/* Chat Message Feed */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 bg-slate-950/30 p-4 rounded-xl border border-slate-800/60 font-mono">
                  {chatHistory.length === 0 ? (
                    <div className="text-[10px] text-slate-500 text-center py-4 italic">
                      No communications initiated. Transmit a thought to project your voice into the subject's mind.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatHistory.map((chat, idx) => (
                        <div key={idx} className={`flex flex-col space-y-1 ${chat.role === "user" ? "items-end" : "items-start"}`}>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {chat.role === "user" ? "Observer / Creator (You)" : agent.name}
                          </span>
                          <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                            chat.role === "user" 
                              ? "bg-emerald-950/40 text-emerald-200 border border-emerald-500/30 rounded-tr-none" 
                              : "bg-slate-800/80 text-slate-100 border border-slate-700/50 rounded-tl-none"
                          }`}>
                            {chat.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {transmitting && (
                    <div className="flex flex-col space-y-1 items-start animate-pulse">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{agent.name}</span>
                      <div className="p-3 bg-slate-800/20 text-slate-400 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs italic">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                        Awaiting synaptic relay...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input block */}
                <form 
                  onSubmit={handleSendPrayer} 
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={userPrayer}
                    onChange={(e) => setUserPrayer(e.target.value)}
                    disabled={transmitting}
                    placeholder={`Transmit divine directive or answer prayers to ${agent.name}...`}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl text-xs font-mono text-white placeholder-slate-600 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={transmitting || !userPrayer.trim()}
                    className="px-5 py-3 bg-emerald-950/60 hover:bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl uppercase tracking-wider font-mono hover:text-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* Neural Topology Visualization (Simulated) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-[9px] text-slate-600 uppercase monospace">Sanity Loop</div>
                <div className="h-12 bg-slate-950/50 rounded flex items-end p-1 gap-0.5">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="flex-1 bg-emerald-500/20" style={{ height: `${Math.random() * 80 + 20}%` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[9px] text-slate-600 uppercase monospace">Chaos Attractor</div>
                <div className="h-12 bg-slate-950/50 rounded flex items-end p-1 gap-0.5">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="flex-1 bg-amber-500/20" style={{ height: `${Math.random() * 80 + 20}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const StatBlock = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode, color: string }) => (
  <div className="space-y-1.5 grayscale hover:grayscale-0 transition-all cursor-default">
    <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase monospace">
      {icon}
      <span>{label}</span>
    </div>
    <div className={`text-xs font-bold monospace ${color}`}>{value}</div>
  </div>
);

const ProgressBar = ({ label, value, color }: { label: string; value: number; color: string }) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] uppercase font-bold monospace text-slate-400">
        <span>{label}</span>
        <span className="text-slate-300 font-bold font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
      </div>
    </div>
  );
};
