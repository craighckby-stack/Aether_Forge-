import { pluginSystem, Plugin } from '../core/plugins/pluginSystem';
import { keyVault } from '../core/auth/keyVault';

export class AuthPlugin implements Plugin {
  id = 'auth-vault';
  name = 'Secure API Key Vault';
  version = '1.0';
  description = 'Manages authentication and keys for external APIs.';

  async beforeLLMCall(context: any) {
    if (!context.apiKey) {
      context.apiKey = keyVault.getKey('default_llm_key');
    }
  }
}

export const authPlugin = new AuthPlugin();
pluginSystem.register(authPlugin);
