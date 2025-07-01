// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/proxy/beacon/BeaconProxy.sol";
import "openzeppelin-contracts/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "./SharedConfig.sol";
import "./UniversalAddress.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory for deploying deterministic UniversalAddress proxies and
///         their paired BridgeReceiver contracts.
contract UniversalAddressFactory {
    SharedConfig public immutable cfg;
    UpgradeableBeacon public immutable beacon;

    event UADeployed(
        uint256 indexed toChainId, IERC20 indexed toCoin, address indexed toAddress, address refundAddress, address ua
    );

    constructor(SharedConfig _cfg, UpgradeableBeacon _beacon) {
        cfg = _cfg;
        beacon = _beacon;
    }

    /// @notice External Universal Address deployment function
    /// @param toChainId     Destination chain ID.
    /// @param toCoin        ERC20 token minted/credited on dest chain.
    /// @param toAddress     Recipient wallet on dest chain.
    /// @param refundAddress Sweep target for unsupported tokens (same chain).
    /// @return uaAddr The address of the deployed Universal Address
    function deployUA(uint256 toChainId, IERC20 toCoin, address toAddress, address refundAddress)
        external
        returns (address uaAddr)
    {
        bytes memory initCalldata =
            abi.encodeCall(UniversalAddress.initialize, (cfg, toChainId, toCoin, toAddress, refundAddress));

        // Precompute address for event emission / duplicate protection.
        uaAddr = getUAAddress(initCalldata);

        if (uaAddr.code.length == 0) {
            uaAddr = address(new BeaconProxy{salt: 0}(address(beacon), initCalldata));
        }

        emit UADeployed(toChainId, toCoin, toAddress, refundAddress, uaAddr);
    }

    /// @notice View helper to compute the address of a Universal Address
    /// @param initData Initialization data for the Universal Address
    /// @return address The computed address of the Universal Address
    function getUAAddress(bytes memory initData) public view returns (address) {
        bytes memory creationCode =
            abi.encodePacked(type(BeaconProxy).creationCode, abi.encode(address(beacon), initData));
        return Create2.computeAddress(0, keccak256(creationCode));
    }
}
