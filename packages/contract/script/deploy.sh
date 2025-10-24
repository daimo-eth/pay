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
    # "script/DeployDaimoPayHopBridger.s.sol"
    # "script/DeployDaimoPayBridger.s.sol"
    # "script/DeployPayIntentFactory.s.sol"
    # "script/DeployDaimoPay.s.sol"

    # Universal Address
    # "script/DeployUniversalAddressManager.s.sol"

    # Relayer
    # The deployer must be the stage/dev LP that calls this contract.
    # Production relayers can be added via grantRelayerRole.
    # Stage/dev and production must use different relayer contract deployments.
    "script/DeployDaimoPayRelayer.s.sol" 

    # Utils
    # "script/DeployPayBalanceFactory.sol"
)

CHAINS=(
    # "https://arb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://celo-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://linea-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://opt-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://scroll-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
    # "https://worldchain-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # # Slow, broken Etherscan
    # "https://bnb-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

    # Expensive, deploy last
    "https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"
)

for SCRIPT in "${SCRIPTS[@]}"; do
    for RPC_URL in "${CHAINS[@]}"; do
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

echo "Done"