export enum CosmicPhase { GENESIS = "GENESIS", STELLAR_VOID = "STELLAR_VOID", RECONSTRUCTION = "RECONSTRUCTION", JUDGMENT = "JUDGMENT", REQUIEM_EXPLOSION = "REQUIEM_EXPLOSION", STELLAR_REQUIEM = "STELLAR_REQUIEM" }
export enum EpochType { PRIMAL = "PRIMAL", AWAKENING = "AWAKENING", ENLIGHTENMENT = "ENLIGHTENMENT", TRANSCENDENCE = "TRANSCENDENCE", SINGULARITY = "SINGULARITY", AGRARIAN = "AGRARIAN", CLASSICAL = "CLASSICAL", INDUSTRIAL = "INDUSTRIAL", INFORMATION = "INFORMATION", POST_HUMAN = "POST_HUMAN" }
export enum Ideology { THEOCRACY = "THEOCRACY", TECHNOCRACY = "TECHNOCRACY", DEMOCRACY = "DEMOCRACY", AUTOCRACY = "AUTOCRACY", ANARCHY = "ANARCHY" }
export enum Archetype { PRIEST = "PRIEST", SCHOLAR = "SCHOLAR", WARRIOR = "WARRIOR", ARTISAN = "ARTISAN", PROPHET = "PROPHET", ZEALOT = "ZEALOT", SCIENTIST = "SCIENTIST", HERETIC = "HERETIC", ANGEL = "ANGEL", DEMON = "DEMON", MESSIAH = "MESSIAH", TYRANT = "TYRANT", GLITCH = "GLITCH" }
export enum AtmosphereCondition { NORMAL = "NORMAL", SOLAR_FLARE = "SOLAR_FLARE", TOXIC_FOG = "TOXIC_FOG", AETHER_STORM = "AETHER_STORM", DIVINE_ECLIPSE = "DIVINE_ECLIPSE" }
export const EPOCH_DATA = { 
  [EpochType.PRIMAL]: { label: 'Primal Foundation', threshold: 0 }, 
  [EpochType.AWAKENING]: { label: 'Age of Awakening', threshold: 100 },
  [EpochType.ENLIGHTENMENT]: { label: 'Age of Enlightenment', threshold: 200 },
  [EpochType.TRANSCENDENCE]: { label: 'Era of Transcendence', threshold: 300 },
  [EpochType.SINGULARITY]: { label: 'Singularity', threshold: 400 },
  [EpochType.AGRARIAN]: { label: 'Agrarian', threshold: 50 },
  [EpochType.CLASSICAL]: { label: 'Classical', threshold: 150 },
  [EpochType.INDUSTRIAL]: { label: 'Industrial', threshold: 250 },
  [EpochType.INFORMATION]: { label: 'Information', threshold: 350 },
  [EpochType.POST_HUMAN]: { label: 'Post-Human', threshold: 450 }
};
export const PHASE_THRESHOLDS = {
  [CosmicPhase.GENESIS]: 0,
  [CosmicPhase.STELLAR_VOID]: 500,
  [CosmicPhase.RECONSTRUCTION]: 1500,
  [CosmicPhase.JUDGMENT]: 2500,
  [CosmicPhase.STELLAR_REQUIEM]: 5000
};
export interface ResourceNode { id: string; x: number; y: number; energy: number; amount: number; type: string; maxAmount?: number; }
export interface PrayerEmail { id: string; agentId: number; agentName: string; archetype: Archetype; subject: string; body: string; status: "answered" | "pending" | "ignored"; receivedAt: number; resolvedAt?: number; response?: string; }
export interface EventRecord { id?: string; timestamp: number; message: string; type: string; }
export interface Nation { id: string; name: string; color: string; faithType: string; ideology: Ideology; population: number; prosperity: number; techLevel: number; stability: number; center: { x: number, y: number }; hostilities: any; lastIdeologyChange: number; establishedAt: number; }
export interface Agent { id: number; name: string; archetype: Archetype; x: number; y: number; vx: number; vy: number; health: number; energy: number; faith: number; stress: number; consciousness: number; trueAwareness: number; isSubstrateAware: boolean; currentState: string; currentTask: string | null; targetId: string | null; nationId: string | null; memories: string[]; age: number; memory: string[]; awareness: number; sanity: number; devotion: number; fear: number; joy: number; anger: number; rationalism: number; generation: number; order: number; lifespan: number; politicalBias?: number; opinions?: any; lastInteractionTime?: number; sin: number; }
export interface WorldState { clock: number; complexity: number; integrity: number; population: number; epoch: EpochType; phase: CosmicPhase; sunHealth: number; solarRequiemActive: boolean; techLevel: number; stability: number; resourceDensity: number; nationCount: number; totalRevolutions: number; totalSchisms: number; totalWars: number; totalPeaceTreaties: number; threatLevel: number; seeds: number[]; events: EventRecord[]; entropy: number; faithPoints: number; globalWorship: number; sinAccumulation: number; judgmentMeter: number; heavenPop: number; hellPop: number; activeMiracle?: string; prayers?: PrayerEmail[]; githubTech?: any[]; nations: Nation[]; atmosphere?: AtmosphereCondition; historyLog?: string[]; }

