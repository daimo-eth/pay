// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/UniversalAddressManager.sol";
import "../src/UniversalAddressBridger.sol";
import "../src/UniversalAddressFactory.sol";
import "../src/SharedConfig.sol";
import "./constants/Constants.s.sol";
import "./constants/AcrossBridgeRouteConstants.sol";
import "./constants/AxelarBridgeRouteConstants.sol";
import "./constants/CCTPBridgeRouteConstants.sol";
import "./constants/CCTPV2BridgeRouteConstants.sol";
import "./constants/UASharedConfigConstants.sol";

import {DEPLOY_SALT_ACROSS_BRIDGER} from "./DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_CCTP_BRIDGER} from "./DeployDaimoPayCCTPBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./DeployDaimoPayCCTPV2Bridger.s.sol";

// CREATE3 factory instance (declared in Constants.s.sol)
// CREATE3Factory constant CREATE3;

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

/// @title DeployUniversalAddressManager
/// @notice Foundry script that deploys:
///         1. UniversalAddressFactory (deterministic via CREATE3)
///         2. UniversalAddressBridger (wraps the already-deployed
///            DaimoPayBridger)
///         3. SharedConfig (upgrade-ready, but deployed inline + initialized)
///         4. UniversalAddressManager (core escrow contract)
contract DeployUniversalAddressManager is Script {
    function run() public {
        //////////////////////////////////////////////////////////////
        // DEPLOY
        //////////////////////////////////////////////////////////////
        vm.startBroadcast();

        // 1. UniversalAddressFactory – deterministic, no constructor args.
        address uaFactory = CREATE3.deploy(
            DEPLOY_SALT_UA_FACTORY,
            abi.encodePacked(
                type(UniversalAddressFactory).creationCode,
                abi.encode()
            )
        );
        console.log("UniversalAddressFactory deployed at", uaFactory);

        // 2. UniversalAddressBridger
        (
            uint256[] memory chainIds,
            address[] memory bridgers,
            address[] memory stableOuts
        ) = _getSupportedChainsAndBridges(block.chainid);

        address universalBridger = CREATE3.deploy(
            DEPLOY_SALT_UA_BRIDGER,
            abi.encodePacked(
                type(UniversalAddressBridger).creationCode,
                abi.encode(chainIds, bridgers, stableOuts)
            )
        );
        console.log("UniversalAddressBridger deployed at", universalBridger);

        // 3. SharedConfig – implementation & proxy
        address sharedConfigImpl = CREATE3.deploy(
            DEPLOY_SALT_SHARED_CONFIG_IMPL,
            abi.encodePacked(type(SharedConfig).creationCode, abi.encode())
        );
        console.log(
            "SharedConfig implementation deployed at",
            sharedConfigImpl
        );

        bytes memory sharedInit = abi.encodeCall(
            SharedConfig.initialize,
            (msg.sender)
        );
        address sharedConfig = CREATE3.deploy(
            DEPLOY_SALT_SHARED_CONFIG,
            abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(sharedConfigImpl, sharedInit)
            )
        );
        console.log("SharedConfig proxy deployed at", sharedConfig);

        // Set whitelisted stables
        address[] memory whitelistedStables = getUAWhitelistedStables(
            block.chainid
        );
        bool[] memory whitelisted = new bool[](whitelistedStables.length);
        for (uint256 i; i < whitelistedStables.length; ++i) {
            whitelisted[i] = true;
        }
        SharedConfig(sharedConfig).setWhitelistedStables(
            whitelistedStables,
            whitelisted
        );

        // Set config values
        SharedConfig(sharedConfig).setNum(
            keccak256("PARTIAL_START_THRESHOLD"),
            getUAPartialStartThreshold()
        );

        // 4. UniversalAddressManager – implementation & proxy
        address uaManagerImpl = CREATE3.deploy(
            DEPLOY_SALT_UA_MANAGER_IMPL,
            abi.encodePacked(
                type(UniversalAddressManager).creationCode,
                abi.encode()
            )
        );
        console.log(
            "UniversalAddressManager implementation deployed at",
            uaManagerImpl
        );

        // Prepare initializer calldata for the proxy
        bytes memory initData = abi.encodeCall(
            UniversalAddressManager.initialize,
            (
                UniversalAddressFactory(uaFactory),
                IUniversalAddressBridger(universalBridger),
                SharedConfig(sharedConfig)
            )
        );

        address uaManager = CREATE3.deploy(
            DEPLOY_SALT_UA_MANAGER,
            abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(uaManagerImpl, initData)
            )
        );
        console.log("UniversalAddressManager proxy deployed at", uaManager);

        vm.stopBroadcast();
    }

    /// @notice Collect the list of destination chain IDs, bridge adapters, and
    ///         stablecoin addresses supported by the UA Bridger on the current
    ///         source chain.
    /// @dev    Mirrors the logic in DeployDaimoPayBridger.s.sol so that the UA
    ///         bridger is configured for the exact same set of chains.
    function _getSupportedChainsAndBridges(
        uint256 sourceChainId
    )
        private
        view
        returns (
            uint256[] memory chainIds,
            address[] memory bridgers,
            address[] memory stableOuts
        )
    {
        bool testnet = _isTestnet(sourceChainId);
        if (testnet) {
            // Bridging not supported on testnet.
            return (new uint256[](0), new address[](0), new address[](0));
        }

        // Collect destination chain IDs from each bridge type
        (
            uint256[] memory cctpChainIds,
            DaimoPayCCTPBridger.CCTPBridgeRoute[] memory cctpBridgeRoutes
        ) = getCCTPBridgeRoutes(sourceChainId);
        (
            uint256[] memory cctpV2ChainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory cctpV2BridgeRoutes
        ) = getCCTPV2BridgeRoutes(sourceChainId);
        (
            uint256[] memory acrossChainIds,
            DaimoPayAcrossBridger.AcrossBridgeRoute[] memory acrossBridgeRoutes
        ) = getAcrossBridgeRoutes(sourceChainId);

        address axelarReceiver = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_AXELAR_BRIDGER
        );
        (
            uint256[] memory axelarChainIds,
            DaimoPayAxelarBridger.AxelarBridgeRoute[] memory axelarBridgeRoutes
        ) = getAxelarBridgeRoutes(sourceChainId, axelarReceiver);

        // Get addresses of deployed bridger implementations
        address cctpBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_CCTP_BRIDGER
        );
        address cctpV2Bridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_CCTP_V2_BRIDGER
        );
        address acrossBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_ACROSS_BRIDGER
        );
        address axelarBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_AXELAR_BRIDGER
        );

        // Count total chains & allocate output arrays
        uint256 total = cctpChainIds.length +
            cctpV2ChainIds.length +
            acrossChainIds.length +
            axelarChainIds.length;

        chainIds = new uint256[](total);
        bridgers = new address[](total);
        stableOuts = new address[](total);

        uint256 idx = 0;
        // Helper to push id, bridgers, and stableOuts
        for (uint256 i; i < cctpChainIds.length; ++i) {
            chainIds[idx] = cctpChainIds[i];
            bridgers[idx] = cctpBridger;
            stableOuts[idx] = cctpBridgeRoutes[i].bridgeTokenOut;
            idx++;
        }
        for (uint256 i; i < cctpV2ChainIds.length; ++i) {
            chainIds[idx] = cctpV2ChainIds[i];
            bridgers[idx] = cctpV2Bridger;
            stableOuts[idx] = cctpV2BridgeRoutes[i].bridgeTokenOut;
            idx++;
        }
        for (uint256 i; i < acrossChainIds.length; ++i) {
            chainIds[idx] = acrossChainIds[i];
            bridgers[idx] = acrossBridger;
            stableOuts[idx] = acrossBridgeRoutes[i].bridgeTokenOut;
            idx++;
        }
        for (uint256 i; i < axelarChainIds.length; ++i) {
            chainIds[idx] = axelarChainIds[i];
            bridgers[idx] = axelarBridger;
            stableOuts[idx] = axelarBridgeRoutes[i].bridgeTokenOut;
            idx++;
        }

        return (chainIds, bridgers, stableOuts);
    }

    // Exclude from forge coverage
    function test() public {}
}
