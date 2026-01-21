#!/bin/bash
set -e

# Requirements:
# ALCHEMY_API_KEY
# PRIVATE_KEY for the deployer
# ETHERSCAN_API_KEY_... for each target chain

SCRIPTS=(
    # Bridgers
    # "script/DeployDaimoPayCCTPBridger.s.sol"
    # "script/DeployDaimoPayCCTPV2Bridger.s.sol"
    # "script/DeployDaimoPayAcrossBridger.s.sol"
    # "script/DeployDaimoPayAxelarBridger.s.sol"
    # "script/DeployDaimoPayLegacyMeshBridger.s.sol"
    # "script/DeployDaimoPayStargateBridger.s.sol"
    # "script/DeployDaimoPayHopBridger.s.sol"

    # "script/DeployDaimoPayBridger.s.sol"
    # "script/DeployDepositAddressBridger.s.sol"

    # Daimo Pay
    # "script/DeployPayIntentFactory.s.sol"
    # "script/DeployDaimoPay.s.sol"

    # Deposit Address
    # "script/DeployDaimoPayPricer.s.sol"
    # "script/DeployDepositAddressFactory.s.sol"
    # "script/DeployDAExecutor.s.sol"
    # "script/DeployDepositAddressManager.s.sol"

    # Relayer
    # New relayers can be added via grantRelayerRole.
    # Stage/dev and production must use different relayer contract deployments.
    # "script/DeployDaimoPayRelayer.s.sol"

    # Utils
    # "script/DeployCreate3Factory.s.sol"
    # "script/DeployPayBalanceFactory.s.sol"

    # Final call adapters
    # "script/DeployHypercoreDepositAdapter.s.sol"
)

CHAINS=(
    # "https://arb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://bnb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://celo-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "wss://gnosis-rpc.publicnode.com"

    # HyperEVM has big blocks (30M gas limit) and small blocks (3M gas limit)
    # We need to deploy the contracts in big blocks. Ensure the deployer has
    # USDC deposited to HyperCore and big blocks toggled on.
    # Non-official big block toggle tool: https://hyperevm-block-toggle.vercel.app/
    # "https://hyperliquid-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # "https://linea-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://monad-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://opt-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://scroll-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://worldchain-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # Expensive, deploy last
    # "https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
)

for SCRIPT in "${SCRIPTS[@]}"; do
    for RPC_URL in "${CHAINS[@]}"; do
        echo ""
        echo "======= RUNNING $SCRIPT ========" 
        echo "ETHERSCAN_API_KEY: $ETHERSCAN_API_KEY"
        echo "RPC_URL          : $RPC_URL"

        # Monad uses Sourcify for verification instead of Etherscan
        if [[ "$RPC_URL" == *"monad"* ]]; then
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/ --broadcast"
        else
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --broadcast"
        fi

        # Override gas price for Gnosis chain to reliably get txs through
        if [[ "$RPC_URL" == *"gnosis"* ]]; then
            FORGE_CMD="$FORGE_CMD --with-gas-price 3000000000 --priority-gas-price 1000000000"
        fi

        echo $FORGE_CMD
        echo ""
        $FORGE_CMD || exit 1
    done
done

echo "Done"