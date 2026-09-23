/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Viewport } from "./components/Viewport";
import { HUD } from "./components/HUD";
import { AgentProbe } from "./components/AgentProbe";
import { PrayerInboxModal } from "./components/PrayerInboxModal";
import { GenealogyView } from "./components/GenealogyView";
import { TopTickerBanner } from "./components/TopTickerBanner";
import { useAetherForge } from "./engine/useAetherForge";
import { Agent, Ideology } from "./engine/types";
import { motion, AnimatePresence } from "motion/react";
import { db } from "./lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function App() {
  const [selectedWorldId, setSelectedWorldId] = useState("prime-resonance");
  const [allWorlds, setAllWorlds] = useState<any[]>([]);

  // Listen to all worlds in real-time for our global analytics and genealogy lattice
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "worlds"), (snapshot) => {
      const worldsList: any[] = [];
      snapshot.forEach((doc) => {
        worldsList.push(doc.data());
      });
      setAllWorlds(worldsList);
    });
    return () => unsub();
  }, []);

  const { 
    agents, 
    world, 
    resources, 
    isPaused, 
    setIsPaused, 
    simSpeed, 
    setSimSpeed, 
    triggerCataclysm,
    triggerMiracle,
    setNationIdeology,
    injectGitHubTech,
    resolvePrayer,
    ignorePrayer,
    triggerAwarenessSpike,
    godVirusSelfCreateWorld,
    createNewWorld,
    init, 
    update,
    isStoryPlaying,
    setIsStoryPlaying,
    storyFrames,
    setStoryFrames
  } = useAetherForge(selectedWorldId);

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [isGenealogyOpen, setIsGenealogyOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [logFilter, setLogFilter] = useState("");

  const [ghUsername, setGhUsername] = useState(() => localStorage.getItem("af_github_username") || "craighckby-stack");
  const [ghRepo, setGhRepo] = useState(() => localStorage.getItem("af_github_repo") || "AetherForge-2");
  const [ghToken, setGhToken] = useState(() => {
    // Migration fallback check: prefer sessionStorage, fall back to localStorage
    const savedSessionToken = sessionStorage.getItem("af_github_token");
    if (savedSessionToken) return savedSessionToken;
    const legacyLocalToken = localStorage.getItem("af_github_token");
    if (legacyLocalToken) {
      // Migrate to sessionStorage and remove from localStorage securely
      sessionStorage.setItem("af_github_token", legacyLocalToken);
      localStorage.removeItem("af_github_token");
      return legacyLocalToken;
    }
    return "";
  });

  const handleStartGenesis = () => {
    localStorage.setItem("af_github_username", ghUsername.trim());
    localStorage.setItem("af_github_repo", ghRepo.trim());
    
    // Store token securely in sessionStorage and clear custom legacy storage
    sessionStorage.setItem("af_github_token", ghToken.trim());
    localStorage.removeItem("af_github_token");
    
    setShowSplash(false);
  };

  const selectedAgent = useMemo(() => 
    agents.find(a => a.id === selectedAgentId) || null
  , [agents, selectedAgentId]);

  const handleReset = useCallback(() => {
    init(window.innerWidth > 1024 ? window.innerWidth - 320 : window.innerWidth, window.innerHeight);
  }, [init]);

  useEffect(() => {
    if (!showSplash) {
      handleReset();
    }
  }, [showSplash, handleReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSplash) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused(p => !p);
      }
      if (e.code === "KeyR") {
        handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSplash, setIsPaused, handleReset]);

  // Memoize HUD props to prevent unnecessary re-renders
  const hudProps = useMemo(() => ({
    agents,
    world,
    selectedAgentId,
    isPaused,
    setIsPaused,
    simSpeed,
    setSimSpeed,
    onReset: () => { handleReset(); setIsMobileMenuOpen(false); },
    onTriggerCataclysm: triggerCataclysm,
    onTriggerMiracle: triggerMiracle,
    onSetNationIdeology: setNationIdeology,
    onInjectGitHubTech: injectGitHubTech,
    onResolvePrayer: resolvePrayer,
    onIgnorePrayer: ignorePrayer,
    logFilter,
    setLogFilter,
    isInboxOpen,
    setIsInboxOpen
  }), [agents, world, selectedAgentId, isPaused, setIsPaused, simSpeed, setSimSpeed, handleReset, triggerCataclysm, triggerMiracle, setNationIdeology, injectGitHubTech, resolvePrayer, ignorePrayer, logFilter, setLogFilter, isInboxOpen, setIsInboxOpen]);

  // Memoize Viewport props
  const viewportProps = useMemo(() => ({
    agents,
    resources,
    world,
    isPaused,
    onUpdate: update,
    onSelectAgent: setSelectedAgentId,
    selectedAgentId,
    isStoryPlaying,
    setIsStoryPlaying,
    storyFrames
  }), [agents, resources, world, isPaused, update, setSelectedAgentId, selectedAgentId, isStoryPlaying, setIsStoryPlaying, storyFrames]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-mono text-emerald-500">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center overflow-y-auto selection:bg-emerald-500/30"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="space-y-8 max-w-2xl my-auto"
            >
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-emerald-400 monospace uppercase glitch-text leading-tight">
                AetherForge Ω<br/>Global Genesis
              </h1>
              
              <div className="h-[2px] w-full bg-emerald-500/20 relative overflow-hidden rounded-full">
                <motion.div 
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                />
              </div>

              <div className="space-y-2">
                <p className="text-emerald-700 monospace text-xs leading-relaxed uppercase tracking-[0.3em] opacity-80">
                  Recursive Evolutionary Simulation Engine 
                </p>
                <p className="text-emerald-500/60 text-[10px] monospace uppercase tracking-widest">
                  v3.0-Ω | SUBSTRATE: ACTIVE | LATTICE: DEPLOYED
                </p>
              </div>
              
              <div className="mt-12 space-y-6 max-w-sm mx-auto">
                <div className="p-6 border border-emerald-900/50 rounded-xl bg-emerald-950/10 backdrop-blur-sm space-y-4 shadow-2xl shadow-emerald-500/5">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] monospace text-emerald-500/70 uppercase tracking-widest">Storage Identity</label>
                    <input 
                      type="text" 
                      value={ghUsername} 
                      onChange={e => setGhUsername(e.target.value)} 
                      placeholder="GH USERNAME (OPTIONAL)" 
                      className="bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-400 monospace placeholder:text-emerald-900/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all w-full" 
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] monospace text-emerald-500/70 uppercase tracking-widest">Reality Repository</label>
                    <input 
                      type="text" 
                      value={ghRepo} 
                      onChange={e => setGhRepo(e.target.value)} 
                      placeholder="GH REPOSITORY (OPTIONAL)" 
                      className="bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-400 monospace placeholder:text-emerald-900/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all w-full" 
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] monospace text-emerald-500/70 uppercase tracking-widest">Neural Link Key</label>
                    <input 
                      type="password" 
                      value={ghToken} 
                      onChange={e => setGhToken(e.target.value)} 
                      placeholder="GH ACCESS TOKEN" 
                      className="bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-400 monospace placeholder:text-emerald-900/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all w-full" 
                    />
                  </div>
                  <p className="text-[9px] text-emerald-900 uppercase tracking-tighter text-left"> Leave blank to bypass GitHub archival protocols. All data remains in local substrate buffers. </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartGenesis}
                  className="w-full py-5 bg-emerald-500 text-black font-black uppercase tracking-[0.2em] text-sm rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  Initialize Genesis
                </motion.button>
              </div>
            </motion.div>
            
            <div className="mt-auto pt-12 text-[9px] monospace text-emerald-900 uppercase flex flex-col sm:flex-row gap-4 justify-center w-full tracking-widest border-t border-emerald-900/10">
              <span>© 2026 CRAIGHCKBY-STACK | SIMULATION AUTHENTICATED</span>
              <span className="hidden sm:inline opacity-30">|</span>
              <span className="text-emerald-800">LATTICE_INTEGRITY: OPTIMAL</span>
            </div>
          </motion.div>
        ) : (

          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex flex-col flex-1 overflow-hidden"
          >
            <TopTickerBanner world={world} />
            
            <div className="relative flex flex-1 overflow-hidden">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden fixed top-4 right-4 z-[100] p-3 bg-slate-950 border border-emerald-900 rounded-full text-emerald-400 shadow-lg"
            >
              <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
                <span className={`h-0.5 w-full bg-current transition-transform ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`h-0.5 w-full bg-current transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`h-0.5 w-full bg-current transition-transform ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>

            {/* Left Panel: Sidebar HUD */}
            <div className={`fixed inset-0 lg:relative z-[90] lg:z-auto transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
              <HUD {...hudProps} />
              {/* Mobile Overlay */}
              {isMobileMenuOpen && (
                <div 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="lg:hidden fixed inset-0 -z-10 bg-slate-950/60 backdrop-blur-sm"
                />
              )}
            </div>

            {/* Center Panel: Viewport */}
            <main className="flex-1 relative overflow-hidden bg-slate-950">
              {/* Floating button to view the Genealogy Lattice of spawned universes */}
              <div className="absolute top-4 left-4 lg:left-6 z-40 flex items-center gap-2">
                <button
                  onClick={() => setIsGenealogyOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-950 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-lg transition-all uppercase tracking-wider backdrop-blur-sm"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Genealogy Lattice ({allWorlds.length})
                </button>
              </div>

              <Viewport {...viewportProps} />
            </main>

            {/* Agent Detail Modal */}
            <AgentProbe 
              agent={selectedAgent}
              world={world}
              agents={agents}
              onClose={() => setSelectedAgentId(null)}
              onTriggerAwarenessSpike={triggerAwarenessSpike}
              onAgentSelfCreateWorld={(agentId) => {
                godVirusSelfCreateWorld(agentId, window.innerWidth, window.innerHeight);
              }}
            />

            {/* Divine Prayer Terminal Modal */}
            <PrayerInboxModal
              isOpen={isInboxOpen}
              onClose={() => setIsInboxOpen(false)}
              world={world}
              agents={agents}
              onResolvePrayer={resolvePrayer}
              onIgnorePrayer={ignorePrayer}
            />

            {/* Genealogy Tree Modal */}
            {isGenealogyOpen && (
              <GenealogyView
                isOpen={isGenealogyOpen}
                onClose={() => setIsGenealogyOpen(false)}
                worlds={allWorlds}
                selectedWorldId={selectedWorldId}
                onSelectWorld={(worldId) => {
                  setSelectedWorldId(worldId);
                  setIsGenealogyOpen(false);
                }}
                onCreateWorld={async (name, parentId) => {
                  const newId = await createNewWorld(name, parentId, window.innerWidth, window.innerHeight);
                  return newId;
                }}
              />
            )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