// ============================================================================
// FIRESTORE BLUEPRINT ALIGNED TYPES
// Expanded representations directly mirroring /firebase-blueprint.json schemas
// ============================================================================

/**
 * Represents the document structure for `Event` found at path `/worlds/{worldId}/events/{eventId}`.
 * Maps directly to 'Event' schema definition in firebase-blueprint.json.
 */
export interface IDBEvent {
  /** The temporal UNIX clock index representation of when this event occurred. */
  timestamp: number;
  /** Complete textual logs of the event state parameters. */
  message: string;
  /** The category designation matchingallowed schemas. */
  type: "INFO" | "WARNING" | "CRITICAL" | "ENLIGHTENMENT" | "MIRACLE" | "DIVINE_WRATH" | "GOSPEL";
}

/**
 * Represents the document structure for `Agent` stored at path `/worlds/{worldId}/agents/{agentId}`.
 * Maps directly to 'Agent' schema definition in firebase-blueprint.json.
 */
export interface IDBAgent {
  /** Unique primary key identifier for the entity instance. */
  id: string;
  /** Natural name generated by the simulation epoch. */
  name: string;
  /** Index representing vertical lineage count. */
  generation: number;
  /** Total elapsed clock steps since creation. */
  age: number;
  /** Maximum threshold of clock steps before dying of age elements. */
  lifespan: number;
  /** Alignment factor measuring system compliance [0.0 - 1.0]. */
  order: number;
  /** Propensity to seek intellectual logic calculations over belief [0.0 - 1.0]. */
  rationalism: number;
  /** Calibrated mental stability indicator [0.0 - 1.0]. */
  sanity: number;
  /** Core computational personality vector. */
  archetype: "SAGE" | "WARRIOR" | "SCIENTIST" | "ARTIST" | "TYRANT" | "GLITCH" | "MESSIAH" | "ANGEL" | "DEMON" | "PROPHET" | string;
  /** Ordered history of thoughts and experiences. */
  memory: string[];
  /** X-coordinate position within bounds boundary pixels [0 - viewportWidth]. */
  x: number;
  /** Y-coordinate position within bounds boundary pixels [0 - viewportHeight]. */
  y: number;
  /** Horizontal velocity vector trajectory speed. */
  vx: number;
  /** Vertical velocity vector trajectory speed. */
  vy: number;
  /** Awareness coordinate capturing alignment with the Observer [0.0 - 1.0]. */
  awareness: number;
  /** Action potential fuel reserves [0.0 - 100.0]. */
  energy: number;
}

/**
 * Represents the document structure for `WorldState` stored at path `/worlds/{worldId}`.
 * Maps directly to 'WorldState' schema definition in firebase-blueprint.json.
 */
export interface IDBWorldState {
  /** Master clock count representing total seconds/time steps run since genesis. */
  clock: number;
  /** Complexity score multiplier summing aggregate analytical developments. */
  complexity: number;
  /** Stability and infrastructure wellness index [0.0 - 100.0]. */
  integrity: number;
  /** Current count of live agents concurrently stored. */
  population: number;
  /** The civilizational age identifier name. */
  epoch: string;
  /** Environmental hostility threat indices. */
  threatLevel: number;
  /** Overall chaos scoring indicator derived from lack of integrity [0.0 - 1.0]. */
  entropy: number;
  /** Accumulation of devout grace and prayer metrics supporting divine maneuvers. */
  faithPoints: number;
  /** Instantaneous global volume of agent prayers. */
  globalWorship: number;
  /** Measure of system defiance and corrupt activities. */
  sinAccumulation: number;
  /** Apocalypse and rapture countdown timer tracking closeness to total collapse [0.0 - 100.0]. */
  judgmentMeter: number;
  /** Number of agents sent to Paradise during judgment. */
  heavenPop: number;
  /** Number of agents sent to the Periphery during judgment. */
  hellPop: number;
}

