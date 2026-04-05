// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

// Infrastructure
bytes32 constant DEPLOY_SALT_CREATE3_FACTORY = keccak256("CREATE3Factory");

// Daimo Pay core contracts
bytes32 constant DEPLOY_SALT_DAIMO_PAY = keccak256("DaimoPay-deploy6");
bytes32 constant DEPLOY_SALT_PAY_INTENT_FACTORY = keccak256(
    "PayIntentFactory-deploy3"
);

// Deposit address contracts
bytes32 constant DEPLOY_SALT_DA_FACTORY = keccak256(
    "DepositAddressFactory-flexible4"
);
bytes32 constant DEPLOY_SALT_DA_EXECUTOR = keccak256(
    "DaimoPayExecutor-flexible6"
);
bytes32 constant DEPLOY_SALT_DA_MANAGER = keccak256(
    "DepositAddressManager-flexible7"
);

bytes32 constant DEPLOY_SALT_DAIMO_PAY_PRICER = keccak256(
    "DaimoPayPricer-prod1"
);
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_PRICER = keccak256(
//     "DaimoPayPricer-dev1"
// );

// Bridger contracts
bytes32 constant DEPLOY_SALT_DAIMO_PAY_BRIDGER = keccak256(
    "DaimoPayBridger-deploy37"
);
bytes32 constant DEPLOY_SALT_DA_BRIDGER = keccak256(
    "DepositAddressBridger-flexible10"
);

bytes32 constant DEPLOY_SALT_ACROSS_BRIDGER = keccak256(
    "DaimoPayAcrossBridger-deploy9"
);
bytes32 constant DEPLOY_SALT_AXELAR_BRIDGER = keccak256(
    "DaimoPayAxelarBridger-deploy10"
);
bytes32 constant DEPLOY_SALT_CCTP_BRIDGER = keccak256(
    "DaimoPayCCTPBridger-deploy6"
);
bytes32 constant DEPLOY_SALT_CCTP_V2_BRIDGER = keccak256(
    "DaimoPayCCTPV2Bridger-flexible3"
);
bytes32 constant DEPLOY_SALT_HOP_BRIDGER = keccak256(
    "DaimoPayHopBridger-flexible8"
);
bytes32 constant DEPLOY_SALT_PAY_ORDER_HOP_BRIDGER = keccak256(
    "DaimoPayHopBridger-pay-order2"
);
bytes32 constant DEPLOY_SALT_LEGACY_MESH_BRIDGER = keccak256(
    "DaimoPayLegacyMeshBridger-flexible4"
);
bytes32 constant DEPLOY_SALT_USDT0_BRIDGER = keccak256(
    "DaimoPayUSDT0Bridger-flexible7"
);
bytes32 constant DEPLOY_SALT_STARGATE_BRIDGER = keccak256(
    "DaimoPayStargateBridger-deploy9"
);
bytes32 constant DEPLOY_SALT_STARGATE_USDC_BRIDGER = keccak256(
    "DaimoPayStargateUSDCBridger-flexible4"
);
bytes32 constant DEPLOY_SALT_STARGATE_USDT_BRIDGER = keccak256(
    "DaimoPayStargateUSDTBridger-flexible3"
);

// Relayer contract
bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
    "DaimoPayRelayer-prod-flexible2"
);
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
//     "DaimoPayRelayer-dev-flexible2"
// );
// );

// Final call adapters
bytes32 constant DEPLOY_SALT_HYPERCORE_DEPOSIT_ADAPTER = keccak256(
    "HypercoreDepositAdapter-deploy1"
);
