// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "./UA_Setup.t.sol";
import {UniversalAddress} from "../src/UniversalAddress.sol";
import {UniversalAddressFactory} from "../src/UniversalAddressFactory.sol";
import {BeaconProxy} from "openzeppelin-contracts/contracts/proxy/beacon/BeaconProxy.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract UniversalAddressDeployTest is UA_Setup {
    function testDeterministicDeployment() public {
        // Prepare params
        address beneficiary = BOB;
        address refund = ALICE;

        // Deploy
        address deployed = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);

        // Verify proxy code exists
        uint256 codeSize = deployed.code.length;
        assertGt(codeSize, 0, "Proxy not deployed");

        // Deployment should be idempotent
        address deployedAgain = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);
        assertEq(deployedAgain, deployed, "Duplicate deployment must yield same address");

        // Sanity: implementation exists
        address implAddr = beacon.implementation();
        assertTrue(implAddr != address(0));
    }
}
