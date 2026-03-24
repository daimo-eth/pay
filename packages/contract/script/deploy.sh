#!/bin/bash
set -e

# Requirements:
# ALCHEMY_API_KEY
# PRIVATE_KEY for the deployer
# ETHERSCAN_API_KEY for verification on most chains

SCRIPTS=(
    # === DA bridgers ===
    # "script/da/DeployDaimoPayCCTPV2Bridger.s.sol"
    # "script/da/DeployDaimoPayStargateUSDCBridger.s.sol"
    # "script/da/DeployDaimoPayStargateUSDTBridger.s.sol"
    # "script/da/DeployDaimoPayLegacyMeshBridger.s.sol"
    # "script/da/DeployDaimoPayHopBridger.s.sol"
    # "script/da/DeployDepositAddressBridger.s.sol"

    # === DA core ===
    # "script/DeployDaimoPayPricer.s.sol"
    # "script/da/DeployDepositAddressFactory.s.sol"
    # "script/da/DeployDAExecutor.s.sol"
    # "script/da/DeployDepositAddressManager.s.sol"

    # === Pay-order bridgers ===
    # "script/pay/DeployDaimoPayCCTPBridger.s.sol"
    # "script/pay/DeployDaimoPayCCTPV2Bridger.s.sol"
    # "script/pay/DeployDaimoPayAcrossBridger.s.sol"
    # "script/pay/DeployDaimoPayAxelarBridger.s.sol"
    # "script/pay/DeployDaimoPayLegacyMeshBridger.s.sol"
    # "script/pay/DeployDaimoPayStargateBridger.s.sol"
    # "script/pay/DeployDaimoPayHopBridger.s.sol"
    # "script/pay/DeployDaimoPayBridger.s.sol"

    # === Pay-order core ===
    # "script/pay/DeployPayIntentFactory.s.sol"
    # "script/pay/DeployDaimoPay.s.sol"

    # === Shared ===
    # "script/DeployDaimoPayRelayer.s.sol"
    # "script/DeployCreate3Factory.s.sol"
    # "script/DeployPayBalanceFactory.s.sol"

    # === DA final call adapters ===
    # "script/da/DeployHypercoreDepositAdapter.s.sol"
    # "script/da/DeployDummyDepositAdapter.s.sol"
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
    # "https://tempo-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://worldchain-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # Expensive, deploy last
    # "https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

)

for SCRIPT in "${SCRIPTS[@]}"; do
    for RPC_URL in "${CHAINS[@]}"; do
        echo ""
        echo "======= RUNNING $SCRIPT ========"
        echo "RPC_URL: $RPC_URL"

        # Chain-specific verification flags
        if [[ "$RPC_URL" == *"monad"* ]]; then
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/ --broadcast"
        elif [[ "$RPC_URL" == *"tempo"* ]]; then
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --verifier sourcify --broadcast"
        elif [[ "$RPC_URL" == *"hyperliquid"* ]]; then
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --verifier etherscan --verifier-url 'https://api.etherscan.io/v2/api?chainid=999' --etherscan-api-key $ETHERSCAN_API_KEY --broadcast"
        else
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --broadcast"
        fi

        # Chain-specific gas overrides
        if [[ "$RPC_URL" == *"gnosis"* ]]; then
            FORGE_CMD="$FORGE_CMD --with-gas-price 3000000000 --priority-gas-price 1000000000"
        fi

        # Tempo has higher gas costs for CREATE operations. The default gas
        # estimate is too low for nested CREATE3 deploys.
        if [[ "$RPC_URL" == *"tempo"* ]]; then
            FORGE_CMD="$FORGE_CMD --gas-estimate-multiplier 500"
        fi

        echo $FORGE_CMD
        echo ""
        $FORGE_CMD || exit 1
    done
done

echo "Done"
