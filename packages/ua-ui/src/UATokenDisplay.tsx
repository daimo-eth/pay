import {
  assert,
  getChainExplorerTxUrl,
  getChainName,
  Token,
} from "@daimo/pay-common";
import { useState } from "react";
import { erc20Abi, getAddress, numberToHex, zeroAddress } from "viem";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { UniversalAddr } from "./App";
import { universalAddressManagerAbi } from "./codegen/abis";
import { UNIVERSAL_ADDRESS_MANAGER_ADDRESS } from "./constants";
import { ErrorRow } from "./ErrorRow";

interface UATokenDisplayProps {
  token: Token;
  ua: UniversalAddr;
}

function ActionButtons({
  actions,
  onAction,
}: {
  actions: { name: string; fn: () => Promise<`0x${string}` | undefined> }[];
  onAction: (actionFn: () => Promise<`0x${string}` | undefined>) => void;
}) {
  return (
    <>
      {actions.map((action) => (
        <button
          key={action.name}
          className="action-btn action-btn-solid"
          onClick={() => onAction(action.fn)}
        >
          {action.name}
        </button>
      ))}
    </>
  );
}

function DoneLink({ txHash, chainId }: { txHash: string; chainId: number }) {
  return (
    <a
      href={getChainExplorerTxUrl(chainId, txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className="done-link"
    >
      DONE
    </a>
  );
}

export function UATokenDisplay({ token, ua }: UATokenDisplayProps) {
  assert(token.token !== zeroAddress);

  const [actionTxHash, setActionTxHash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);

  const acc = useAccount();
  const walletClient = useWalletClient({ chainId: token.chainId });

  const {
    data: balance,
    isFetching,
    error: balanceError,
    refetch,
  } = useReadContract({
    chainId: token.chainId,
    address: getAddress(token.token),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [ua.address],
  });

  const handleAction = async (
    actionFn: () => Promise<`0x${string}` | undefined>
  ) => {
    try {
      setActionError(null);
      const txHash = await actionFn();
      if (txHash) {
        setActionTxHash(txHash);
      }
    } catch (error) {
      console.error("Action failed:", error);
      setActionError(error as Error);
    }
  };

  const handleRefresh = () => {
    refetch();
    setActionError(null);
    setActionTxHash(null);
  };

  const formattedBalance = isFetching
    ? "Loading..."
    : balanceError
      ? balanceError.message
      : balance !== undefined
        ? (Number(balance) / Math.pow(10, token.decimals)).toFixed(
            Math.min(token.decimals, 6)
          )
        : "Error";

  const getActions = () => {
    if (
      !acc.isConnected ||
      !walletClient.data ||
      balance == null ||
      balance === 0n
    ) {
      return [];
    }

    if (token.fiatISO !== "USD") {
      return [
        {
          name: "REFUND",
          fn: async () => {
            if (!walletClient.data) return;
            await walletClient.data.switchChain({ id: token.chainId });
            return await walletClient.data.writeContract({
              address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
              abi: universalAddressManagerAbi,
              functionName: "refundIntent",
              args: [ua.params, getAddress(token.token)],
            });
          },
        },
      ];
    } else if (token.chainId === Number(ua.params.toChainId)) {
      return [
        {
          name: "SAME-CHAIN FINISH",
          fn: async () => {
            if (!walletClient.data) return;
            await walletClient.data.switchChain({ id: token.chainId });
            return await walletClient.data.writeContract({
              address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
              abi: universalAddressManagerAbi,
              functionName: "sameChainFinishIntent",
              args: [ua.params, getAddress(token.token), balance, []],
            });
          },
        },
      ];
    } else {
      return [
        {
          name: "START",
          fn: async () => {
            if (!walletClient.data) return;
            await walletClient.data.switchChain({ id: token.chainId });
            return await walletClient.data.writeContract({
              address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
              abi: universalAddressManagerAbi,
              functionName: "startIntent",
              args: [
                ua.params,
                getAddress(token.token),
                {
                  token: getAddress(ua.stableOut.token),
                  amount: balance / 10n ** BigInt(token.decimals - 6),
                },
                numberToHex(Math.floor(Math.random() * 1e12), { size: 32 }),
                [],
                "0x",
              ],
            });
          },
        },
      ];
    }
  };

  const actions = getActions();

  return (
    <>
      <div className="UAToken_balance">
        <span className="UAToken_symbol">
          {getChainName(token.chainId)} {token.symbol}
        </span>
        <div className="UAToken_actions">
          <span className="UAToken_amount">{formattedBalance}</span>
          <button className="refresh-btn" onClick={handleRefresh}>
            REFRESH
          </button>
          {actionTxHash ? (
            <DoneLink txHash={actionTxHash} chainId={token.chainId} />
          ) : !actionError && actions.length > 0 ? (
            <ActionButtons actions={actions} onAction={handleAction} />
          ) : null}
        </div>
      </div>
      {actionError && <ErrorRow error={actionError} />}
    </>
  );
}
