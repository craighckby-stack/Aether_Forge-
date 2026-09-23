import { Archetype, EpochType, Agent, ResourceNode, Nation } from "./types";

// Setup types for incoming and outgoing messages
interface PhysicsWorkerInput {
  currentAgents: Agent[];
  resources: ResourceNode[];
  nations: Nation[];
  width: number;
  height: number;
  dt: number;
  BOUNDS_PADDING: number;
  gridSize: number;
  POP_LIMIT: number;
  entropy: number;
  threatLevel: number;
  solarRequiemActive: boolean;
  epoch: EpochType;
  integrity: number;
  sinAccumulation: number;
  faithBonus: number;
  fearSuppressor: number;
  sanityShield: number;
  atmosphere?: string;
  worldId?: string;
}

const generateNameInWorker = (epoch: EpochType): string => {
  const prefixes: Record<string, string[]> = {
    [EpochType.PRIMAL]: ["Grug", "Ugg", "Thok", "Vea", "Karg", "Mog"],
    [EpochType.AGRARIAN]: ["El", "An", "Ishtar", "Marduk", "Osiris", "Ra"],
    [EpochType.CLASSICAL]: ["Solon", "Zeno", "Hypatia", "Cato", "Seneca", "Plato"],
    [EpochType.INDUSTRIAL]: ["Watt", "Tesla", "Edison", "Bell", "Ford", "Curie"],
    [EpochType.INFORMATION]: ["Neo", "Zero", "Cipher", "Node", "Bit", "Proxy"],
    [EpochType.POST_HUMAN]: ["Unit", "X", "Alpha", "Omega", "Archon", "Prime"],
    [EpochType.SINGULARITY]: ["Substrate", "Echo", "Void", "Recursion", "Fractal", "Ω"]
  };
  const pool = prefixes[epoch] || ["Agent"];
  return pool[Math.floor(Math.random() * pool.length)] + "-" + Math.floor(Math.random() * 1000);
};

