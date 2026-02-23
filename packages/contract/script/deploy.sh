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
    # "script/DeployDaimoPayUSDT0Bridger.s.sol"

    "script/DeployDaimoPayBridger.s.sol"
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
    # "script/DeployDummyDepositAdapter.s.sol"
)

CHAINS=(
    # "https://arb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://bnb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://celo-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    "wss://gnosis-rpc.publicnode.com"

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

    # MegaETH (no Alchemy; uses mega.etherscan.io for verification)
    # "https://mainnet.megaeth.com/rpc"

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
        # MegaETH uses mega.etherscan.io
        # elif [[ "$RPC_URL" == *"megaeth"* ]]; then
        #     FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --verifier etherscan --verifier-url https://api.mega.etherscan.io/api --etherscan-api-key $MEGAETH_ETHERSCAN_API_KEY --broadcast"
        else
            FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --broadcast"
        fi

        # Override gas price for Gnosis chain to reliably get txs through
        if [[ "$RPC_URL" == *"gnosis"* ]]; then
            FORGE_CMD="$FORGE_CMD --with-gas-price 6000000000 --priority-gas-price 2000000000"
        fi

        # MegaETH uses a multidimensional gas model (compute + storage gas).
        # Forge's built-in simulation only estimates compute gas, missing
        # storage gas entirely (e.g. 10,000/byte code deposit vs 200 on ETH).
        # Use --skip-simulation so forge uses the RPC's eth_estimateGas which
        # accounts for storage gas correctly.
        if [[ "$RPC_URL" == *"megaeth"* ]]; then
            FORGE_CMD="$FORGE_CMD --skip-simulation --gas-estimate-multiplier 200"
        fi

        echo $FORGE_CMD
        echo ""
        $FORGE_CMD || exit 1
    done
done

echo "Done"