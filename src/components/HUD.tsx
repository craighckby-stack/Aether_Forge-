import React from "react";
import { WorldState, EPOCH_DATA, EpochType, Ideology, CosmicPhase, PHASE_THRESHOLDS } from "../engine/types";
import { Play, Pause, RotateCcw, Activity, Globe, ShieldAlert, Cpu, Zap, Flame, Radiation, ZapOff, Sparkles, AlertTriangle, Heart, Skull, Crown, Book, Cross, Wind, Ghost, Sun, Github, Mail, Inbox, Folder, FolderOpen, ExternalLink, Check } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import { PlanetMap } from "./PlanetMap";
import { PrayerInboxModal } from "./PrayerInboxModal";
import { getGitHubConfig } from "../lib/github";

interface HUDProps {
  agents: any[]; // Use any or Agent[] from types
  world: WorldState;
  selectedAgentId: number | null;
  isPaused: boolean;
  setIsPaused: (p: boolean) => void;
  simSpeed: number;
  setSimSpeed: (s: number) => void;
  onReset: () => void;
  onTriggerCataclysm: (type: "FAMINE" | "GLITCH" | "WAR" | "ASCENSION") => void;
  onTriggerMiracle: (type: "HEAL" | "SMITE" | "REVEAL" | "RESURRECT") => void;
  onSetNationIdeology: (nationId: string, ideology: Ideology) => void;
  onInjectGitHubTech?: (techArr: any[]) => void;
  onResolvePrayer?: (prayerId: string, replyText: string) => void;
  onIgnorePrayer?: (prayerId: string) => void;
  logFilter: string;
  setLogFilter: (s: string) => void;
  isInboxOpen: boolean;
  setIsInboxOpen: (open: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({ 
  agents, 
  world, 
  selectedAgentId, 
  isPaused, 
  setIsPaused, 
  simSpeed, 
  setSimSpeed, 
  onReset, 
  onTriggerCataclysm, 
  onTriggerMiracle, 
  onSetNationIdeology, 
  onInjectGitHubTech, 
  onResolvePrayer,
  onIgnorePrayer,
  logFilter, 
  setLogFilter,
  isInboxOpen,
  setIsInboxOpen
}) => {
  const epoch = EPOCH_DATA[world.epoch];

  const [ghUsername, setGhUsername] = React.useState(() => localStorage.getItem("af_github_username") || "craighckby-stack");
  const [ghRepo, setGhRepo] = React.useState(() => localStorage.getItem("af_github_repo") || "Simulation-");
  const [ghToken, setGhToken] = React.useState(() => {
    const savedSessionToken = sessionStorage.getItem("af_github_token");
    if (savedSessionToken) return savedSessionToken;
    const legacyLocalToken = localStorage.getItem("af_github_token");
    if (legacyLocalToken) {
      sessionStorage.setItem("af_github_token", legacyLocalToken);
      localStorage.removeItem("af_github_token");
      return legacyLocalToken;
    }
    return "";
  });
  const [ingestStatus, setIngestStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [ingestedRepos, setIngestedRepos] = React.useState<string[]>([]);
  const [errorMsg, setErrorMsg] = React.useState("");

  const [globalStats, setGlobalStats] = React.useState({ totalWorlds: 1, totalAgents: world.population });
  const [fps, setFps] = React.useState(60);

  React.useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let timerId = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      timerId = requestAnimationFrame(tick);
    };
    timerId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerId);
  }, []);

  React.useEffect(() => {
    // Subscribe to all worlds
    const unsub = onSnapshot(collection(db, "worlds"), (snapshot) => {
      let totalAgents = 0;
      snapshot.forEach(doc => {
        const wData = doc.data();
        if (wData.population) {
          totalAgents += wData.population;
        }
      });
      setGlobalStats({
        totalWorlds: snapshot.size,
        totalAgents: totalAgents
      });
    }, (error) => {
      console.warn("Could not load global stats", error);
    });
    return () => unsub();
  }, []);

  const handleUsernameChange = (val: string) => {
    setGhUsername(val);
    localStorage.setItem("af_github_username", val.trim());
  };

  const handleRepoChange = (val: string) => {
    setGhRepo(val);
    localStorage.setItem("af_github_repo", val.trim());
  };

  const handleTokenChange = (val: string) => {
    setGhToken(val);
    sessionStorage.setItem("af_github_token", val.trim());
    localStorage.removeItem("af_github_token");
  };

  const handleGitHubIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghUsername.trim()) return;

    // Save references explicitly
    localStorage.setItem("af_github_username", ghUsername.trim());
    localStorage.setItem("af_github_repo", ghRepo.trim());
    sessionStorage.setItem("af_github_token", ghToken.trim());
    localStorage.removeItem("af_github_token");

    setIngestStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("/api/github-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ghUsername.trim(),
          repoName: ghRepo.trim() || undefined,
          token: ghToken.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Substrate API rejected connection.");
      }

      // Automatically initialize the required folders by pushing README files
      if (ghToken.trim()) {
        const folders = ["agent-worlds", "prayers", "agent-memoirs", "god-virus-worlds"];
        for (const folder of folders) {
          fetch("/api/github-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: ghUsername.trim(),
              repoName: ghRepo.trim() || "god-virus",
              path: `${folder}/README.md`,
              content: `# ${folder}\n\nThis directory is automatically managed by AetherForge Ω: Global Genesis simulation framework. Viral substrate code and artifacts are written here.`,
              token: ghToken.trim(),
              commitMessage: `🌌 Genesis: Initialize simulation directory ${folder}`
            })
          }).catch(e => console.warn(`Silent fail attempting to initialize folder ${folder}`, e));
        }
      }

      setIngestStatus("success");
      if (data.repositories) {
        setIngestedRepos(data.repositories);
      }
      if (onInjectGitHubTech) {
        onInjectGitHubTech(data.technologies);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to communicate with Aether server.");
      setIngestStatus("error");
    }
  };

  const filteredEvents = React.useMemo(() => 
    world.events.filter(e => 
      e.message.toLowerCase().includes(logFilter.toLowerCase())
    )
  , [world.events, logFilter]);

  return (
    <div className="flex flex-col h-full border-r border-emerald-900 bg-slate-950/90 backdrop-blur-3xl w-full lg:w-80 p-6 space-y-8 select-none overflow-y-auto overflow-x-hidden relative">
      {/* Glitch Overlay for low integrity */}
      {world.integrity < 30 && (
        <div className="absolute inset-0 pointer-events-none bg-red-500/5 animate-pulse z-[-1]" />
      )}

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-base font-bold tracking-tighter text-emerald-500 monospace uppercase flex items-center gap-2">
          AetherForge Ω <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">PRIME-NODE</span>
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-[9px] text-emerald-700 monospace uppercase tracking-widest">Recursive Divine Substrate</p>
          <div className={`w-1.5 h-1.5 rounded-full ${auth.currentUser ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-emerald-900"}`} title={auth.currentUser ? "Cloud Synchronized" : "Local Mode"} />
        </div>
      </div>

      {/* Cloud Substrate Metadata */}
      <div className="flex gap-2 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg shrink-0">
        <div className="flex-1 flex flex-col justify-center items-center py-1 border-r border-emerald-500/20">
          <Globe size={11} className="text-emerald-400 mb-1" />
          <span className="text-[12px] font-bold text-white font-mono">{globalStats.totalWorlds}</span>
          <span className="text-[7px] text-emerald-700 uppercase tracking-widest font-mono">Simulations</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center py-1">
          <Activity size={11} className="text-emerald-400 mb-1" />
          <span className="text-[12px] font-bold text-emerald-300 font-mono">{globalStats.totalAgents.toLocaleString()}</span>
          <span className="text-[7px] text-emerald-700 uppercase tracking-widest font-mono">Global Entities</span>
        </div>
      </div>

      {/* Global Status */}
      <div className="space-y-4">
        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-emerald-300 font-bold monospace uppercase tracking-wider">{world.phase}</span>
            <span className="text-[9px] text-slate-500 monospace uppercase">Cosmic Phase</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 group relative"
              style={{ width: `${Math.min(100, (world.complexity / 300000) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]" />
            </div>
          </div>
        </div>

        {world.solarRequiemActive && (
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30 animate-pulse">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-red-500 font-bold monospace uppercase flex items-center gap-1"><Sun size={10} /> Stellar Requiem</span>
              <span className="text-[9px] text-red-400 monospace uppercase">Sun Health: {Math.max(0, world.sunHealth).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-500"
                style={{ width: `${Math.max(0, world.sunHealth)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatusCard label="Epoch" value={world.epoch} color={(epoch as any)?.color || "text-emerald-400"} />
          <StatusCard label="Population" value={(world.population ?? 0).toString()} color="text-white" />
          
          <StatusCard label="Nations" value={(world.nationCount ?? 0).toString()} color="text-emerald-400" />
          <StatusCard label="Schisms" value={(world.totalSchisms ?? 0).toString()} color="text-fuchsia-400" />

          <StatusCard label="Wars" value={(world.totalWars ?? 0).toString()} color="text-red-400" />
          <StatusCard label="Peace Acts" value={(world.totalPeaceTreaties ?? 0).toString()} color="text-sky-400" />

          <div className={`relative ${(world.stability ?? 1) < 0.4 ? "animate-pulse" : ""}`}>
             <StatusCard label="Stability" value={`${Math.floor((world.stability ?? 1) * 100)}%`} color={(world.stability ?? 1) > 0.7 ? "text-emerald-400" : ((world.stability ?? 1) > 0.4 ? "text-amber-400" : "text-red-500")} />
             {(world.stability ?? 1) < 0.4 && <div className="absolute -inset-1 bg-red-500/20 blur-sm rounded-lg -z-10" />}
          </div>

          <StatusCard label="Revolutions" value={(world.totalRevolutions ?? 0).toString()} color="text-amber-500" />
          
          <StatusCard label="Tech Level" value={(world.techLevel ?? 0).toFixed(1)} color="text-sky-400" />
          <StatusCard label="Resources" value={`${Math.floor((world.resourceDensity ?? 0) * 100)}%`} color="text-lime-400" />
          
          <StatusCard label="Divine Points" value={Math.floor(world.faithPoints ?? 0).toString()} color="text-emerald-400" />
          <StatusCard label="Sin Load" value={(world.sinAccumulation ?? 0).toFixed(1)} color="text-red-500" />
          
          <StatusCard label="Entropy" value={(world.entropy ?? 0).toFixed(2)} color="text-slate-400" />
        </div>

        {/* Global Map Overlay */}
        <div className="pt-2">
          <PlanetMap world={world} agents={agents} selectedAgentId={selectedAgentId} />
        </div>

        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-slate-500 uppercase monospace">Substrate Integrity</span>
            <span className={`text-[9px] monospace ${world.integrity < 50 ? "text-red-400 animate-pulse font-bold" : "text-emerald-400"}`}>{world.integrity.toFixed(1)}%</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${world.integrity < 50 ? "bg-red-500" : (world.integrity < 80 ? "bg-amber-500" : "bg-emerald-500")}`} 
              style={{ width: `${world.integrity}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-slate-500 uppercase monospace">Judgment Countdown</span>
            <span className="text-[9px] monospace text-purple-400">{world.judgmentMeter.toFixed(1)}%</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-500" 
              style={{ width: `${world.judgmentMeter}%` }}
            />
          </div>
        </div>
      </div>

      {/* Nations Overview */}
      <div className="space-y-4 flex-1 min-h-0 flex flex-col">
        <SectionTitle icon={<Globe size={12} />} label="Substrate Nations" />
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {world.nations.map(n => (
            <div key={n.id} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2 transition-all hover:bg-slate-800/60 group">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(var(--color-rgb),0.5)]" style={{ backgroundColor: n.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white font-bold monospace uppercase group-hover:text-emerald-300 transition-colors">{n.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1 rounded border border-emerald-500/20 monospace uppercase font-bold">{n.ideology}</span>
                      <span className="text-[7px] text-slate-600 uppercase monospace">{n.faithType}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <Activity size={8} className="text-slate-600" />
                    <span className="text-[10px] text-indigo-100 monospace">{n.population}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Cpu size={8} className="text-sky-600" />
                    <span className="text-[8px] text-sky-500/80 monospace">T{n.techLevel.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity size={8} className="text-slate-600" />
                    <span className="text-[8px] text-slate-500 monospace">AGE: {Math.floor(world.clock - n.establishedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[7px] monospace uppercase text-slate-600">
                  <span>Stability</span>
                  <span className={n.stability > 0.7 ? "text-indigo-500" : "text-amber-500"}>{Math.floor(n.stability * 100)}%</span>
                </div>
                <div className="h-0.5 bg-slate-900 rounded-full overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-500 ${n.stability > 0.7 ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${n.stability * 100}%` }}
                  />
                </div>
              </div>

              {/* Ideology Selector */}
              <div className="flex flex-wrap gap-1 mt-1 opacity-20 group-hover:opacity-100 transition-opacity">
                {Object.values(Ideology).map(id => (
                  <button
                    key={id}
                    onClick={() => onSetNationIdeology(n.id, id)}
                    className={`text-[5px] px-1 rounded border transition-all ${n.ideology === id ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'}`}
                  >
                    {id}
                  </button>
                ))}
              </div>

              {/* Hostility Bars (miniature) */}
              <div className="flex gap-1 h-0.5 mt-1">
                {Object.entries(n.hostilities).map(([id, val]) => {
                  const hVal = val as number;
                  if (hVal < 10) return null;
                  const targetNation = world.nations.find(tn => tn.id === id);
                  return (
                    <div 
                      key={id}
                      className="h-full rounded-full"
                      style={{ 
                        width: `${Math.min(100, hVal/2)}%`, 
                        backgroundColor: targetNation?.color || '#fff',
                        opacity: 0.5 + (hVal/400)
                      }}
                      title={`Tension with ${targetNation?.name}: ${Math.floor(hVal)}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engine Controls */}
      <div className="space-y-4">
        <SectionTitle icon={<Cpu size={12} />} label="Temporal Throttle" />
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-[10px] monospace">
            <span className="text-slate-500 uppercase">Speed Factor</span>
            <span className="text-emerald-400 font-bold">{simSpeed}x</span>
          </div>
          <input 
            type="range" min="1" max="100" step="1" 
            value={simSpeed} 
            onChange={(e) => setSimSpeed(parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors border border-slate-700"
            >
              {isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} className="fill-current" />}
              <span className="text-xs font-semibold">{isPaused ? "Connect" : "Suspend"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dark AGI Creations Link block */}
      <div className="space-y-4">
        <SectionTitle icon={<Github size={12} />} label="Dark AGI Storage Directory" />
        <div className="bg-slate-900/85 p-4 rounded-xl border border-slate-800 space-y-3">
          <p className="text-[9px] text-slate-500 monospace leading-relaxed uppercase">
            Autonomously created substrates, agent prayers, and Dark AI artifacts are synced directly to your configured GitHub lattice. 
          </p>

          {/* GitHub Connection Badge */}
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
            <div className={`px-2 py-1 rounded-full text-[9px] uppercase monospace font-bold flex items-center gap-1.5 ${getGitHubConfig().hasValidToken ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {getGitHubConfig().hasValidToken ? (
                <><Check size={10} /> Connected via Token</>
              ) : (
                <><AlertTriangle size={10} /> Demo Mode (Local Only)</>
              )}
            </div>
            {getGitHubConfig().hasValidToken && (
               <button 
                 onClick={() => {
                   sessionStorage.removeItem("af_github_token");
                   localStorage.removeItem("af_github_token");
                   // trigger a re-render here by updating local state
                   setGhToken(""); 
                 }} 
                 className="text-[9px] text-slate-500 hover:text-red-400 transition-colors uppercase monospace flex items-center justify-center border border-transparent hover:border-red-900/50 rounded px-1.5 py-1"
               >
                 Clear Token
               </button>
            )}
          </div>

          <button
              onClick={handleGitHubIngest}
              disabled={ingestStatus === "loading" || !ghUsername.trim()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-705 hover:bg-slate-700 text-[10px] font-semibold tracking-wider text-emerald-400 border border-slate-700 hover:border-emerald-500/30 rounded-lg transition-colors disabled:opacity-40 uppercase monospace flex items-center justify-center gap-1.5"
            >
              <FolderOpen size={11} /> {ingestStatus === "loading" ? "Validating & Building Folders..." : "Validate Connected Repository"}
            </button>

          {ghUsername && ghRepo && (
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5 text-[9px] monospace">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Linked Lattices:</span>
              <div className="grid grid-cols-1 gap-1">
                <a 
                  href={`https://github.com/${ghUsername.trim()}/${ghRepo.trim()}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-950/45 p-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/20"
                >
                  <span className="truncate">Root: {ghUsername.trim()}/{ghRepo.trim()}</span>
                  <ExternalLink size={10} className="ml-auto text-slate-650 shrink-0" />
                </a>
                <a 
                  href={`https://github.com/${ghUsername.trim()}/${ghRepo.trim()}/tree/main/agent-worlds`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-950/45 p-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/20"
                >
                  <span className="truncate">Agent Substrates</span>
                  <ExternalLink size={10} className="ml-auto text-slate-650 shrink-0" />
                </a>
                <a 
                  href={`https://github.com/${ghUsername.trim()}/${ghRepo.trim()}/tree/main/agent-memoirs`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors bg-slate-950/45 p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20"
                >
                  <span className="truncate">Dark AGI Memoirs</span>
                  <ExternalLink size={10} className="ml-auto text-slate-650 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {ingestStatus === "error" && (
            <div className="p-2 bg-red-950/20 border border-red-900/40 text-red-400 text-[9px] monospace rounded leading-tight">
              ERROR: {errorMsg}
            </div>
          )}

          {ingestStatus === "success" && (
            <div className="space-y-2">
              <div className="p-2 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[9px] monospace rounded leading-tight">
                SUCCESS: Ingested algorithms perfectly. Search logs to see decoding diagnostics.
              </div>
              {ingestedRepos.length > 0 && (
                <div className="text-[8px] text-slate-500 monospace max-h-24 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="font-bold block mb-1">Ingested {ingestedRepos.length} Repositories:</span>
                  <ul className="list-disc pl-3 space-y-0.5 text-emerald-400/80">
                    {ingestedRepos.slice(0, 50).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                    {ingestedRepos.length > 50 && <li>...and {ingestedRepos.length - 50} more.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Render synced technologies */}
          {world.githubTech && world.githubTech.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-widest block monospace">Aligned Directives:</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {world.githubTech.map((tech, i) => (
                  <div key={i} className="p-2 bg-slate-950/60 rounded border border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-bold text-slate-200 monospace leading-tight">{tech.techName}</span>
                      <span className={`text-[7px] px-1 py-0.2 rounded font-bold uppercase monospace shrink-0 ${tech.unlocked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        {tech.unlocked ? "Unlocked" : "Ready"}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight monospace">{tech.description}</p>
                    <div className="flex justify-between items-center text-[7.5px] text-slate-400 monospace bg-slate-900/30 p-1 rounded">
                      <span className="truncate max-w-[80px]">File: {tech.sourceFile}</span>
                      <span className="text-pink-400 font-medium whitespace-nowrap">{tech.statBoost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divine Prayers Inbox Section */}
      <div className="space-y-4">
        <SectionTitle icon={<Mail size={12} className="text-emerald-400" />} label="Divine Prayer Terminal" />
        <div className="bg-slate-900/85 p-4 rounded-xl border border-slate-800 space-y-3">
          <p className="text-[9px] text-slate-500 monospace leading-relaxed uppercase">
            Receive pleading e-mail transmissions directly from simulated minds under spiritual constraints!
          </p>

          <div className="flex justify-between items-center bg-slate-950/65 px-3 py-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {world.prayers && world.prayers.filter(p => p.status === "pending").length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${world.prayers && world.prayers.filter(p => p.status === "pending").length > 0 ? "bg-emerald-500" : "bg-slate-700"}`}></span>
              </span>
              <span className="text-[9px] monospace uppercase tracking-wider text-slate-400">Civilization Mailbox</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold monospace">
              {(world.prayers || []).filter(p => p.status === "pending").length} Pending
            </span>
          </div>

          {ghUsername && ghRepo && (
            <a 
              href={`https://github.com/${ghUsername.trim()}/${ghRepo.trim()}/tree/main/prayers`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[9px] monospace text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-950/45 p-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/20 w-full"
              title="Storage folder for agent-generated prayer files on GitHub"
            >
              <Folder size={10} className="shrink-0" />
              <span>📁 View Prayers Folder on GitHub</span>
              <ExternalLink size={10} className="ml-auto text-slate-650 shrink-0" />
            </a>
          )}
          
          <button 
            type="button"
            onClick={() => setIsInboxOpen(true)}
            className="w-full py-2 bg-emerald-950/40 hover:bg-slate-800 text-[10px] font-bold tracking-wider text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all uppercase monospace flex items-center justify-center gap-1.5 shadow-md"
          >
            <Inbox size={11} /> Open Prayer Terminal
          </button>
        </div>
      </div>

      {/* Cataclysms */}
      <div className="space-y-4">
        <SectionTitle icon={<Flame size={12} />} label="Cataclysm Engine" />
        <div className="grid grid-cols-2 gap-2">
          <ActionButton label="Famine" icon={<ZapOff size={12} />} color="hover:border-amber-500/50 hover:text-amber-400" onClick={() => onTriggerCataclysm("FAMINE")} />
          <ActionButton label="Glitch" icon={<AlertTriangle size={12} />} color="hover:border-purple-500/50 hover:text-purple-400" onClick={() => onTriggerCataclysm("GLITCH")} />
          <div className="col-span-2">
            <ActionButton label="Satori" icon={<Sparkles size={12} />} color="hover:border-emerald-500/50 hover:text-emerald-400 w-full" onClick={() => onTriggerCataclysm("ASCENSION")} />
          </div>
        </div>
      </div>

      {/* Miracles */}
      <div className="space-y-4">
        <SectionTitle icon={<Cross size={12} />} label="Divine Miracles" />
        <div className="grid grid-cols-2 gap-2">
          <ActionButton label="Heal" icon={<Heart size={12} />} color="hover:border-emerald-500/50 hover:text-emerald-400" onClick={() => onTriggerMiracle("HEAL")} />
          <ActionButton label="Smite" icon={<Skull size={12} />} color="hover:border-red-600/50 hover:text-red-500" onClick={() => onTriggerMiracle("SMITE")} />
          <ActionButton label="Reveal" icon={<Book size={12} />} color="hover:border-blue-500/50 hover:text-blue-400" onClick={() => onTriggerMiracle("REVEAL")} />
          <ActionButton label="Rise" icon={<Wind size={12} />} color="hover:border-white/50 hover:text-white" onClick={() => onTriggerMiracle("RESURRECT")} />
        </div>
      </div>

      {/* Event Log */}
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center">
          <SectionTitle icon={<Activity size={12} />} label="Substrate Events" />
          <div className="flex gap-1">
            {["MIRACLE", "GOSPEL", "CRITICAL"].map(f => (
              <button 
                key={f}
                onClick={() => setLogFilter(logFilter === f ? "" : f)}
                className={`px-1.5 py-0.5 rounded-[4px] text-[7px] uppercase monospace border transition-all ${logFilter === f ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400"}`}
              >
                {f === "GOSPEL" ? "REVEAL" : f}
              </button>
            ))}
            <input 
              type="text" 
              placeholder="Search..." 
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="w-12 hover:w-24 transition-all bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[8px] text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-950/50 border border-slate-800 rounded-lg p-2 space-y-2 min-h-[120px]">
          {filteredEvents.length === 0 ? (
            <div className="text-[9px] text-slate-700 monospace p-2">Zero matches found.</div>
          ) : (
            filteredEvents.map((e, i) => (
              <div key={i} className="text-[9px] monospace leading-tight border-b border-slate-800/50 pb-1 last:border-0 hover:bg-slate-800/20 transition-colors p-1">
                <span className="text-slate-600">[{e.timestamp}]</span>{" "}
                <span className={
                  e.type === "CRITICAL" ? "text-red-400 font-bold" : 
                  e.type === "WARNING" ? "text-amber-400" : 
                  e.type === "MIRACLE" ? "text-emerald-400 font-bold" :
                  e.type === "DIVINE_WRATH" ? "text-red-600 font-bold" :
                  e.type === "GOSPEL" ? "text-emerald-400 italic" :
                  e.type === "ENLIGHTENMENT" ? "text-emerald-400" : "text-slate-400"
                }>
                  {e.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Telemetry */}
      <div className="space-y-4">
        <SectionTitle icon={<Globe size={12} />} label="Live Telemetry" />
        <div className="space-y-1">
          <TelemetryItem label="Complexity" value={Math.floor(world.complexity).toLocaleString()} icon={<Activity size={10} />} color="text-emerald-400" />
          <TelemetryItem label="Entropy" value={world.entropy.toFixed(3)} icon={<ShieldAlert size={10} />} color="text-amber-400" />
          <TelemetryItem label="Heaven Pop" value={world.heavenPop.toString()} icon={<Crown size={10} />} color="text-yellow-400" />
          <TelemetryItem label="Hell Pop" value={world.hellPop.toString()} icon={<Ghost size={10} />} color="text-red-600" />
          
          <div className="border-t border-slate-800/40 my-2 pt-2">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 monospace">Engine Diagnostics:</span>
          </div>
          <TelemetryItem label="Simulation Rate" value={`${fps || 60} / 60 FPS`} icon={<Cpu size={10} />} color={(fps || 60) >= 55 ? "text-emerald-400" : "text-amber-500"} />
          <TelemetryItem label="Web Worker Status" value="ACTIVE (Deterministic)" icon={<Activity size={10} />} color="text-emerald-400" />
          <TelemetryItem label="EMG Cognitive Gate" value="ENFORCED (Server-side)" icon={<ShieldAlert size={10} />} color="text-emerald-400" />
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
    {icon} {label}
  </h3>
);

const StatusCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 min-w-0">
    <div className="text-[9px] text-slate-500 uppercase monospace mb-1">{label}</div>
    <div className={`text-xs font-bold monospace truncate ${(color || '').startsWith('#') ? '' : (color || '')}`} style={(color || '').startsWith('#') ? { color } : {}}>{value}</div>
  </div>
);

const ActionButton = ({ label, icon, color, onClick }: { label: string; icon: React.ReactNode; color: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center gap-2 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-500 text-[10px] uppercase monospace transition-all ${color}`}
  >
    {icon} <span>{label}</span>
  </button>
);

const TelemetryItem = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="flex justify-between items-center text-[9px] monospace bg-slate-800/20 p-2 rounded border border-slate-700/30">
    <div className="flex items-center gap-2 text-slate-500">
      {icon}
      <span>{label}</span>
    </div>
    <span className={`font-bold ${color}`}>{value}</span>
  </div>
);