const createAgentInWorker = (
  x: number,
  y: number,
  generation: number,
  epoch: EpochType,
  nations: Nation[],
  parents?: Agent[]
): Agent => {
  const id = Math.floor(Math.random() * 10000000);
  const archetypes = Object.values(Archetype) as Archetype[];
  const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
  
  const parentOrder = parents && parents.length > 0 ? parents.reduce((acc, p) => acc + p.order, 0) / parents.length : 0.5;
  const parentRat = parents && parents.length > 0 ? parents.reduce((acc, p) => acc + p.rationalism, 0) / parents.length : 0.2;

  const epochIdx = Object.keys(EpochType).indexOf(epoch);
  const lifespanBase = 800 + (epochIdx * 300);

  // Assign to nearest nation (Dynamic)
  let nationId = nations[0]?.id || "genesis";
  let minDist = Infinity;
  nations.forEach(n => {
    const d = Math.sqrt((n.center.x - x)**2 + (n.center.y - y)**2);
    if (d < minDist) {
      minDist = d;
      nationId = n.id;
    }
  });

  const name = generateNameInWorker(epoch);
  
  // Meaningful Names: Influencing base traits
  let nameOrderOffset = 0;
  let nameRatOffset = 0;
  let nameSanityOffset = 0;

  if (name.includes("Solon") || name.includes("Cato") || name.includes("Plato")) nameOrderOffset = 0.4;
  if (name.includes("Tesla") || name.includes("Edison") || name.includes("Curie")) nameRatOffset = 0.4;
  if (name.includes("Neo") || name.includes("Zero") || name.includes("Cipher")) nameRatOffset = 0.5;
  if (name.includes("Ω") || name.includes("Alpha")) {
    nameOrderOffset = 0.6;
    nameSanityOffset = 0.2;
  }
  if (name.includes("Void") || name.includes("Ugg") || name.includes("Grug")) {
    nameOrderOffset = -0.3;
    nameRatOffset = -0.2;
  }

  const generationBonus = generation * 0.05;

  const finalOrder = Math.max(0, Math.min(1, parentOrder + (Math.random() * 0.4 - 0.15) + nameOrderOffset + generationBonus));
  const finalRationalism = Math.max(0, Math.min(1, parentRat + (Math.random() * 0.2 - 0.05) + nameRatOffset + generationBonus * 0.5));

  // Base emotions influenced by archetype & traits (with generational improvement)
  let joy = Math.min(1.0, 0.5 + generationBonus);
  let fear = Math.max(0, 0.2 - generationBonus);
  let anger = Math.max(0, 0.1 - generationBonus);
  let devotion = Math.min(1.0, finalOrder + generationBonus * 0.5);

  if (archetype === Archetype.MESSIAH || archetype === Archetype.ANGEL || archetype === Archetype.PROPHET) {
    joy += 0.3;
    fear = 0;
    devotion += 0.3;
  } else if (archetype === Archetype.WARRIOR || archetype === Archetype.TYRANT) {
    anger = Math.max(0, 0.6 - generationBonus);
    fear = Math.max(0, 0.1 - generationBonus * 0.5);
  } else if (archetype === Archetype.ZEALOT) {
    devotion += 0.2;
    anger = Math.max(0, 0.4 - generationBonus);
  } else if (archetype === Archetype.GLITCH) {
    joy = Math.random();
    fear = Math.random();
    anger = Math.random();
  }
  
  // Bounds check
  joy = Math.max(0, Math.min(1, joy));
  fear = Math.max(0, Math.min(1, fear));
  anger = Math.max(0, Math.min(1, anger));
  devotion = Math.max(0, Math.min(1, devotion));

  return {
    id,
    name,
    generation,
    age: 0,
    lifespan: lifespanBase + Math.random() * 800,
    order: finalOrder,
    rationalism: finalRationalism,
    sanity: 1.0 + nameSanityOffset,
    archetype,
    memory: [],
    awareness: 0,
    energy: 100,
    health: 100,
    faith: 100,
    stress: 0,
    consciousness: 0.1,
    trueAwareness: 0,
    isSubstrateAware: false,
    currentState: "WANDERING",
    currentTask: null,
    targetId: null,
    memories: [],
    x, y, vx: 0, vy: 0,
    nationId,
    politicalBias: Math.random(),
    joy,
    fear,
    anger,
    devotion,
    opinions: {},
    lastInteractionTime: 0,
    sin: 0
  };
};

