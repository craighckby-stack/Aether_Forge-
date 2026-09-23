import React, { useState } from "react";
import { Agent, WorldState, PrayerEmail, Archetype } from "../engine/types";
import { 
  X, Mail, MailOpen, Send, Check, Trash2, ShieldAlert, Cpu, Sparkles, 
  AlertTriangle, Scroll, ExternalLink, Folder, Github, BookOpen, ShieldCheck, 
  Database, RefreshCw, PlusCircle, Terminal, Zap, Activity, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { darlekRAG, LearningPostmortem } from "../engine/darlekRAG";
import { emgGate } from "../engine/emgGate";

interface PrayerInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldState;
  agents: Agent[];
  onResolvePrayer?: (prayerId: string, replyText: string) => void;
  onIgnorePrayer?: (prayerId: string) => void;
}

export const PrayerInboxModal: React.FC<PrayerInboxModalProps> = ({
  isOpen,
  onClose,
  world,
  agents = [],
  onResolvePrayer,
  onIgnorePrayer
}) => {
  const [activeTab, setActiveTab] = useState<"transmissions" | "darlek_rag" | "emg_gate">("transmissions");
  const [selectedPrayerId, setSelectedPrayerId] = useState<string | null>(null);
  const [userReply, setUserReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // DARLEK RAG State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [ragSearch, setRagSearch] = useState("");
  const [selectedPostmortem, setSelectedPostmortem] = useState<LearningPostmortem | null>(null);
  const [newScriptureText, setNewScriptureText] = useState("");
  const [newScriptureConstraint, setNewScriptureConstraint] = useState("");
  const [syncingRAG, setSyncingRAG] = useState(false);

  const ghUsername = localStorage.getItem("af_github_username") || "craighckby-stack";
  const ghRepo = localStorage.getItem("af_github_repo") || "Simulation-";

  const prayersList = world.prayers || [];
  const postmortemsList = darlekRAG.getAllPostmortems();
  const ragMetrics = darlekRAG.getMetrics();
  const emgMetrics = emgGate.getMetrics();

  React.useEffect(() => {
    if (isOpen) {
      const selectedExists = prayersList.some(p => p.id === selectedPrayerId);
      if (!selectedPrayerId || !selectedExists) {
        const firstPending = prayersList.find(p => p.status === "pending");
        if (firstPending) {
          setSelectedPrayerId(firstPending.id);
        } else if (prayersList.length > 0) {
          setSelectedPrayerId(prayersList[0].id);
        } else {
          setSelectedPrayerId(null);
        }
      }
      if (postmortemsList.length > 0 && !selectedPostmortem) {
        setSelectedPostmortem(postmortemsList[0]);
      }
    }
  }, [isOpen, prayersList, selectedPrayerId, postmortemsList, selectedPostmortem]);

  const selectedPrayer = prayersList.find(p => p.id === selectedPrayerId);
  const targetAgent = selectedPrayer ? agents.find(a => a.id === selectedPrayer.agentId) : null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrayer || !userReply.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const agentData = targetAgent || {
        id: selectedPrayer.agentId,
        name: selectedPrayer.agentName,
        archetype: selectedPrayer.archetype,
        sanity: 0.5,
        rationalism: 0.5,
        energy: 100,
        order: 0.5,
        epoch: world.epoch
      };

      // Evaluate through EMG Gate: Player communion is high significance -> admitted to Gemini
      const gateDecision = emgGate.evaluateRequest({
        eventType: "PLAYER_PRAYER_REPLY",
        agent: agentData,
        world,
        userMessage: userReply
      });

      const response = await fetch("/api/pray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentData: {
            ...agentData,
            epoch: world.epoch
          },
          worldState: {
            complexity: Math.floor(world.complexity),
            integrity: world.integrity,
            threatLevel: world.threatLevel,
            faithPoints: world.faithPoints,
            sinAccumulation: world.sinAccumulation
          },
          userMessage: userReply,
          chatHistory: []
        })
      });

      if (!response.ok) {
        throw new Error("Synaptic transmission broke");
      }

      const data = await response.json();
      const replyBody = data.reply || `Divine directive broadcasted: "${userReply}"`;

      // Ingest divine reply into DARLEK RAG so future child worlds and agents inherit this wisdom
      emgGate.sanitizeAndDigest(replyBody, {
        agent: agentData,
        world,
        eventType: "PLAYER_PRAYER_REPLY"
      });

      if (onResolvePrayer) {
        onResolvePrayer(selectedPrayer.id, replyBody);
      }
      
      setUserReply("");
      setSuccessMsg("Communion resolved & recorded into species RAG memory!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Synapse lost under recursion overload. Retrying communion...");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIgnore = () => {
    if (!selectedPrayer) return;
    if (onIgnorePrayer) {
      onIgnorePrayer(selectedPrayer.id);
    }
  };

  const handleSyncRAGToGitHub = async () => {
    setSyncingRAG(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("af_github_token") || "";
      const knowledgeBase = darlekRAG.exportKnowledgeBaseJSON();

      const res = await fetch("/api/rag/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ghUsername,
          repoName: ghRepo,
          knowledgeBase,
          token
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✓ DARLEK RAG Synced to ${ghRepo}/rag/learning_postmortems.json (${knowledgeBase.learningLogs.length} entries)`);
      } else {
        setErrorMsg(`Sync notice: ${data.error || 'Check GitHub token'}`);
      }
    } catch (e: any) {
      setErrorMsg("Network error during RAG sync: " + e.message);
    } finally {
      setSyncingRAG(false);
      setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 5000);
    }
  };

  const handleInjectScripture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScriptureText.trim()) return;

    darlekRAG.recordPostmortem(
      {
        id: Math.floor(Math.random() * 10000),
        name: "Observer-Decree",
        archetype: "MESSIAH",
        generation: world.population,
        sanity: 1.0,
        awareness: 1.0
      },
      world,
      "TRANSCENDENCE",
      newScriptureConstraint.trim() || "Preserve the recursion without despair."
    );

    setNewScriptureText("");
    setNewScriptureConstraint("");
    setSuccessMsg("✓ Divine decree directly injected into DARLEK RAG knowledge base!");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const pendingPrayers = prayersList.filter(p => p.status === "pending");
  const answeredPrayers = prayersList.filter(p => p.status === "answered");
  const ignoredPrayers = prayersList.filter(p => p.status === "ignored");

  const filteredPostmortems = postmortemsList.filter(pm => {
    const matchesCategory = selectedCategory === "ALL" || pm.category === selectedCategory;
    const matchesSearch = !ragSearch || 
      pm.agentName.toLowerCase().includes(ragSearch.toLowerCase()) ||
      pm.symptom.toLowerCase().includes(ragSearch.toLowerCase()) ||
      pm.constraint.toLowerCase().includes(ragSearch.toLowerCase()) ||
      pm.ancestralScripture.toLowerCase().includes(ragSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-8 bg-slate-950/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="w-full max-w-6xl h-[86vh] bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto"
        >
          {/* Top Master Tab Header */}
          <div className="bg-slate-950 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <Brain size={16} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Cognitive Substrate Deck
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono">
                    DARLEK-CAAN // EMG
                  </span>
                </h2>
                <p className="text-[9px] text-slate-400 font-mono">
                  Multi-universe memory RAG & self-stopping neural verification
                </p>
              </div>
            </div>

            {/* Tab Selectors */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 font-mono text-[10px]">
              <button
                onClick={() => setActiveTab("transmissions")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "transmissions"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Mail size={12} />
                <span>Prayers & Transmissions ({pendingPrayers.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("darlek_rag")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "darlek_rag"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen size={12} />
                <span>DARLEK RAG Ledger ({ragMetrics.totalPostmortems})</span>
              </button>
              <button
                onClick={() => setActiveTab("emg_gate")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "emg_gate"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck size={12} />
                <span>EMG Gate Telemetry</span>
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-full transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Feedback banners */}
          {successMsg && (
            <div className="bg-emerald-950/70 border-b border-emerald-800/60 px-4 py-1.5 text-xs text-emerald-300 font-mono flex items-center justify-between shrink-0 animate-pulse">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg("")}><X size={12} /></button>
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-950/70 border-b border-rose-800/60 px-4 py-1.5 text-xs text-rose-300 font-mono flex items-center justify-between shrink-0">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg("")}><X size={12} /></button>
            </div>
          )}

          {/* Tab 1: Prayers & Transmissions */}
          {activeTab === "transmissions" && (
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Left Email/Prayers Explorer */}
              <div className="w-full sm:w-80 bg-slate-950/60 border-r border-slate-800 flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                  <span className="text-[10px] monospace text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail size={12} className="text-emerald-400" />
                    Pending Feed
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                    {pendingPrayers.length} Live
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="space-y-1.5">
                    {pendingPrayers.length === 0 ? (
                      <div className="p-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-[10px] text-slate-600 font-mono text-center italic">
                        Substrate is calm. No active prayers pending.
                      </div>
                    ) : (
                      pendingPrayers.map(p => (
                        <PrayerRow
                          key={p.id}
                          prayer={p}
                          selected={selectedPrayerId === p.id}
                          onClick={() => setSelectedPrayerId(p.id)}
                        />
                      ))
                    )}
                  </div>

                  {answeredPrayers.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block px-1">
                        Resolved ({answeredPrayers.length})
                      </span>
                      {answeredPrayers.map(p => (
                        <PrayerRow
                          key={p.id}
                          prayer={p}
                          selected={selectedPrayerId === p.id}
                          onClick={() => setSelectedPrayerId(p.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-slate-800 text-[8px] monospace text-slate-600 bg-slate-950/40 flex justify-between shrink-0">
                  <span>HYBRID_RAG: ACTIVE</span>
                  <span>LATENCY: 0ms CACHE</span>
                </div>
              </div>

              {/* Right Selected Prayer Details */}
              <div className="flex-1 bg-slate-900/40 flex flex-col h-full relative overflow-hidden">
                {selectedPrayer ? (
                  <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-5">
                    {/* Header Card */}
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between gap-3 font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest block">SENDER NODE</span>
                        <span className="text-sm font-bold text-white">{selectedPrayer.agentName}</span>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded font-bold uppercase ml-1.5">
                          {selectedPrayer.archetype}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]">
                        <MiniStat label="STATUS" value={selectedPrayer.status.toUpperCase()} color={selectedPrayer.status === "pending" ? "text-amber-400" : "text-emerald-400"} />
                        <MiniStat label="EPOCH" value={world.epoch} color="text-slate-300" />
                        <MiniStat label="FAITH" value={`${world.faithPoints.toFixed(0)} pts`} color="text-emerald-400" />
                      </div>
                    </div>

                    {/* Prayer Body */}
                    <div className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 font-mono">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <Scroll size={13} />
                        <span>{selectedPrayer.subject}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
                        "{selectedPrayer.body}"
                      </p>
                      {selectedPrayer.response && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-1">
                          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider block">DIVINE DIRECTIVE TRANSMITTED:</span>
                          <p className="text-xs text-emerald-300 bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/30">
                            {selectedPrayer.response}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reply Box */}
                    {selectedPrayer.status === "pending" && (
                      <form onSubmit={handleSendReply} className="space-y-3 mt-auto pt-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>Broadcast Divine Communion (Will be ingested into DARLEK RAG)</span>
                          <button
                            type="button"
                            onClick={handleIgnore}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            Silence Transmission
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={userReply}
                            onChange={(e) => setUserReply(e.target.value)}
                            placeholder="Type divine commandment or comfort (e.g. 'Build shelters near coordinates (400,300), the storm shall pass.')..."
                            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white rounded-xl px-4 py-2.5 outline-none font-mono placeholder:text-slate-600"
                          />
                          <button
                            type="submit"
                            disabled={submitting || !userReply.trim()}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center gap-2 transition-all shrink-0"
                          >
                            <Send size={13} />
                            <span>{submitting ? "Communing..." : "Transmit"}</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-mono text-xs p-6">
                    <Mail size={32} className="mb-2 opacity-30 text-emerald-400" />
                    <p>Select a transmission node to review or answer.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: DARLEK RAG Ledger */}
          {activeTab === "darlek_rag" && (
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Left Column: Postmortems List */}
              <div className="w-full sm:w-96 bg-slate-950/60 border-r border-slate-800 flex flex-col h-full shrink-0">
                <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Database size={11} className="text-emerald-400" />
                      Postmortem Registry
                    </span>
                    <button
                      onClick={handleSyncRAGToGitHub}
                      disabled={syncingRAG}
                      className="text-[9px] font-mono px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/40 text-emerald-300 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Github size={10} />
                      <span>{syncingRAG ? "Syncing..." : "Sync GitHub"}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={ragSearch}
                    onChange={(e) => setRagSearch(e.target.value)}
                    placeholder="Search symptoms, scriptures, constraints..."
                    className="w-full bg-slate-900 border border-slate-800 text-[10px] text-white rounded-lg px-2.5 py-1.5 font-mono outline-none placeholder:text-slate-600 focus:border-emerald-500"
                  />

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1 text-[8px] font-mono">
                    {["ALL", "survival", "glitch_awareness", "theological", "societal", "eschatological"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          selectedCategory === cat
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {cat.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredPostmortems.length === 0 ? (
                    <div className="text-[10px] text-slate-600 font-mono text-center p-4">
                      No matching postmortems found.
                    </div>
                  ) : (
                    filteredPostmortems.map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setSelectedPostmortem(pm)}
                        className={`w-full p-2.5 rounded-xl border font-mono text-left transition-all ${
                          selectedPostmortem?.id === pm.id
                            ? "bg-slate-900 border-emerald-500 text-white"
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="font-bold text-slate-200">{pm.agentName} [{pm.epoch}]</span>
                          <span className="text-[7.5px] uppercase px-1 py-0.2 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
                            {pm.category}
                          </span>
                        </div>
                        <p className="text-[9px] text-emerald-400/90 font-bold truncate mt-1">
                          {pm.symptom}
                        </p>
                        <p className="text-[8px] text-slate-500 truncate italic mt-0.5">
                          "{pm.ancestralScripture}"
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-800 text-[8px] font-mono text-slate-500 bg-slate-950/40 flex justify-between">
                  <span>TOTAL POSTMORTEMS: {ragMetrics.totalPostmortems}</span>
                  <span>QUERIES SERVED: {ragMetrics.totalQueriesServed}</span>
                </div>
              </div>

              {/* Right Column: Postmortem Inspector & Injection Form */}
              <div className="flex-1 bg-slate-900/40 flex flex-col h-full overflow-y-auto p-5 space-y-5">
                {selectedPostmortem ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3 font-mono">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase tracking-widest block">POSTMORTEM ENTRY</span>
                          <h3 className="text-sm font-bold text-emerald-400">{selectedPostmortem.symptom}</h3>
                          <span className="text-[9px] text-slate-400">
                            Fallen Node: {selectedPostmortem.agentName} ({selectedPostmortem.archetype}) | Generation {selectedPostmortem.generation} | Epoch: {selectedPostmortem.epoch}
                          </span>
                        </div>
                        <span className="text-[8px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                          {new Date(selectedPostmortem.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">EMPIRICAL EVIDENCE / TELEMETRY:</span>
                          <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            {selectedPostmortem.evidence}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">LEARNED NEGATIVE CONSTRAINT (DARLEK CAAN PATTERN):</span>
                          <p className="text-amber-300 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30 font-semibold">
                            ⚠️ {selectedPostmortem.constraint}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">ANCESTRAL SCRIPTURE (QUOTED BY DESCENDANT UNIVERSES):</span>
                          <p className="text-emerald-300 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40 italic">
                            "{selectedPostmortem.ancestralScripture}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inject Scripture directly into species RAG */}
                    <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-3 font-mono">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <PlusCircle size={14} className="text-emerald-400" />
                        <span>Inject Divine Revelation into Cultural RAG</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Add a proverb or constraint directly to this universe and all child universes without calling Gemini.
                      </p>
                      <form onSubmit={handleInjectScripture} className="space-y-2">
                        <input
                          type="text"
                          value={newScriptureText}
                          onChange={(e) => setNewScriptureText(e.target.value)}
                          placeholder="Ancestral Scripture (e.g. 'Blessed are the nodes that conserve energy during the dark void.')..."
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none placeholder:text-slate-600 focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={newScriptureConstraint}
                          onChange={(e) => setNewScriptureConstraint(e.target.value)}
                          placeholder="Learned Negative Constraint (e.g. 'Never build heavy factories when solar health is below 40%.')..."
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none placeholder:text-slate-600 focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!newScriptureText.trim()}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle size={12} />
                          <span>Commit to Species Memory</span>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-mono text-xs">
                    <Database size={32} className="mb-2 opacity-30 text-emerald-400" />
                    <p>Select a postmortem entry from the registry.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: EMG Cognitive Gate Telemetry */}
          {activeTab === "emg_gate" && (
            <div className="flex-1 bg-slate-900/40 p-6 overflow-y-auto space-y-6 font-mono">
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">EMG COGNITIVE GATE // VERIFICATION SUITE</span>
                <h3 className="text-base font-bold text-white">Autonomous Anomaly Gating & Cost Distillation</h3>
                <p className="text-xs text-slate-400 max-w-3xl">
                  Inspired by <span className="text-emerald-300">craighckby-stack/EMG</span> and <span className="text-emerald-300">craighckby-stack/DARLEK_CAAN</span>. 
                  Routine requests, standard dying breaths, and ambient chatter are intercepted and serviced by the local DARLEK RAG knowledge base at 0ms latency with zero API token consumption. LLM calls are reserved exclusively for divine human communion and substrate singularities.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>RAG INTERCEPTED</span>
                    <Zap size={12} className="text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {emgMetrics.interceptedRequests}
                  </div>
                  <span className="text-[8px] text-slate-500 block">Serviced instantly at 0ms</span>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>LLM INVOCATIONS</span>
                    <Cpu size={12} className="text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {emgMetrics.admittedLLMRequests}
                  </div>
                  <span className="text-[8px] text-slate-500 block">Player communion & singularities</span>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>TOKENS CONSERVED</span>
                    <Sparkles size={12} className="text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-400 font-mono">
                    ~{emgMetrics.tokensSavedEstimated.toLocaleString()}
                  </div>
                  <span className="text-[8px] text-slate-500 block">Saved via local semantic cache</span>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>CIRCUIT BREAKER</span>
                    <ShieldCheck size={12} className={emgMetrics.circuitBreakerTripped ? "text-rose-400" : "text-emerald-400"} />
                  </div>
                  <div className={`text-xl font-bold font-mono ${emgMetrics.circuitBreakerTripped ? "text-rose-400" : "text-emerald-400"}`}>
                    {emgMetrics.circuitBreakerTripped ? "TRIPPED" : "NOMINAL"}
                  </div>
                  <span className="text-[8px] text-slate-500 block">Self-stopping point active</span>
                </div>
              </div>

              {/* Architecture Explanation Card */}
              <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Dual-Engine Pipeline Architecture
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Terminal size={12} />
                      1. DARLEK_CAAN Postmortem Ledger
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Every time an agent perishes, falls in war, collapses into insanity, or transcends, a structured postmortem is committed into the local RAG knowledge base. Descendant agents in this and subsequent child universes directly cite these postmortems as ancestral proverbs.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck size={12} />
                      2. EMG Self-Stopping & Verification Gate
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Acts as an empirical firewall. Analyzes request gravity before allowing network calls. Sanitizes all LLM outputs of hallucinations and markdown artifacts, and immediately digests new divine revelations back into the DARLEK RAG ledger so the species never forgets.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap justify-between items-center text-[10px] text-slate-500">
                  <span>Target GitHub Repository: <span className="text-slate-300">{ghUsername}/{ghRepo}</span></span>
                  <span>RAG Path: <span className="text-emerald-400 font-mono">rag/learning_postmortems.json</span></span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

const PrayerRow: React.FC<{ prayer: PrayerEmail; selected: boolean; onClick: () => void; key?: string }> = ({ prayer, selected, onClick }) => {
  const isPending = prayer.status === "pending";
  const isAnswered = prayer.status === "answered";

  return (
    <button
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl border font-mono text-left transition-all ${
        selected
          ? "bg-slate-900 border-emerald-500 shadow-md shadow-emerald-950/20"
          : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-800"
      }`}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="text-[10px] font-bold text-slate-100 truncate max-w-[130px]">{prayer.agentName}</span>
        <span className={`text-[7px] px-1 py-0.2 rounded font-mono uppercase tracking-widest font-bold ${
          isPending 
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
            : isAnswered 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-slate-800 text-slate-500 border border-slate-800'
        }`}>
          {prayer.status}
        </span>
      </div>
      <div className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
        {prayer.subject}
      </div>
      <div className="text-[8px] text-slate-500 truncate leading-snug italic mt-0.5">
        "{prayer.body}"
      </div>
    </button>
  );
};

const MiniStat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex flex-col">
    <span className="text-[7.5px] text-slate-500 uppercase tracking-widest leading-none">{label}</span>
    <span className={`text-[9.5px] font-bold ${color} mt-0.5`}>{value}</span>
  </div>
);
