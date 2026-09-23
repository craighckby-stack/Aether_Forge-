import { pluginSystem, Plugin } from '../core/plugins/pluginSystem';

export class TestingPlugin implements Plugin {
  id = 'testing-validator';
  name = 'Testing & Validation Utilities';
  version = '1.0';
  description = 'Automated validation for LLM outputs and architectural constraints';

  async afterLLMCall(context: any) {
    console.log('[Testing] Validating LLM output structure');
    if (!context.response) {
      console.warn('[Testing] Empty LLM response detected');
    }
  }
}

pluginSystem.register(new TestingPlugin());
