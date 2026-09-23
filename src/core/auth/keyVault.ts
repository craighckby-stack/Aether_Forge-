import { base64Encode, base64Decode } from '../../utils/stringUtils';

export class SecureKeyVault {
  private keys: Map<string, string> = new Map();
  private storageKey = 'aetherforge_keys';

  constructor() {
    this.load();
  }

  setKey(service: string, key: string) {
    this.keys.set(service, base64Encode(key));
    this.save();
  }

  getKey(service: string): string | null {
    const obscured = this.keys.get(service);
    return obscured ? base64Decode(obscured) : null;
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.keys.entries())));
    }
  }

  private load() {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        try {
          this.keys = new Map(JSON.parse(data));
        } catch (e) {
          console.error("Key vault load error", e);
        }
      }
    }
  }
}

export const keyVault = new SecureKeyVault();
