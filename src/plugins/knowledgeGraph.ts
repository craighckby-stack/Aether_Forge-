import { pluginSystem, Plugin } from '../core/plugins/pluginSystem';
import { vectorMemory } from '../core/memory/vectorStore';

export class KnowledgeGraphPlugin implements Plugin {
  id = 'knowledge-graph-viz';
  name = 'Knowledge Graph Visualizer';
  version = '0.2';
  description = 'Builds and visualizes knowledge graphs from agent memories';

  async onMemoryAdd({ memory }: { memory: any }) {
    console.log(`[KG] Indexing memory ${memory.id}`);
  }

  async onTaskComplete({ task, result }: { task: any, result: string }) {
    await vectorMemory.addMemory(result, {
      tags: ['graph-node', 'insight'],
      importance: 0.7
    });
  }

  async getGraphData(realityId: string) {
    const memories = await vectorMemory.retrieve('', 50, { realityId });
    return {
      nodes: memories.map(m => ({ id: m.id, label: m.content.substring(0, 40) })),
      edges: [] 
    };
  }
}

export const kgPlugin = new KnowledgeGraphPlugin();
pluginSystem.register(kgPlugin);
