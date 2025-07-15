import {
  getAddressContraction,
  getChainExplorerTxUrl,
} from "@daimo/pay-common";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useWalletClient } from "wagmi";
import { UniversalAddr } from "./App";
import { UATokenDisplay } from "./UATokenDisplay";
import { universalAddressManagerAbi } from "./codegen/abis";
import {
  knownErc20Tokens,
  UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
  viemChains,
} from "./constants";
import { Log } from "viem";

export function UADisplay({ ua }: { ua: UniversalAddr }) {
  const address = ua.address;

  return (
    <section className="UADisp_container">
      <div className="UADisp_result">
        <label>UNIVERSAL ADDRESS</label>
        <code>{address}</code>
      </div>

      <UALogs ua={ua} />
      <UABalances ua={ua} />
    </section>
  );
}

function UALogs({ ua }: { ua: UniversalAddr }) {
  return (
    <div>
      <label>LOGS</label>
      {viemChains.map((c) => (
        <UAChainLogs key={c.id} ua={ua} chainId={c.id} />
      ))}
    </div>
  );
}

function UAChainLogs({ ua, chainId }: { ua: UniversalAddr; chainId: number }) {
  const pcSource = usePublicClient({ chainId });
  const { data: wcDest } = useWalletClient({
    chainId: Number(ua.params.toChainId),
  });

  // Fetch logs for this universal address
  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ua-logs", chainId, ua.address],
    queryFn: async () => {
      if (!pcSource) return [];
      return await pcSource.getContractEvents({
        abi: universalAddressManagerAbi,
        address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
        strict: true,
        eventName: "Start",
        args: {
          universalAddress: ua.address,
        },
        fromBlock: "earliest",
      });
    },
  });

  if (isLoading) {
    return <div className="UADisp_loading">Loading logs...</div>;
  }
  if (error) {
    return (
      <div className="UADisp_error">Error loading logs: {error.message}</div>
    );
  }

  // Sort logs by block number (reverse chronological order)
  const sortedLogs = [...logs]
    .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
    .map((log) => {
      const fastFinish = async () => {
        if (!wcDest) return;
        await wcDest.switchChain({ id: Number(ua.params.toChainId) });
        return await wcDest.writeContract({
          abi: universalAddressManagerAbi,
          address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
          functionName: "fastFinishIntent",
          args: [
            log.args.route,
            [],
            log.args.intent.bridgeToken,
            {
              token: log.args.intent.bridgeToken,
              amount: log.args.intent.bridgeAmountOut,
            },
            log.args.intent.relaySalt,
            log.args.intent.sourceChainId,
          ],
        });
      };

      const claim = async () => {
        if (!wcDest) return;
        await wcDest.switchChain({ id: Number(ua.params.toChainId) });
        return await wcDest.writeContract({
          abi: universalAddressManagerAbi,
          address: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
          functionName: "claimIntent",
          args: [
            log.args.route,
            [],
            {
              token: log.args.intent.bridgeToken,
              amount: log.args.intent.bridgeAmountOut,
            },
            log.args.intent.relaySalt,
            log.args.intent.sourceChainId,
          ],
        });
      };

      return {
        log,
        actions: [
          { name: "FF", fn: fastFinish },
          { name: "Claim", fn: claim },
        ],
      };
    });

  return (
    <div className="UADisp_logs">
      {sortedLogs.map(({ log, actions }, index) => (
        <UALog
          key={index}
          log={log}
          actions={actions}
          logChainId={chainId}
          actionChainId={Number(ua.params.toChainId)}
        />
      ))}
    </div>
  );
}

function UALog({
  log,
  actions,
  logChainId,
  actionChainId,
}: {
  log: Log<
    bigint,
    number,
    false,
    undefined,
    true,
    typeof universalAddressManagerAbi,
    "Start"
  >;
  actions: { name: string; fn: () => Promise<`0x${string}` | undefined> }[];
  logChainId: number;
  actionChainId: number;
}) {
  const [actionTxHash, setActionTxHash] = useState<string | null>(null);

  const handleAction = async (
    actionFn: () => Promise<`0x${string}` | undefined>
  ) => {
    try {
      const txHash = await actionFn();
      if (txHash) {
        setActionTxHash(txHash);
      }
    } catch (error) {
      console.error("Action failed:", error);
    }
  };

  return (
    <div className="UADisp_logItem">
      <span className="UADisp_logName">{log.eventName}</span>
      {log.args?.receiverAddress && (
        <span className="UADisp_logReceiver">
          {getAddressContraction(log.args.receiverAddress)}
        </span>
      )}
      <a
        href={getChainExplorerTxUrl(logChainId, log.transactionHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="explorer-link"
      >
        Explorer
      </a>
      <div className="UADisp_logActions">
        {actionTxHash ? (
          <a
            href={getChainExplorerTxUrl(actionChainId, actionTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="done-link"
          >
            DONE
          </a>
        ) : (
          actions.map((action) => (
            <button
              key={action.name}
              className="action-btn action-btn-text"
              onClick={() => handleAction(action.fn)}
            >
              {action.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function UABalances({ ua }: { ua: UniversalAddr }) {
  const toChainId = Number(ua.params.toChainId);
  const destTokens = knownErc20Tokens.filter(
    (t) => t.chainId === toChainId && t.fiatISO === "USD"
  );
  const sourceTokens = knownErc20Tokens.filter(
    (t) => t.chainId !== toChainId && t.fiatISO === "USD"
  );
  const unsupportedTokens = knownErc20Tokens.filter((t) => t.fiatISO !== "USD");

  return (
    <>
      <div className="UADisp_balances">
        <label>BALANCES</label>
        <div className="UADisp_tokenList">
          {destTokens.map((token) => (
            <UATokenDisplay
              key={`${token.chainId}-${token.token}`}
              token={token}
              ua={ua}
            />
          ))}
        </div>
        <div className="UADisp_tokenList">
          {sourceTokens.map((token) => (
            <UATokenDisplay
              key={`${token.chainId}-${token.token}`}
              token={token}
              ua={ua}
            />
          ))}
        </div>
      </div>

      <div className="UADisp_balances">
        <label>REFUND</label>
        <div className="UADisp_tokenList">
          {unsupportedTokens.map((token) => (
            <UATokenDisplay
              key={`${token.chainId}-${token.token}`}
              token={token}
              ua={ua}
            />
          ))}
        </div>
      </div>
    </>
  );
}
