export interface PluginHooks {
  onMemoryAdd?: (context: any) => Promise<any> | any;
  onAgentDecision?: (context: any) => Promise<any> | any;
  onRealityBranch?: (context: any) => Promise<any> | any;
  onTaskComplete?: (context: any) => Promise<any> | any;
  beforeLLMCall?: (context: any) => Promise<any> | any;
  afterLLMCall?: (context: any) => Promise<any> | any;
  selectModel?: (taskType: string, requirements: any) => Promise<string | undefined> | string | undefined;
}

export interface Plugin extends PluginHooks {
  id: string;
  name: string;
  version?: string;
  description?: string;
}

export class PluginSystem {
  plugins: Map<string, Plugin>;
  hooks: Record<keyof Omit<PluginHooks, 'selectModel'>, Array<(context: any) => any>>;

  constructor() {
    this.plugins = new Map();
    this.hooks = {
      onMemoryAdd: [],
      onAgentDecision: [],
      onRealityBranch: [],
      onTaskComplete: [],
      beforeLLMCall: [],
      afterLLMCall: []
    };
  }

  register(plugin: Plugin): string {
    if (!plugin.id || !plugin.name) {
      throw new Error('Plugin must have id and name');
    }
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered. Overwriting.`);
    }

    this.plugins.set(plugin.id, plugin);
    this._registerHooks(plugin);
    
    console.log(`[PluginSystem] Registered: ${plugin.name} (${plugin.id})`);
    return plugin.id;
  }

  _registerHooks(plugin: Plugin) {
    const hookKeys: Array<keyof Omit<PluginHooks, 'selectModel'>> = [
      'onMemoryAdd', 'onAgentDecision', 'onRealityBranch', 
      'onTaskComplete', 'beforeLLMCall', 'afterLLMCall'
    ];
    
    hookKeys.forEach(hookName => {
      if (typeof plugin[hookName] === 'function') {
        // @ts-ignore
        this.hooks[hookName].push(plugin[hookName].bind(plugin));
      }
    });
  }

  async triggerHook(hookName: keyof Omit<PluginHooks, 'selectModel'>, context: any = {}): Promise<any[]> {
    const results = [];
    for (const handler of this.hooks[hookName] || []) {
      try {
        const result = await handler(context);
        results.push(result);
      } catch (e) {
        console.error(`Hook ${hookName} failed:`, e);
      }
    }
    return results;
  }

  async getBestModelForTask(taskType: string, requirements: any = {}): Promise<string> {
    const plugins = Array.from(this.plugins.values());
    let bestModel = 'grok-beta'; // default

    for (const plugin of plugins) {
      if (typeof plugin.selectModel === 'function') {
        const suggestion = await plugin.selectModel(taskType, requirements);
        if (suggestion) {
          bestModel = suggestion;
          break;
        }
      }
    }
    return bestModel;
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version || '1.0',
      description: p.description || ''
    }));
  }
}

export const pluginSystem = new PluginSystem();
