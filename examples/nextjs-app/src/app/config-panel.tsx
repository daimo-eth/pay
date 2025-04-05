import { solana, supportedChains, supportedTokens } from "@daimo/pay-common";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useState, useEffect } from "react";
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
  // Initialize with default values
  const [config, setConfig] = useState<PaymentConfig>({
    recipientAddress: defaultRecipientAddress,
    chainId: 0,
    tokenAddress: "",
    amount: "",
  });

  // Load saved config after mount
  useEffect(() => {
    const storageKey =
      configType === "payment" ? "daimo-basic-config" : "daimo-deposit-config";
    try {
      const savedConfig = localStorage.getItem(storageKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (
          parsed &&
          typeof parsed === "object" &&
          "recipientAddress" in parsed &&
          "chainId" in parsed &&
          "tokenAddress" in parsed
        ) {
          setConfig(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load saved config:", e);
    }
  }, [configType]); // Only run when configType changes

  // Add error state for recipient address
  const [addressError, setAddressError] = useState<string>("");

  // Extract unique chains
  const chains = supportedChains.filter(
    (chain) => chain.chainId !== solana.chainId,
  ); // Exclude Solana

  // Get tokens for selected chain
  const tokens = supportedTokens.filter(
    (token) => token.chainId === config.chainId,
  );

  // Validate address on change
  const validateAddress = useCallback((address: string) => {
    if (!address) {
      setAddressError("Address is required");
      return false;
    }
    if (!isAddress(address)) {
      setAddressError("Invalid Ethereum address");
      return false;
    }
    setAddressError("");
    return true;
  }, []);

  // Update address handler
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setConfig((prev) => ({
      ...prev,
      recipientAddress: newAddress,
    }));
    validateAddress(newAddress);
  };

  // Update form submission
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

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
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
              className={`w-full p-2 border rounded ${
                addressError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-green-medium focus:ring-green-light"
              } focus:ring focus:ring-opacity-50`}
              placeholder="0x..."
              formNoValidate
            />
            {addressError && (
              <p className="mt-1 text-sm text-red-500">{addressError}</p>
            )}
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
              formNoValidate
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
                formNoValidate
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
                formNoValidate
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
