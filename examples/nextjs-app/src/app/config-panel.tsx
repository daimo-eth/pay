import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  baseUSDC,
  ethereum,
  knownTokens,
  rozoStellar,
  solana,
  stellar,
  stellarUSDC,
  supportedChains,
} from "@rozoai/intent-common";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, isAddress } from "viem";

// Define the possible configuration types
export type ConfigType = "payment" | "deposit";

// Base configuration interface
interface BaseConfig {
  recipientAddress: string;
  recipientStellarAddress?: string;
  chainId: number;
  tokenAddress: string;
  amount: string;
}

// Payment extends base with amount
export interface PaymentConfig extends BaseConfig {
  amount: string;
}

// Deposit uses base config directly
export interface DepositConfig extends BaseConfig {
  amount: "";
}

// Common props for the config panel
interface ConfigPanelProps {
  configType: ConfigType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: PaymentConfig | DepositConfig) => void;
  defaultRecipientAddress?: string;
}

const tempAddress = "0x0000000000000000000000000000000000000000" as Address;

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
    recipientStellarAddress: "",
    chainId: 0,
    tokenAddress: "",
    amount: "",
  });

  // Load saved config after mount
  useEffect(() => {
    const storageKey =
      configType === "payment" ? "rozo-basic-config" : "rozo-deposit-config";
    try {
      const savedConfig = localStorage.getItem(storageKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const parsedConfig = { ...parsed };

        if (!isAddress(parsed.tokenAddress) && parsed.chainId !== 0) {
          Object.assign(parsedConfig, {
            tokenAddress: tempAddress,
          });
        }

        if (!isAddress(parsed.recipientAddress) && parsed.chainId !== 0) {
          Object.assign(parsedConfig, {
            recipientAddress: tempAddress,
          });
        }

        console.log({ parsedConfig });

        if (
          parsedConfig &&
          typeof parsedConfig === "object" &&
          "recipientAddress" in parsedConfig &&
          "chainId" in parsedConfig &&
          "tokenAddress" in parsedConfig
        ) {
          setConfig(parsedConfig);
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
    (chain) =>
      chain.chainId !== solana.chainId &&
      chain.chainId !== ethereum.chainId &&
      chain.chainId !== stellar.chainId
  ); // Exclude Solana and Ethereum

  // Get tokens for selected chain
  const tokens = useMemo(() => {
    if (config.chainId !== 0 && !config.recipientStellarAddress) {
      return knownTokens.filter((t) => t.chainId === config.chainId);
    } else if (config.recipientStellarAddress) {
      return knownTokens.filter((t) => t.chainId === rozoStellar.chainId);
    }
    return [];
  }, [config.chainId, config.recipientStellarAddress]);

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

    const newConfig = {
      ...config,
    };

    if (config.chainId === rozoStellar.chainId) {
      if (!config.recipientStellarAddress) {
        alert("Please enter a valid Stellar address");
        return;
      }

      Object.assign(newConfig, {
        chainId: baseUSDC.chainId,
        tokenAddress: baseUSDC.token,
        recipientAddress: tempAddress,
        recipientStellarAddress: config.recipientStellarAddress,
      });

      setConfig((prev) => ({
        ...prev,
        ...newConfig,
      }));
    } else {
      if (!config.recipientAddress) {
        alert("Please enter a valid EVM address");
        return;
      }
    }

    // Validate recipient address
    if (!isAddress(newConfig.recipientAddress)) {
      alert("Please enter a valid address");
      return;
    }

    // Create the appropriate config object based on type
    if (configType === "payment") {
      onConfirm(newConfig);
    } else {
      onConfirm({ ...newConfig, amount: "" });
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
      fixed right-0 top-0 h-full w-96 shadow-lg transform transition-transform z-50 bg-white
      ${isOpen ? "translate-x-0" : "translate-x-full"}
    `}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary-dark">
            {configType === "payment"
              ? "Payment Configuration"
              : "Deposit Configuration"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-primary-dark hover:text-primary-medium"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receiving Chain
            </label>
            <select
              value={
                config.recipientStellarAddress
                  ? rozoStellar.chainId
                  : config.chainId
              }
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  chainId: Number(e.target.value),
                  recipientStellarAddress: "",
                  recipientAddress:
                    prev.recipientAddress === tempAddress
                      ? ""
                      : prev.recipientAddress,
                  tokenAddress: "", // Reset token when chain changes
                }))
              }
              className="w-full p-2 border border-gray-300 focus:border-primary-medium focus:ring focus:ring-primary-light focus:ring-opacity-50 rounded"
            >
              <option value={0}>Select Chain</option>
              {chains.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receiving Token
            </label>
            {config.chainId === 0 && (
              <span className="text-sm text-gray-500">
                Select a chain to see tokens
              </span>
            )}
            {config.chainId > 0 && (
              <select
                value={
                  config.recipientStellarAddress
                    ? stellarUSDC.token
                    : config.tokenAddress
                }
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    tokenAddress: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 focus:border-primary-medium focus:ring focus:ring-primary-light focus:ring-opacity-50 rounded"
              >
                <option value="">Select Token</option>
                {tokens.map((token) => (
                  <option key={token.token} value={token.token}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            )}
          </div>

          {config.chainId !== rozoStellar.chainId &&
            !config.recipientStellarAddress && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address (EVM)
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
                      : "border-gray-300 focus:border-primary-medium focus:ring-primary-light"
                  } focus:ring focus:ring-opacity-50`}
                  placeholder="0x..."
                  formNoValidate
                />
                {addressError && (
                  <p className="mt-1 text-sm text-red-500">{addressError}</p>
                )}
              </div>
            )}

          {(config.chainId === rozoStellar.chainId ||
            config.recipientStellarAddress) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address (Stellar)
              </label>
              <input
                type="text"
                value={config.recipientStellarAddress}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    recipientStellarAddress: e.target.value,
                  }))
                }
                className={`w-full p-2 border rounded border-gray-300 focus:border-primary-medium focus:ring-primary-light focus:ring focus:ring-opacity-50`}
                placeholder="G..."
                formNoValidate
              />
            </div>
          )}

          {/* {configType === "payment" &&
            config.chainId === base.chainId &&
            config.tokenAddress === baseUSDC.token && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stellar Recipient Address (Optional)
                </label>
                <input
                  type="text"
                  value={config.recipientStellarAddress}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      recipientStellarAddress: e.target.value,
                    }))
                  }
                  className={`w-full p-2 border rounded border-gray-300 focus:border-primary-medium focus:ring-primary-light focus:ring focus:ring-opacity-50`}
                  placeholder="G..."
                  formNoValidate
                />
                <span className="text-xs text-gray-500 leading-[10px]">
                  This field is optional. Enter this only if you want the
                  recipient to receive funds on Stellar (bridged from Base USDC
                  to Stellar USDC).
                </span>
              </div>
            )} */}

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
                className="w-full p-2 border border-gray-300 focus:border-primary-medium focus:ring focus:ring-primary-light focus:ring-opacity-50 rounded"
                placeholder="Enter amount..."
                formNoValidate
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary-dark text-white py-2 px-4 rounded hover:bg-primary-medium transition-colors"
            // disabled={!isFormValid()}
          >
            Confirm
          </button>
        </form>
      </div>
    </div>
  );
}
