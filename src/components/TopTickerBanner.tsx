import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { WorldState } from "../engine/types";

export interface TopTickerBannerProps {
  world: WorldState;
}

export function TopTickerBanner({ world }: TopTickerBannerProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const lastUpdateRef = useRef<number>(0);

  // Generate historical stats purely based on world state
  useEffect(() => {
    const historicalStats = [
      `TOTAL REVOLUTIONS: ${world.totalRevolutions || 0}`,
      `WARS FOUGHT: ${world.totalWars || 0}`,
      `PEACE ACTS: ${world.totalPeaceTreaties || 0}`,
      `SCHISMS: ${world.totalSchisms || 0}`,
      `HEAVEN: ${world.heavenPop || 0}`,
      `HELL: ${world.hellPop || 0}`,
    ];

    if (world.prayers && world.prayers.length > 0) {
       historicalStats.push(`PENDING PRAYERS: ${world.prayers.filter((p) => p.status === "pending").length}`);
    }

    if (world.nations && world.nations.length > 0) {
        const topNation = [...world.nations].sort((a,b) => b.population - a.population)[0];
        historicalStats.push(`DOMINANT SUBSTRATE: ${topNation.name.toUpperCase()} (POP: ${topNation.population})`);
    }

    // Add recent history logs
    if (world.historyLog && world.historyLog.length > 0) {
        const recentLogs = world.historyLog
            .slice(0, 5)
            .map(log => `✦ ${log}`);
        historicalStats.push(...recentLogs);
    }

    // Shuffle and repeat for infinite scroll effect
    const merged = historicalStats.join("  •  ");
    // Duplicate it a few times to guarantee a long seamless string
    setMessages([merged, merged, merged, merged]);
  }, [world.totalRevolutions, world.totalWars, world.totalPeaceTreaties, world.totalSchisms, world.heavenPop, world.hellPop, world.prayers, world.nations, world.events]);

  return (
    <div className="relative w-full z-[140] flex flex-col justify-start shrink-0 select-none">
        <div className="w-full overflow-hidden flex items-center shrink-0 backdrop-blur-md bg-slate-950/95 border-b border-emerald-900/50 shadow-xl shadow-black/50">
            {/* Prominent Main Header Title Badge */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-emerald-950/80 border-r border-emerald-900/60 shrink-0 z-10">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1.5 whitespace-nowrap drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    AetherForge Ω
                    <span className="hidden sm:inline-block text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                        {world.epoch}
                    </span>
                </span>
            </div>

            {/* Live Scrolling Telemetry Marquee */}
            <div className="relative flex-1 h-[22px] sm:h-[26px] flex items-center overflow-hidden">
                <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        repeat: Infinity,
                        duration: 120, // Increased from 80 for better readability
                        ease: "linear",
                    }}
                    className="flex whitespace-nowrap font-mono text-[8px] sm:text-[10px] uppercase tracking-widest px-4 font-semibold text-emerald-400 gap-8"
                    initial={{ x: "0%" }}
                    style={{ width: "fit-content" }}
                >
                    {messages.map((msg, i) => (
                        <span key={i} style={{ paddingRight: "2rem" }}>{msg}</span>
                    ))}
                </motion.div>
            </div>
        </div>
    </div>
  );
}

