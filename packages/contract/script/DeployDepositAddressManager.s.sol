// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DepositAddressManager.sol";
import "../src/DepositAddressFactory.sol";
import "./constants/Constants.s.sol";

// CREATE3 factory instance (declared in Constants.s.sol)
// CREATE3Factory constant CREATE3;

bytes32 constant DEPLOY_SALT_DA_FACTORY = keccak256(
    "DepositAddressFactory-DAtest2"
);
bytes32 constant DEPLOY_SALT_DA_MANAGER = keccak256(
    "DepositAddressManager-DAtest2"
);
bytes32 constant DEPLOY_SALT_DA_MANAGER_IMPL = keccak256(
    "DepositAddressManager-impl-DAtest2"
);

/// @title DeployDepositAddressManager
/// @notice Foundry script that deploys:
///         1. DepositAddressFactory (deterministic via CREATE3)
///         2. DepositAddressManager (core escrow contract, UUPS upgradeable)
contract DeployDepositAddressManager is Script {
    function run() public {
        //////////////////////////////////////////////////////////////
        // DEPLOY
        //////////////////////////////////////////////////////////////
        vm.startBroadcast();

        // 1. DepositAddressFactory – deterministic, no constructor args.
        address daFactory = CREATE3.deploy(
            DEPLOY_SALT_DA_FACTORY,
            abi.encodePacked(
                type(DepositAddressFactory).creationCode,
                abi.encode()
            )
        );
        console.log("DepositAddressFactory deployed at", daFactory);

        // 2. DepositAddressManager – implementation & proxy
        address daManagerImpl = CREATE3.deploy(
            DEPLOY_SALT_DA_MANAGER_IMPL,
            abi.encodePacked(
                type(DepositAddressManager).creationCode,
                abi.encode()
            )
        );
        console.log(
            "DepositAddressManager implementation deployed at",
            daManagerImpl
        );

        // Prepare initializer calldata for the proxy
        bytes memory initData = abi.encodeCall(
            DepositAddressManager.initialize,
            (msg.sender, DepositAddressFactory(daFactory))
        );

        address daManager = CREATE3.deploy(
            DEPLOY_SALT_DA_MANAGER,
            abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(daManagerImpl, initData)
            )
        );
        console.log("DepositAddressManager proxy deployed at", daManager);
        console.log("DepositAddressManager owner", msg.sender);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
