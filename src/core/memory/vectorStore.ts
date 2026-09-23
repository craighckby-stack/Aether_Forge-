import { base64Encode, base64Decode } from '../../utils/stringUtils';

export interface MemoryMetadata {
  realityId?: string;
  agentId?: string;
  epoch?: number;
  tags?: string[];
  importance?: number;
  [key: string]: any;
}

export interface Memory {
  id: string;
  embedding: number[];
  content: string;
  metadata: MemoryMetadata;
  timestamp: string;
  similarity?: number;
}

export interface VectorMemoryOptions {
  dimension?: number;
  maxMemories?: number;
  persistenceKey?: string;
  similarityThreshold?: number;
}

export class VectorMemory {
  memories: Memory[];
  dimension: number;
  maxMemories: number;
  persistenceKey: string;
  similarityThreshold: number;

  constructor(options: VectorMemoryOptions = {}) {
    this.memories = [];
    this.dimension = options.dimension || 1536;
    this.maxMemories = options.maxMemories || 10000;
    this.persistenceKey = options.persistenceKey || 'aetherforge_vector_memory';
    this.similarityThreshold = options.similarityThreshold || 0.75;
  }

  async _generateEmbedding(text: string): Promise<number[]> {
    console.log(`[VectorMemory] Generating embedding for: ${text.substring(0, 80)}...`);
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = new Array(this.dimension).fill(0).map((_, i) => 
      Math.sin(seed + i) * 0.5 + Math.random() * 0.1
    );
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
    return embedding.map(x => x / norm);
  }

  _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  async addMemory(content: string, metadata: MemoryMetadata = {}): Promise<string> {
    const embedding = await this._generateEmbedding(content);
    
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      embedding,
      content: content.trim(),
      metadata: {
        realityId: metadata.realityId || 'root',
        agentId: metadata.agentId || 'unknown',
        epoch: metadata.epoch || 0,
        tags: metadata.tags || [],
        importance: metadata.importance || 0.5,
        ...metadata
      },
      timestamp: new Date().toISOString()
    };

    this.memories.push(memory);
    
    if (this.memories.length > this.maxMemories) {
      this.memories.sort((a, b) => 
        (b.metadata.importance || 0) - (a.metadata.importance || 0) || 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      this.memories.length = this.maxMemories;
    }

    this._persist();
    return memory.id;
  }

  async retrieve(query: string, topK: number = 5, filters: Record<string, any> = {}): Promise<Memory[]> {
    const queryEmbedding = await this._generateEmbedding(query);
    
    const scored = this.memories
      .filter(mem => this._matchesFilters(mem, filters))
      .map(mem => ({
        ...mem,
        similarity: this._cosineSimilarity(queryEmbedding, mem.embedding)
      }))
      .filter(mem => (mem.similarity ?? 0) >= this.similarityThreshold)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, topK);

    return scored;
  }

  _matchesFilters(memory: Memory, filters: Record<string, any>): boolean {
    if (filters.realityId && memory.metadata.realityId !== filters.realityId) return false;
    if (filters.agentId && memory.metadata.agentId !== filters.agentId) return false;
    if (filters.epochMin !== undefined && (memory.metadata.epoch ?? 0) < filters.epochMin) return false;
    if (filters.tags && filters.tags.length) {
      return filters.tags.some((tag: string) => (memory.metadata.tags ?? []).includes(tag));
    }
    return true;
  }

  async reflect(memories: Memory[], promptPrefix: string = "Synthesize key insights from these memories:"): Promise<string> {
    if (!memories.length) return "";
    
    const context = memories.map((m, i) => 
      `[${i+1}] ${m.content} (sim: ${m.similarity?.toFixed(2)})`
    ).join('\n\n');

    return `${promptPrefix}\n\n${context}\n\nKey patterns and strategic implications:`;
  }

  _persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const serialized = this.memories.map(m => ({
          ...m,
          embedding: base64Encode(JSON.stringify(m.embedding)) 
        }));
        localStorage.setItem(this.persistenceKey, JSON.stringify(serialized));
      }
    } catch (e) {
      console.warn('Vector memory persistence failed', e);
    }
  }

  async loadPersisted(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.persistenceKey);
        if (!saved) return;
        
        const parsed: any[] = JSON.parse(saved);
        this.memories = parsed.map(m => ({
          ...m,
          embedding: JSON.parse(base64Decode(m.embedding))
        }));
        console.log(`[VectorMemory] Loaded ${this.memories.length} memories`);
      }
    } catch (e) {
      console.warn('Failed to load vector memory', e);
    }
  }

  clear(): void {
    this.memories = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.persistenceKey);
    }
  }
}

export const vectorMemory = new VectorMemory();
