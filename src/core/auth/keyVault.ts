/**
 * Ephemeral Session Credential Vault
 * 
 * BOUNDARY SPECIFICATION:
 * - Credentials (such as temporary GitHub personal access tokens) are held in-memory
 *   and scoped to the active browser tab via sessionStorage.
 * - This is an ephemeral session cache, NOT a hardware security module or encrypted cold storage.
 * - Credentials are never written to unencrypted long-lived localStorage, and can be purged
 *   at any time via clearSessionCredentials().
 */

export class EphemeralSessionVault {
  private memoryCache: Map<string, string> = new Map();
  private storagePrefix = "af_session_cred_";

  constructor() {
    this.hydrateFromSession();
  }

  /**
   * Stores a credential in-memory and in sessionStorage for the duration of the current tab.
   */
  public setKey(service: string, key: string): void {
    if (!service || !key) return;
    this.memoryCache.set(service, key);
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.setItem(`${this.storagePrefix}${service}`, key);
      } catch (e) {
        console.warn("SessionStorage unavailable for credential caching:", e);
      }
    }
  }

  /**
   * Retrieves a credential from memory or active tab sessionStorage.
   */
  public getKey(service: string): string | null {
    if (this.memoryCache.has(service)) {
      return this.memoryCache.get(service) || null;
    }
    if (typeof sessionStorage !== "undefined") {
      try {
        const val = sessionStorage.getItem(`${this.storagePrefix}${service}`);
        if (val) {
          this.memoryCache.set(service, val);
          return val;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Purges all credentials from memory and sessionStorage.
   */
  public clearSessionCredentials(): void {
    this.memoryCache.clear();
    if (typeof sessionStorage !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(this.storagePrefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {
        console.warn("Error clearing session credentials:", e);
      }
    }
  }

  private hydrateFromSession(): void {
    if (typeof sessionStorage === "undefined") return;
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.storagePrefix)) {
          const service = k.replace(this.storagePrefix, "");
          const val = sessionStorage.getItem(k);
          if (val) {
            this.memoryCache.set(service, val);
          }
        }
      }
    } catch (e) {
      // Ignore sessionStorage access errors
    }
  }
}

export const ephemeralVault = new EphemeralSessionVault();
// Backward compatibility export alias
export const keyVault = ephemeralVault;
export const SecureKeyVault = EphemeralSessionVault;
