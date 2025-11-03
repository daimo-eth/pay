import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { WalletConnectAllowedMethods, WalletConnectModule } from ".";

// Global singleton to ensure only one instance exists across the entire app
declare global {
  var __ROZO_STELLAR_KIT_INSTANCE__: StellarWalletsKit | undefined;
  var __ROZO_STELLAR_KIT_LOADING__: Promise<StellarWalletsKit> | undefined;
}

/**
 * Creates or returns existing StellarWalletsKit instance
 * This prevents duplicate custom element registration errors
 */
export async function getStellarKitInstance(config?: {
  log?: (msg: string) => void;
  network?: any;
  selectedWalletId?: string;
  modules?: any[];
}): Promise<StellarWalletsKit> {
  // Return existing instance if available
  if (
    typeof window !== "undefined" &&
    globalThis.__ROZO_STELLAR_KIT_INSTANCE__
  ) {
    config?.log?.("[Rozo] Using existing StellarWalletsKit instance");
    return globalThis.__ROZO_STELLAR_KIT_INSTANCE__;
  }

  // If already loading, wait for it
  if (
    typeof window !== "undefined" &&
    globalThis.__ROZO_STELLAR_KIT_LOADING__
  ) {
    config?.log?.("[Rozo] Waiting for StellarWalletsKit initialization...");
    return globalThis.__ROZO_STELLAR_KIT_LOADING__;
  }

  // Check if custom element is already registered
  if (
    typeof window !== "undefined" &&
    customElements.get("stellar-wallets-modal")
  ) {
    throw new Error(
      "⚠️ StellarWalletsKit custom element is already registered.\n\n" +
        "This usually means the library was initialized elsewhere in your app.\n" +
        "To fix this:\n\n" +
        "1. Create ONE StellarWalletsKit instance at your app root\n" +
        '2. Pass it to RozoPayProvider via the "stellarKit" prop\n\n' +
        "Example:\n\n" +
        'import { StellarWalletsKit, WalletNetwork, allowAllModules } from "@creit.tech/stellar-wallets-kit";\n\n' +
        "const stellarKit = new StellarWalletsKit({\n" +
        "  network: WalletNetwork.PUBLIC,\n" +
        "  modules: allowAllModules(),\n" +
        "});\n\n" +
        "<RozoPayProvider stellarKit={stellarKit}>\n" +
        "  {children}\n" +
        "</RozoPayProvider>"
    );
  }

  // Start loading
  const loadingPromise = (async () => {
    try {
      const module = await import("@creit.tech/stellar-wallets-kit");
      const { StellarWalletsKit, WalletNetwork, allowAllModules } = module;

      const newKit = new StellarWalletsKit({
        network: config?.network || WalletNetwork.PUBLIC,
        selectedWalletId: config?.selectedWalletId || "freighter",
        modules: config?.modules || [
          ...allowAllModules(),
          new WalletConnectModule({
            url: "https://rozo.ai",
            projectId: "ab8fa47f01e6a72c58bbb76577656051",
            method: WalletConnectAllowedMethods.SIGN_AND_SUBMIT,
            description: `Visa Layer for Stablecoins`,
            name: "Rozo",
            icons: ["https://rozo.ai/rozo-logo.png"],
            network: WalletNetwork.PUBLIC,
          }),
        ],
      });

      // Store globally
      if (typeof window !== "undefined") {
        globalThis.__ROZO_STELLAR_KIT_INSTANCE__ = newKit;
      }

      config?.log?.("[Rozo] StellarWalletsKit initialized successfully");
      return newKit;
    } catch (error) {
      config?.log?.(`[Rozo] Failed to initialize StellarWalletsKit: ${error}`);
      throw error;
    } finally {
      if (typeof window !== "undefined") {
        globalThis.__ROZO_STELLAR_KIT_LOADING__ = undefined;
      }
    }
  })();

  if (typeof window !== "undefined") {
    globalThis.__ROZO_STELLAR_KIT_LOADING__ = loadingPromise;
  }

  return loadingPromise;
}

/**
 * Destroys the singleton instance (useful for testing)
 */
export function destroyStellarKitInstance(): void {
  if (typeof window !== "undefined") {
    globalThis.__ROZO_STELLAR_KIT_INSTANCE__ = undefined;
    globalThis.__ROZO_STELLAR_KIT_LOADING__ = undefined;
  }
}
