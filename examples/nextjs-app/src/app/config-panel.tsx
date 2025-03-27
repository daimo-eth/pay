import { supportedChains, supportedTokens, Token } from "@daimo/pay-common";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useState } from "react";
import { isAddress } from "viem";

// Define the possible configuration types
export type ConfigType = "payment" | "deposit";

// Base configuration interface
interface BaseConfig {
  recipientAddress: string;
  chainId: number;
  tokenAddress: string;
}

// Payment extends base with amount
export interface PaymentConfig extends BaseConfig {
  amount: string;
}

// Deposit uses base config directly
export type DepositConfig = BaseConfig;

// Common props for the config panel
interface ConfigPanelProps {
  configType: ConfigType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: PaymentConfig | DepositConfig) => void;
  defaultRecipientAddress?: string;
}

export function ConfigPanel({
  configType,
  isOpen,
  onClose,
  onConfirm,
  defaultRecipientAddress = "",
}: ConfigPanelProps) {
  // Initialize with all possible fields, even if some aren't used based on configType
  const [config, setConfig] = useState<PaymentConfig>({
    recipientAddress: defaultRecipientAddress,
    chainId: 0,
    tokenAddress: "",
    amount: "",
  });

  // Extract unique chains
  const chains = supportedChains;

  // Get tokens for selected chain
  const tokens = supportedTokens.filter(
    (token) => token.chainId === config.chainId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate recipient address
    if (!isAddress(config.recipientAddress)) {
      alert("Please enter a valid address");
      return;
    }

    // Create the appropriate config object based on type
    if (configType === "payment") {
      onConfirm(config);
    } else {
      // For deposit, exclude the amount field
      const { amount, ...depositConfig } = config;
      onConfirm(depositConfig);
    }

    onClose();
  };

  // Determine if the form is valid based on config type
  const isFormValid = () => {
    const baseValid =
      isAddress(config.recipientAddress) &&
      config.chainId > 0 &&
      config.tokenAddress !== "";

    // Payment requires amount field
    if (configType === "payment") {
      return baseValid && config.amount !== "";
    }

    // Deposit doesn't need amount
    return baseValid;
  };

  return (
    <div
      className={`
      fixed right-0 top-0 h-full w-96 bg-cream-light shadow-lg transform transition-transform z-50
      ${isOpen ? "translate-x-0" : "translate-x-full"}
    `}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-green-dark">
            {configType === "payment"
              ? "Payment Configuration"
              : "Deposit Configuration"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-green-dark hover:text-green-medium"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <input
              type="text"
              value={config.recipientAddress}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  recipientAddress: e.target.value,
                }))
              }
              className="w-full p-2 border border-gray-300 focus:border-green-medium focus:ring focus:ring-green-light focus:ring-opacity-50 rounded"
              placeholder="0x..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receiving Chain
            </label>
            <select
              value={config.chainId}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  chainId: Number(e.target.value),
                  tokenAddress: "", // Reset token when chain changes
                }))
              }
              className="w-full p-2 border border-gray-300 focus:border-green-medium focus:ring focus:ring-green-light focus:ring-opacity-50 rounded"
            >
              <option value={0}>Select Chain</option>
              {chains.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          {config.chainId > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receiving Token
              </label>
              <select
                value={config.tokenAddress}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    tokenAddress: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 focus:border-green-medium focus:ring focus:ring-green-light focus:ring-opacity-50 rounded"
              >
                <option value="">Select Token</option>
                {tokens.map((token) => (
                  <option key={token.token} value={token.token}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount field only shown for payment config */}
          {configType === "payment" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={config.amount}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                step="0.01"
                className="w-full p-2 border border-gray-300 focus:border-green-medium focus:ring focus:ring-green-light focus:ring-opacity-50 rounded"
                placeholder="Enter amount..."
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-dark text-white py-2 px-4 rounded hover:bg-green-medium transition-colors"
            disabled={!isFormValid()}
          >
            Confirm
          </button>
        </form>
      </div>
    </div>
  );
}