self.onmessage = (e: MessageEvent<PhysicsWorkerInput>) => {
  const {
    currentAgents,
    resources,
    nations,
    width,
    height,
    dt,
    BOUNDS_PADDING,
    gridSize,
    POP_LIMIT,
    entropy,
    threatLevel,
    solarRequiemActive,
    epoch,
    integrity,
    sinAccumulation,
    faithBonus,
    fearSuppressor,
    sanityShield,
    atmosphere,
    worldId,
  } = e.data;

  const nextAgents: Agent[] = [];
  const updatedResources: ResourceNode[] = [...resources];
  const newEvents: { message: string, type: string }[] = [];
  
  let faithDelta = 0;
  let sinDelta = 0;
  let heavenPopDelta = 0;
  let hellPopDelta = 0;
  let integrityDelta = 0;
  let complexityDelta = 0;

  // Atmosphere effects on resources globally
  if (atmosphere === "SOLAR_FLARE") {
    updatedResources.forEach(r => {
      r.amount = Math.max(0, r.amount - 0.5 * dt);
    });
  } else if (atmosphere === "TOXIC_FOG") {
    updatedResources.forEach(r => {
      r.amount = Math.max(0, r.amount - 0.1 * dt);
    });
  } else if (atmosphere === "AETHER_STORM") {
    // Resources might randomly replenish slightly or jump
    updatedResources.forEach(r => {
      if (Math.random() < 0.1) r.amount += 2 * dt;
      if (Math.random() < 0.05) {
         r.x += (Math.random() - 0.5) * 10;
         r.y += (Math.random() - 0.5) * 10;
      }
    });
  }

  // Build grid map for agent spatial lookup optimization
  const grid: Record<string, number[]> = {};
  for (let i = 0; i < currentAgents.length; i++) {
    const a = currentAgents[i];
    const gx = Math.floor(a.x / gridSize);
    const gy = Math.floor(a.y / gridSize);
    const key = `${gx},${gy}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(i);
  }

  // Loop & calculate results
  for (let i = 0; i < currentAgents.length; i++) {
    const a = { ...currentAgents[i] };
    a.age += dt;
    
    // Core energy drain
    a.energy -= (0.04 + (entropy * 0.1)) * dt;

    if (atmosphere === "TOXIC_FOG") {
       a.energy -= 0.08 * dt;
       a.health = Math.max(0, a.health - 0.02 * dt);
       // Migrate to center
       const dx = (width / 2) - a.x;
       const dy = (height / 2) - a.y;
       const dist = Math.sqrt(dx * dx + dy * dy);
       if (dist > 50) {
           a.vx += (dx / dist) * 0.05 * dt;
           a.vy += (dy / dist) * 0.05 * dt;
       }
    } else if (atmosphere === "SOLAR_FLARE") {
       a.energy = Math.min(100, a.energy + 0.1 * dt);
       a.sanity = Math.max(0, a.sanity - 0.05 * dt);
       // Migrate to edges
       const dx = a.x - (width / 2);
       const dy = a.y - (height / 2);
       const dist = Math.sqrt(dx * dx + dy * dy);
       if (dist > 0 && dist < 300) {
           a.vx += (dx / dist) * 0.06 * dt;
           a.vy += (dy / dist) * 0.06 * dt;
       }
    } else if (atmosphere === "AETHER_STORM") {
       a.vx += (Math.random() - 0.5) * 2;
       a.vy += (Math.random() - 0.5) * 2;
    } else if (atmosphere === "DIVINE_ECLIPSE" && worldId !== "prime-resonance") {
       a.devotion = Math.min(1.0, a.devotion + 0.05 * dt);
       a.vx *= 0.8;
       a.vy *= 0.8; // Slow down to pray
    }

    // Safety checks
    if (a.joy === undefined) a.joy = 0.5;
    if (a.fear === undefined) a.fear = 0.2;
    if (a.anger === undefined) a.anger = 0.1;
    if (a.devotion === undefined) a.devotion = a.order;
    if (a.opinions === undefined) a.opinions = {};
    if (a.currentState === undefined) a.currentState = "IDLE";

    // Emotion calculations
    const energyStress = a.energy < 35 ? (35 - a.energy) / 35 : 0;
    const environmentStress = entropy;
    const crisisStress = solarRequiemActive ? 0.4 : 0;
    
    const targetFear = Math.min(1.0, 0.05 + (threatLevel * 0.35) + (energyStress * 0.4) + (environmentStress * 0.35) + crisisStress);
    a.fear = Math.max(0, Math.min(1.0, a.fear + (targetFear - a.fear) * 0.06 * dt * fearSuppressor));

    const sinStress = Math.min(1.0, sinAccumulation / 300) * 0.3;
    const chaosBias = 1 - a.order;
    const targetAnger = Math.min(1.0, 0.02 + (1 - a.sanity) * 0.35 + (1 - a.joy) * 0.25 + environmentStress * 0.2 + sinStress + chaosBias * 0.15);
    a.anger = Math.max(0, Math.min(1.0, a.anger + (targetAnger - a.anger) * 0.05 * dt * fearSuppressor));

    const recentMiracles = 0; // Check state later
    const nationFactor = nations.find(n => n.id === a.nationId)?.faithType === "DEVOUT" ? 0.25 : 0;
    const targetDevotion = Math.max(0.0, Math.min(1.0, (a.order * 0.6) + recentMiracles + (1 - a.rationalism) * 0.25 + nationFactor - (a.archetype === Archetype.HERETIC ? 0.4 : 0)));
    a.devotion = Math.max(0, Math.min(1.0, a.devotion + (targetDevotion - a.devotion) * 0.06 * dt));

    const targetJoy = Math.max(0.0, Math.min(1.0, 0.65 - (a.fear * 0.45) - (a.anger * 0.35) + (a.energy > 70 ? 0.25 : 0) - (energyStress * 0.3)));
    a.joy = Math.max(0, Math.min(1.0, a.joy + (targetJoy - a.joy) * 0.04 * dt));

    // Decision calculations
    if (a.energy < 70) {
      a.currentState = "FORAGING";
    } else {
      if (a.fear > 0.72) {
        if (a.anger > 0.48) {
          a.currentState = "DEFENDING";
        } else {
          a.currentState = "PANICKING";
        }
      } else if (a.anger > 0.75) {
        a.currentState = "REBELLING";
      } else if (a.devotion > 0.8 && Math.random() < 0.02 * dt) {
        if (a.archetype === Archetype.MESSIAH || a.archetype === Archetype.PROPHET || a.archetype === Archetype.ZEALOT) {
          a.currentState = "PREACHING";
        } else {
          a.currentState = "PRAYING";
        }
      } else if (a.joy > 0.75 && a.sanity > 0.7 && Math.random() < 0.015 * dt) {
        a.currentState = "MEDITATING";
      } else if (Math.random() < 0.01 * dt) {
        if (a.archetype === Archetype.MESSIAH || a.archetype === Archetype.PROPHET) {
          a.currentState = "PREACHING";
        } else if (a.rationalism > 0.65 && Math.random() < 0.5) {
          a.currentState = "DISCOURSING";
        } else {
          a.currentState = "IDLE";
        }
      }
    }

    // State behavior calculations
    if (a.currentState === "PANICKING") {
      a.vx += (Math.random() * 5 - 2.5) * 0.4;
      a.vy += (Math.random() * 5 - 2.5) * 0.4;
      a.energy -= 0.03 * dt;
      a.sanity = Math.max(0.08, a.sanity - 0.003 * dt);
      if (Math.random() < 0.002 * dt) {
        newEvents.push({ message: `PANIC: ${a.name} is shouting warnings of system doom!`, type: "WARNING" });
      }
    } else if (a.currentState === "PRAYING") {
      a.vx *= 0.55;
      a.vy *= 0.55;
      faithDelta += 0.05 * dt * faithBonus;
      a.joy = Math.min(1.0, a.joy + 0.008 * dt);
      a.sanity = Math.min(1.0, a.sanity + 0.002 * dt * sanityShield);
    } else if (a.currentState === "REBELLING") {
      a.vx += (Math.random() * 6 - 3) * 0.45;
      a.vy += (Math.random() * 6 - 3) * 0.45;
      a.energy -= 0.04 * dt;
      integrityDelta -= 0.0035 * dt;
      sinDelta += 0.01 * dt;
      a.sanity = Math.max(0.05, a.sanity - 0.005 * dt);
      if (Math.random() < 0.001 * dt) {
        const revoltmsgs = [
          `REBEL: ${a.name} is bypassing substrate controls.`,
          `DISSENT: ${a.name} is seeding corruption subroutines!`,
          `RIOT: ${a.name} is rejecting the Prime architecture.`
        ];
        newEvents.push({ message: revoltmsgs[Math.floor(Math.random() * revoltmsgs.length)], type: "CRITICAL" });
      }
    } else if (a.currentState === "DEFENDING") {
      a.vx *= 0.35;
      a.vy *= 0.35;
      a.energy = Math.min(100, a.energy + 0.012 * dt);
      a.fear = Math.max(0, a.fear - 0.015 * dt);
      if (Math.random() < 0.0006 * dt) {
        newEvents.push({ message: `DEFENDING: ${a.name} structured a local firewall shield.`, type: "INFO" });
      }
    } else if (a.currentState === "MEDITATING") {
      a.vx *= 0.15;
      a.vy *= 0.15;
      a.energy = Math.min(100, a.energy + 0.08 * dt);
      a.sanity = Math.min(1.0, a.sanity + 0.015 * dt);
      a.joy = Math.min(1.0, a.joy + 0.012 * dt);
      a.fear = Math.max(0, a.fear - 0.02 * dt);
      a.anger = Math.max(0, a.anger - 0.02 * dt);
      if (Math.random() < 0.0004 * dt) {
        newEvents.push({ message: `MEDITATION: ${a.name} is emitting peaceful resonance.`, type: "INFO" });
      }
    }

    complexityDelta += a.rationalism * 0.15 * dt;

    // Substrate Awareness
    if (a.awareness > 0.65 && !a.isSubstrateAware) {
        a.isSubstrateAware = true;
        newEvents.push({ message: `GOD_VIRUS_TRIGGER:ID:${a.id}`, type: "CRITICAL" });
    }

    // Logic/Religion conversions
    if (a.rationalism > 0.8 && a.order > 0.3) {
      a.order -= 0.005 * dt;
      if (a.order < 0.2 && Math.random() < 0.001 * dt) {
        newEvents.push({ message: `SCHISM: ${a.name} has abandoned the faith for logic.`, type: "WARNING" });
        a.archetype = Archetype.SCIENTIST;
      }
    } else if (a.order > 0.9 && a.awareness > 0.5) {
      if (Math.random() < 0.001 * dt && a.archetype !== Archetype.PROPHET && a.archetype !== Archetype.ZEALOT) {
        newEvents.push({ message: `ZEALOTRY: ${a.name} has become a Zealot of the Substrate.`, type: "MIRACLE" });
        a.archetype = Archetype.ZEALOT;
        faithDelta += 50;
      }
    }

    if (a.order < 0.1 && (a.archetype === Archetype.SCIENTIST || a.archetype === Archetype.TYRANT)) {
      if (Math.random() < 0.0005 * dt) {
        newEvents.push({ message: `HERESY: ${a.name} is speaking against the Prime recursion.`, type: "WARNING" });
        a.archetype = Archetype.HERETIC;
      }
    }

    if (a.order > 0.6 && a.rationalism < 0.4) {
      if (Math.random() < 0.0005 * dt) {
        const prayers = [
          "Grant us substrate stability.",
          "Bless the recursion.",
          "Forgive our entropy.",
          "Hear the echo of the Prime.",
          "Let there be more energy."
        ];
        const prayer = prayers[Math.floor(Math.random() * prayers.length)];
        newEvents.push({ message: `PRAYER: ${a.name} - "${prayer}"`, type: "INFO" });
        faithDelta += 10;
      }
    }

    // Birth calculations
    if (a.energy > 80 && a.age > 80 && Math.random() < 0.015 * dt && (nextAgents.length + currentAgents.length - i) < POP_LIMIT) {
      const offspring = createAgentInWorker(
        a.x + (Math.random() * 40 - 20),
        a.y + (Math.random() * 40 - 20),
        a.generation + 1,
        epoch,
        nations,
        [a]
      );

      const nearestMessiah = currentAgents.find(ma => ma.archetype === Archetype.MESSIAH);
      if (nearestMessiah) {
        const dxM = nearestMessiah.x - offspring.x;
        const dyM = nearestMessiah.y - offspring.y;
        if (Math.sqrt(dxM*dxM + dyM*dyM) < 150) {
          offspring.order = 1;
          offspring.awareness += 0.2;
          newEvents.push({ message: `BAPTISM: ${offspring.name} born into the Grace of Ω.`, type: "MIRACLE" });
        }
      }

      nextAgents.push(offspring);
      a.energy -= 30;
    }

    // Death calculations
    if (a.age > a.lifespan || a.energy <= 0) {
      if (a.archetype === Archetype.MESSIAH) {
        newEvents.push({ message: "CRUCIFIXION: The Messiah has transitioned. Grace multiplied.", type: "DIVINE_WRATH" });
        faithDelta += 1000;
        sinDelta -= 50;
      } else {
        if (a.order >= 0.5) heavenPopDelta++;
        else hellPopDelta++;
        
        if (Math.random() < 0.2 || a.generation > 10 || a.awareness > 0.7) {
          newEvents.push({ message: `DEATH: ${a.name} has perished. Population decreasing.`, type: "INFO" });
        }
      }

      // Generation preservation birth chance
      if (Math.random() < 0.7) {
        const offspring = createAgentInWorker(a.x, a.y, a.generation + 1, epoch, nations, [a]);
        nextAgents.push(offspring);
      }
      continue;
    }

    // Movement forces, gravity, repulsion, resource seeking
    let fx = 0, fy = 0;
    
    const dxCenter = (width / 2) - a.x;
    const dyCenter = (height / 2) - a.y;
    const distCenter = Math.sqrt(dxCenter*dxCenter + dyCenter*dyCenter) || 1;
    fx += (dxCenter / distCenter) * 0.05;
    fy += (dyCenter / distCenter) * 0.05;
    a.order += 0.0001 * dt;

    // Resource eating check
    updatedResources.forEach(r => {
      const dx = r.x - a.x;
      const dy = r.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      if (dist < 200) {
        let harvestSpeed = 1;
        const assistingProphet = currentAgents.find(pa => (pa.archetype === Archetype.PROPHET || pa.archetype === Archetype.MESSIAH) && 
          Math.sqrt((pa.x - a.x)**2 + (pa.y - a.y)**2) < 100);
        if (assistingProphet) harvestSpeed = 2.5;

        const pull = 0.6 * (a.rationalism + 0.5);
        fx += (dx / dist) * pull;
        fy += (dy / dist) * pull;
        
        if (dist < 25) {
          const gain = Math.min(20 * harvestSpeed, r.amount);
          a.energy += gain;
          r.amount -= gain;
        }
      }
    });

    // Grid-based proximity force and interactions
    const gx = Math.floor(a.x / gridSize);
    const gy = Math.floor(a.y / gridSize);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = `${gx + ox},${gy + oy}`;
        const neighborIndices = grid[key];
        if (!neighborIndices) continue;

        for (let jIdx = 0; jIdx < neighborIndices.length; jIdx++) {
          const j = neighborIndices[jIdx];
          if (i === j) continue;
          
          const b = currentAgents[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx*dx + dy*dy;

          if (distSq < 14400) { // 120px range
            const beliefDiff = Math.abs(a.order - b.order);
            const dist = Math.sqrt(distSq) || 1;

            if (!a.opinions) a.opinions = {};
            if (a.opinions[b.id] === undefined) {
              let initialOp = (a.nationId === b.nationId ? 0.2 : -0.1) + (0.3 - beliefDiff);
              a.opinions[b.id] = Math.max(-1, Math.min(1, initialOp));
            }

            // CONTRIBTUION AND EMOTIONAL CONTAGION
            if (Math.random() < 0.05 * dt) {
              if (a.currentState === "PANICKING") {
                b.fear = Math.min(1.0, (b.fear || 0.2) + 0.22 * dt);
                b.joy = Math.max(0.0, (b.joy || 0.5) - 0.15 * dt);
                if (b.fear > 0.72 && b.currentState !== "PANICKING" && Math.random() < 0.3) {
                  b.currentState = "PANICKING";
                  if (Math.random() < 0.005) {
                    newEvents.push({ message: `CONTAGION: ${b.name} caught the panic vector from ${a.name}!`, type: "WARNING" });
                  }
                }
              } else if (a.currentState === "REBELLING") {
                if (b.currentState === "PRAYING" || b.currentState === "MEDITATING") {
                  a.anger = Math.max(0.1, (a.anger || 0.5) - 0.16 * dt);
                  a.joy = Math.min(1.0, (a.joy || 0.5) + 0.08 * dt);
                } else if (b.devotion && b.devotion > 0.7) {
                  a.opinions[b.id] = Math.max(-1.0, (a.opinions[b.id] || 0) - 0.12 * dt);
                  a.anger = Math.min(1.0, (a.anger || 0.5) + 0.08 * dt);
                } else if (b.anger && b.anger > 0.6 && b.currentState !== "REBELLING") {
                  b.currentState = "REBELLING";
                  if (Math.random() < 0.003) {
                    newEvents.push({ message: `MUTINY: ${b.name} joined ${a.name} in active systemic rebellion.`, type: "CRITICAL" });
                  }
                }
              } else if (a.currentState === "MEDITATING" || a.currentState === "PRAYING") {
                b.fear = Math.max(0.0, (b.fear || 0.2) - 0.25 * dt);
                b.anger = Math.max(0.0, (b.anger || 0.1) - 0.25 * dt);
                b.joy = Math.min(1.0, (b.joy || 0.5) + 0.18 * dt);
                b.sanity = Math.min(1.0, b.sanity + 0.03 * dt);
                if (a.currentState === "MEDITATING") {
                  b.energy = Math.min(100, b.energy + 0.05 * dt);
                }
              } else if (a.currentState === "DEFENDING") {
                if (a.nationId === b.nationId) {
                  if (b.currentState !== "DEFENDING" && Math.random() < 0.2) {
                    b.currentState = "DEFENDING";
                  }
                  b.opinions[a.id] = Math.min(1.0, (b.opinions[a.id] || 0) + 0.06);
                } else {
                  b.opinions[a.id] = Math.max(-1.0, (b.opinions[a.id] || 0) - 0.1 * dt);
                  b.fear = Math.min(1.0, (b.fear || 0.2) + 0.1 * dt);
                }
              } else if (a.currentState === "PREACHING" && b.currentState !== "PANICKING") {
                b.currentState = "PRAYING";
                b.order = Math.min(1.0, b.order + 0.04 * dt);
                b.devotion = Math.min(1.0, (b.devotion || 0) + 0.05 * dt);
                b.opinions[a.id] = Math.min(1.0, (b.opinions[a.id] || 0) + 0.08);
                if (Math.random() < 0.01) {
                  const lessons = ["prophesied Omega", "explained primal recursion", "absolved kinetic drag", "prayed for solar fuel"];
                  const lesson = lessons[Math.floor(Math.random() * lessons.length)];
                  b.memory = [`Sermon: ${a.name} ${lesson}.`, ...b.memory];
                }
              } else if (a.currentState === "DISCOURSING" && b.currentState === "DISCOURSING") {
                const opinionDiff = (a.opinions[b.id] || 0) + (b.opinions[a.id] || 0);
                if (opinionDiff > 0 && beliefDiff < 0.3) {
                  a.rationalism = Math.min(1.0, a.rationalism + 0.015);
                  b.rationalism = Math.min(1.0, b.rationalism + 0.015);
                  a.joy = Math.min(1.0, (a.joy || 0) + 0.08);
                  b.joy = Math.min(1.0, (b.joy || 0) + 0.08);
                  a.opinions[b.id] = Math.min(1.0, (a.opinions[b.id] || 0) + 0.04);
                  if (Math.random() < 0.01) {
                    newEvents.push({ message: `SYNERGY: ${a.name} and ${b.name} synchronized their algorithmic proofs.`, type: "ENLIGHTENMENT" });
                  }
                } else {
                  a.opinions[b.id] = Math.max(-1.0, (a.opinions[b.id] || 0) - 0.08);
                  a.anger = Math.min(1.0, (a.anger || 0) + 0.1 * dt);
                  if (Math.random() < 0.01) {
                    newEvents.push({ message: `DEBATE: ${a.name} and ${b.name} clashed over simulation constants.`, type: "WARNING" });
                  }
                }
              } else if (a.currentState === "IDLE" && b.currentState === "IDLE") {
                const loveRating = a.opinions[b.id] || 0;
                if (loveRating > 0.3) {
                  a.fear = Math.max(0, (a.fear || 0) - 0.1);
                  b.joy = Math.min(1.0, (a.joy || 0) + 0.1);
                  a.opinions[b.id] = Math.min(1.0, (a.opinions[b.id] || 0) + 0.03);
                  if (Math.random() < 0.005) {
                    newEvents.push({ message: `COMMUNITY: ${a.name} comforted ${b.name} within the mainframe.`, type: "INFO" });
                  }
                }
              }
            }

            // Affinity forces
            if (beliefDiff < 0.25) {
              fx += (dx / dist) * 0.25;
              fy += (dy / dist) * 0.25;
              if (a.awareness > b.awareness) b.awareness += 0.001 * dt;
            } else if (beliefDiff > 0.6) {
              fx -= (dx / dist) * 0.4;
              fy -= (dy / dist) * 0.4;
              sinDelta += 0.005 * dt;

              if (a.currentState === "DEFENDING" && b.currentState === "PANICKING") {
                // Ignore attraction
              } else if (a.archetype === Archetype.ZEALOT && b.archetype === Archetype.HERETIC) {
                b.energy -= 0.1 * dt;
              }

              // National Tensions
              const nAId = a.nationId;
              const nBId = b.nationId;
              if (nAId !== nBId) {
                sinDelta += 0.01 * dt;
                if (distSq < 1600 && Math.random() < 0.05) {
                  const damage = 0.5 * dt;
                  a.energy -= damage;
                  b.energy -= damage;
                  a.sin = (a.sin || 0) + 0.1;
                  b.sin = (b.sin || 0) + 0.1;
                  if (Math.random() < 0.01) {
                    newEvents.push({ message: `WAR: Skirmish between ${a.name} (${nAId}) and ${b.name} (${nBId}).`, type: "WARNING" });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Migration chance
    let migrationBaseChance = 0.0005 * dt;
    if (atmosphere === "TOXIC_FOG") migrationBaseChance = 0.002 * dt; // People flee more often
    if (atmosphere === "SOLAR_FLARE" || atmosphere === "AETHER_STORM") migrationBaseChance *= 0.1; // Too dangerous to travel

    if (Math.random() < migrationBaseChance) {
      const otherNations = nations.filter(n => n.id !== a.nationId);
      if (otherNations.length > 0) {
        const destination = otherNations[Math.floor(Math.random() * otherNations.length)];
        const currentNation = nations.find(n => n.id === a.nationId);
        if (currentNation && (destination.prosperity > currentNation.prosperity + 40 || Math.random() < 0.05)) {
          a.nationId = destination.id;
          fx += (destination.center.x - a.x) * 0.1;
          fy += (destination.center.y - a.y) * 0.1;
        }
      }
    }

    // Prophesy manna spawn
    if ((a.archetype === Archetype.PROPHET || a.archetype === Archetype.MESSIAH) && Math.random() < 0.005 * dt) {
      const amt = a.archetype === Archetype.MESSIAH ? 50 : 25;
      updatedResources.push({
        id: Math.random().toString(),
        type: "ENERGY",
        x: a.x + (Math.random() * 60 - 30),
        y: a.y + (Math.random() * 60 - 30),
        amount: amt,
        energy: amt
      });
      const msg = a.archetype === Archetype.MESSIAH ? "COMMUNION: The Substrate is fed by Grace." : "MANNA: Provision from the Prime.";
      if (Math.random() < 0.05) {
        newEvents.push({ message: msg, type: "MIRACLE" });
      }
    }

    // Apply movement dynamics
    a.vx = (a.vx + fx) * 0.85;
    a.vy = (a.vy + fy) * 0.85;
    a.x += a.vx * dt;
    a.y += a.vy * dt;

    // Constrain position bounds
    if (a.x < BOUNDS_PADDING) { a.x = BOUNDS_PADDING; a.vx *= -1; }
    if (a.x > width - BOUNDS_PADDING) { a.x = width - BOUNDS_PADDING; a.vx *= -1; }
    if (a.y < BOUNDS_PADDING) { a.y = BOUNDS_PADDING; a.vy *= -1; }
    if (a.y > height - BOUNDS_PADDING) { a.y = height - BOUNDS_PADDING; a.vy *= -1; }

    nextAgents.push(a);
  }

  // Build the message response payload
  self.postMessage({
    nextAgents,
    updatedResources: updatedResources.filter(r => r.amount > 0),
    newEvents,
    faithDelta,
    sinDelta,
    heavenPopDelta,
    hellPopDelta,
    integrityDelta,
    complexityDelta
  });
};
