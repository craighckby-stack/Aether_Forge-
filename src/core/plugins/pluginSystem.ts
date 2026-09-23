export type AsyncOrSync<T> = Promise<T> | T;
export type HookContext = Record<string, unknown>;
export type ModelRequirements = Record<string, unknown>;

export interface PluginHooks {
  onMemoryAdd?: (context: HookContext) => AsyncOrSync<unknown>;
  onAgentDecision?: (context: HookContext) => AsyncOrSync<unknown>;
  onRealityBranch?: (context: HookContext) => AsyncOrSync<unknown>;
  onTaskComplete?: (context: HookContext) => AsyncOrSync<unknown>;
  beforeLLMCall?: (context: HookContext) => AsyncOrSync<unknown>;
  afterLLMCall?: (context: HookContext) => AsyncOrSync<unknown>;
  selectModel?: (taskType: string, requirements: ModelRequirements) => AsyncOrSync<string | undefined>;
}

export interface Plugin extends PluginHooks {
  id: string;
  name: string;
  version?: string;
  description?: string;
}

type StandardHookName = keyof Omit<PluginHooks, 'selectModel'>;

export interface PluginSummary {
  id: string;
  name: string;
  version: string;
  description: string;
}

export class PluginSystem {
  private readonly plugins = new Map<string, Plugin>();
  private readonly hooks: Record<StandardHookName, Array<(context: HookContext) => AsyncOrSync<unknown>>> = {
    onMemoryAdd: [],
    onAgentDecision: [],
    onRealityBranch: [],
    onTaskComplete: [],
    beforeLLMCall: [],
    afterLLMCall: [],
  };

  private static readonly STANDARD_HOOKS: StandardHookName[] = [
    'onMemoryAdd',
    'onAgentDecision',
    'onRealityBranch',
    'onTaskComplete',
    'beforeLLMCall',
    'afterLLMCall',
  ];

  public register(plugin: Plugin): string {
    if (!plugin.id || !plugin.name) {
      throw new Error('Plugin must have id and name');
    }

    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered. Overwriting.`);
    }

    this.plugins.set(plugin.id, plugin);
    this.registerPluginHooks(plugin);
    
    console.log(`[PluginSystem] Registered: ${plugin.name} (${plugin.id})`);
    return plugin.id;
  }

  private registerPluginHooks(plugin: Plugin): void {
    for (const hookName of PluginSystem.STANDARD_HOOKS) {
      const hookHandler = plugin[hookName];
      if (typeof hookHandler === 'function') {
        this.hooks[hookName].push(hookHandler.bind(plugin));
      }
    }
  }

  public async triggerHook(hookName: StandardHookName, context: HookContext = {}): Promise<unknown[]> {
    const handlers = this.hooks[hookName] ?? [];
    const results: unknown[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler(context);
        results.push(result);
      } catch (error: unknown) {
        console.error(`Hook ${hookName} failed:`, error);
      }
    }

    return results;
  }

  public async getBestModelForTask(taskType: string, requirements: ModelRequirements = {}): Promise<string> {
    const DEFAULT_MODEL = 'grok-beta';

    for (const plugin of this.plugins.values()) {
      if (typeof plugin.selectModel === 'function') {
        const suggestion = await plugin.selectModel(taskType, requirements);
        if (suggestion) {
          return suggestion;
        }
      }
    }

    return DEFAULT_MODEL;
  }

  public listPlugins(): PluginSummary[] {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version ?? '1.0',
      description: p.description ?? '',
    }));
  }
}

export const pluginSystem = new PluginSystem();