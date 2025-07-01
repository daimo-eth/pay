// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {SharedConfig} from "../src/SharedConfig.sol";
import {UniversalAddressFactory} from "../src/UniversalAddressFactory.sol";
import {UniversalAddress} from "../src/UniversalAddress.sol";
import {UpgradeableBeacon} from "openzeppelin-contracts/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {TestUSDC} from "./utils/DummyUSDC.sol";
import {TestUSDT} from "./utils/DummyUSDT.sol";
import {TestDAI} from "./utils/DummyDAI.sol";
import {DummyBridger} from "./utils/DummyBridger.sol";

/// @notice Abstract contract that bootstraps a full Universal Address stack for tests.
abstract contract UA_Setup is Test {
    // Accounts
    address internal constant ALICE = address(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
    address internal constant BOB = address(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB);
    address internal constant RELAYER = address(0x2222222222222222222222222222222222222222);

    // Core protocol components
    SharedConfig internal cfg;
    UniversalAddressFactory internal factory;
    UpgradeableBeacon internal beacon;
    DummyBridger internal bridger;

    // Tokens
    TestUSDC internal usdc;
    TestUSDT internal usdt;
    TestDAI internal dai;

    // Constants
    uint256 internal constant DEST_CHAIN_ID = 137; // polygon
    bytes32 internal constant USDC_KEY = keccak256("USDC_KEY");
    bytes32 internal constant BRIDGER_KEY = keccak256("BRIDGER_KEY");

    function setUp() public virtual {
        // 1. Deploy tokens
        usdc = new TestUSDC();
        usdt = new TestUSDT();
        dai = new TestDAI();

        // 2. Deploy SharedConfig and populate
        cfg = new SharedConfig();
        cfg.initialize(address(this)); // set owner to this test contract
        cfg.setAddr(USDC_KEY, address(usdc));
        // Dummy bridger will be deployed later
        // Allow-list stablecoins
        cfg.setAllowedStable(address(usdc), true);
        cfg.setAllowedStable(address(usdt), true);

        // 3. Deploy DummyBridger and write to config
        bridger = new DummyBridger();
        cfg.setAddr(BRIDGER_KEY, address(bridger));

        // 4. Deploy beacon and factory
        UniversalAddress impl = new UniversalAddress();
        beacon = new UpgradeableBeacon(address(impl), address(this));
        factory = new UniversalAddressFactory(cfg, beacon);

        // Prefund actors
        usdc.transfer(ALICE, 500_000e6);
        usdc.transfer(RELAYER, 500_000e6);
    }

    /// Deploys a Universal Address for tests and returns the instance.
    function _deployUniversalAddress(address beneficiary, address refund) internal returns (UniversalAddress ua) {
        address uaAddr = factory.deployUA(DEST_CHAIN_ID, IERC20(address(usdc)), beneficiary, refund);
        ua = UniversalAddress(payable(uaAddr));
    }
}
