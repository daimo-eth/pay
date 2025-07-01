// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "./UA_Setup.t.sol";
import {UniversalAddress} from "../src/UniversalAddress.sol";

/// @notice Additional tests for UniversalAddressFactory not covered previously
contract UniversalAddressFactoryAdditionalTest is UA_Setup {
    function testGetUAAddressMatchesDeployment() public {
        address beneficiary = BOB;
        address refund = ALICE;
        bytes memory initData =
            abi.encodeCall(UniversalAddress.initialize, (cfg, DEST_CHAIN_ID, usdc, beneficiary, refund));
        address predicted = factory.getUAAddress(initData);
        address deployed = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);
        assertEq(predicted, deployed);
    }

    function testDifferentInitDataDifferentAddress() public {
        address addrA = factory.deployUA(DEST_CHAIN_ID, usdc, BOB, ALICE);
        address addrB = factory.deployUA(DEST_CHAIN_ID, usdc, ALICE, BOB);
        assertTrue(addrA != addrB);
    }
}
