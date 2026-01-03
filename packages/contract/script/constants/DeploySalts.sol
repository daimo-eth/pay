// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

// Daimo Pay core contracts
bytes32 constant DEPLOY_SALT_DAIMO_PAY = keccak256("DaimoPay-6");
bytes32 constant DEPLOY_SALT_EXECUTOR = keccak256("DaimoPayExecutor-2");
bytes32 constant DEPLOY_SALT_PAY_INTENT_FACTORY = keccak256(
    "PayIntentFactory-4"
);

// Bridger contracts
bytes32 constant DEPLOY_SALT_BRIDGER = keccak256("DaimoPayBridger-32");
bytes32 constant DEPLOY_SALT_ACROSS_BRIDGER = keccak256(
    "DaimoPayAcrossBridger-deploy6"
);
bytes32 constant DEPLOY_SALT_AXELAR_BRIDGER = keccak256(
    "DaimoPayAxelarBridger-deploy8"
);
bytes32 constant DEPLOY_SALT_CCTP_BRIDGER = keccak256(
    "DaimoPayCCTPBridger-deploy3"
);
bytes32 constant DEPLOY_SALT_CCTP_V2_BRIDGER = keccak256(
    "DaimoPayCCTPV2Bridger-7"
);
bytes32 constant DEPLOY_SALT_HOP_BRIDGER = keccak256("DaimoPayHopBridger-12");
bytes32 constant DEPLOY_SALT_LEGACY_MESH_BRIDGER = keccak256(
    "DaimoPayLegacyMeshBridger-deploy8"
);
bytes32 constant DEPLOY_SALT_STARGATE_BRIDGER = keccak256(
    "DaimoPayStargateBridger-deploy5"
);

// Relayer contract
bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
    "DaimoPayRelayer-prod1"
);
// bytes32 constant DEPLOY_SALT_DAIMO_PAY_RELAYER = keccak256(
//     "DaimoPayRelayer-dev1"
// );

// Universal Address contracts
bytes32 constant DEPLOY_SALT_UA_FACTORY = keccak256(
    "UniversalAddressFactory-deploy6"
);
bytes32 constant DEPLOY_SALT_UA_BRIDGER = keccak256(
    "UniversalAddressBridger-deploy6"
);
bytes32 constant DEPLOY_SALT_SHARED_CONFIG = keccak256("SharedConfig-deploy6");
bytes32 constant DEPLOY_SALT_SHARED_CONFIG_IMPL = keccak256(
    "SharedConfig-impl-deploy6"
);
bytes32 constant DEPLOY_SALT_UA_MANAGER = keccak256(
    "UniversalAddressManager-deploy6"
);
bytes32 constant DEPLOY_SALT_UA_MANAGER_IMPL = keccak256(
    "UniversalAddressManager-impl-deploy6"
);
