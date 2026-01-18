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
    "DepositAddressFactory-deploy4"
);
bytes32 constant DEPLOY_SALT_DA_MANAGER = keccak256(
    "DepositAddressManager-deploy4"
);
bytes32 constant DEPLOY_SALT_DA_MANAGER_IMPL = keccak256(
    "DepositAddressManager-impl-deploy4"
);

bytes32 constant DEPLOY_SALT_DAIMO_PAY_PRICER = keccak256(
    "DaimoPayPricer-prod1"
);
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_PRICER = keccak256(
//     "DaimoPayPricer-dev1"
// );

// Bridger contracts
bytes32 constant DEPLOY_SALT_DAIMO_PAY_BRIDGER = keccak256(
    "DaimoPayBridger-deploy31"
);
bytes32 constant DEPLOY_SALT_DA_BRIDGER = keccak256(
    "DepositAddressBridger-deploy1"
);

bytes32 constant DEPLOY_SALT_ACROSS_BRIDGER = keccak256(
    "DaimoPayAcrossBridger-deploy6"
);
bytes32 constant DEPLOY_SALT_AXELAR_BRIDGER = keccak256(
    "DaimoPayAxelarBridger-deploy7"
);
bytes32 constant DEPLOY_SALT_CCTP_BRIDGER = keccak256(
    "DaimoPayCCTPBridger-deploy3"
);
bytes32 constant DEPLOY_SALT_CCTP_V2_BRIDGER = keccak256(
    "DaimoPayCCTPV2Bridger-deploy7"
);
bytes32 constant DEPLOY_SALT_HOP_BRIDGER = keccak256(
    "DaimoPayHopBridger-deploy12"
);
bytes32 constant DEPLOY_SALT_LEGACY_MESH_BRIDGER = keccak256(
    "DaimoPayLegacyMeshBridger-deploy7"
);
bytes32 constant DEPLOY_SALT_STARGATE_BRIDGER = keccak256(
    "DaimoPayStargateBridger-deploy5"
);

// Relayer contract
bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
    "DaimoPayRelayer-prod2"
);
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
//     "DaimoPayRelayer-dev2"
// );
