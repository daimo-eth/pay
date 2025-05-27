#!/bin/bash
set -e

# Requirements:
# ALCHEMY_API_KEY
# PRIVATE_KEY for the deployer
# ETHERSCAN_API_KEY_... for each target chain

SCRIPTS=(
    # Deployment
    # "script/DeployCreate3Factory.s.sol"

    # Daimo Pay
    # "script/DeployDaimoPayCCTPBridger.s.sol"
    # "script/DeployDaimoPayCCTPV2Bridger.s.sol"
    # "script/DeployDaimoPayAcrossBridger.s.sol"
    # "script/DeployDaimoPayAxelarBridger.s.sol"
    # "script/DeployDaimoPayBridger.s.sol"
    # "script/DeployPayIntentFactory.s.sol"
    # "script/DeployDaimoPay.s.sol"

    # Relayer
    # "script/DeployPayBalanceFactory.sol"
    # "script/DeployDaimoPayRelayer.s.sol" # The deployer must be the LP that calls this contract.
)
CHAINS=(
    # "$ETHERSCAN_API_KEY_ARB,https://arb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_BASE,https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_BLAST,https://blast-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_BSC,https://bnb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_LINEA,https://linea-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_MANTLE,https://mantle-rpc.publicnode.com"
    # "$ETHERSCAN_API_KEY_OP,https://opt-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_POLYGON,https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "$ETHERSCAN_API_KEY_WORLD,https://worldchain-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # # Expensive, deploy last
    # "$ETHERSCAN_API_KEY_L1,https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY" 
)

for SCRIPT in "${SCRIPTS[@]}"; do
    for CHAIN in "${CHAINS[@]}"; do
        IFS=',' read -r ETHERSCAN_API_KEY RPC_URL <<< "$CHAIN"
        echo ""
        echo "======= RUNNING $SCRIPT ========" 
        echo "ETHERSCAN_API_KEY: $ETHERSCAN_API_KEY"
        echo "RPC_URL          : $RPC_URL"

        FORGE_CMD="forge script $SCRIPT --sig run --fork-url $RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --broadcast"

        echo $FORGE_CMD
        echo ""
        $FORGE_CMD || exit 1
    done
done
