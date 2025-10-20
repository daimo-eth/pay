"use client";

import {
  allowAllModules,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { useState } from "react";

/**
 * Test component that demonstrates the stellarKit prop integration
 * Shows how users can provide their existing StellarWalletsKit instance
 */
export function StellarIntegrationTest() {
  const [userKit, setUserKit] = useState<StellarWalletsKit | null>(null);
  const [testStatus, setTestStatus] = useState<
    "idle" | "running" | "completed"
  >("idle");

  const createUserKit = () => {
    setTestStatus("running");

    try {
      console.log(
        "🧪 [INTEGRATION TEST] Creating user's StellarWalletsKit instance..."
      );

      // This simulates a user creating their own StellarWalletsKit with custom config
      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: "freighter",
        modules: allowAllModules(),
        // User could add custom modules, different network, etc.
      });

      setUserKit(kit);
      setTestStatus("completed");

      console.log(
        "✅ [INTEGRATION TEST] User's StellarWalletsKit created successfully"
      );
      console.log(
        "💡 [INTEGRATION TEST] This kit can be passed to RozoPayProvider via stellarKit prop"
      );
    } catch (error) {
      console.error(
        "❌ [INTEGRATION TEST] Failed to create user's StellarWalletsKit:",
        error
      );
      setTestStatus("completed");
    }
  };

  const resetTest = () => {
    setUserKit(null);
    setTestStatus("idle");
    console.log("🔄 [INTEGRATION TEST] Test reset");
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">
        🔗 StellarWalletsKit Integration Test
      </h3>

      <div className="space-y-4">
        <div className="text-sm text-blue-700">
          This test demonstrates how users can provide their existing
          StellarWalletsKit instance to the RozoAI Intent Pay SDK for seamless
          integration.
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={createUserKit}
            disabled={testStatus === "running" || userKit !== null}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {testStatus === "running" ? "Creating..." : "Create User Kit"}
          </button>

          <button
            onClick={resetTest}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Reset Test
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <strong>Test Status:</strong>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs ${
                testStatus === "idle"
                  ? "bg-gray-100 text-gray-600"
                  : testStatus === "running"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {testStatus}
            </span>
          </div>

          <div className="text-sm">
            <strong>User Kit:</strong>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs ${
                userKit
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {userKit ? "Created" : "None"}
            </span>
          </div>
        </div>

        {userKit && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-sm text-green-800">
              <strong>✅ User Kit Created!</strong>
              <br />
              This StellarWalletsKit instance can be passed to RozoPayProvider:
              <br />
              <code className="bg-green-100 px-2 py-1 rounded text-xs mt-1 inline-block">
                &lt;RozoPayProvider stellarKit={userKit as any} ... /&gt;
              </code>
              <br />
              <br />
              <strong>Test it:</strong> The kit is now available globally and
              can be used to prevent conflicts when integrating with existing
              Stellar apps.
            </div>
          </div>
        )}

        <div className="text-xs text-blue-600">
          <strong>Benefits of using stellarKit prop:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>No custom element conflicts</li>
            <li>Reuse existing wallet connections</li>
            <li>Custom configuration preserved</li>
            <li>Seamless integration with existing Stellar apps</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
