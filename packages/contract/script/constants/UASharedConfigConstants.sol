// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

// @title UASharedConfigConstants
// @notice Auto-generated constants for Universal Address shared configuration

// Return all whitelisted stables for the given chain.
function getUAWhitelistedStables(
    uint256 chainId
)
    pure
    returns (address[] memory stables)
{
    // Chain 1
    if (chainId == 1) {
        stables = new address[](3);
        stables[0] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        stables[1] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        stables[2] = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        return stables;
    }

    // Chain 10
    if (chainId == 10) {
        stables = new address[](4);
        stables[0] = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
        stables[1] = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
        stables[2] = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
        stables[3] = 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58;
        return stables;
    }

    // Chain 56
    if (chainId == 56) {
        stables = new address[](2);
        stables[0] = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
        stables[1] = 0x55d398326f99059fF775485246999027B3197955;
        return stables;
    }

    // Chain 137
    if (chainId == 137) {
        stables = new address[](4);
        stables[0] = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
        stables[1] = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
        stables[2] = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
        stables[3] = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
        return stables;
    }

    // Chain 480
    if (chainId == 480) {
        stables = new address[](1);
        stables[0] = 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1;
        return stables;
    }

    // Chain 8453
    if (chainId == 8453) {
        stables = new address[](4);
        stables[0] = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
        stables[1] = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        stables[2] = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
        stables[3] = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
        return stables;
    }

    // Chain 42161
    if (chainId == 42161) {
        stables = new address[](4);
        stables[0] = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
        stables[1] = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        stables[2] = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
        stables[3] = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
        return stables;
    }

    // Chain 42220
    if (chainId == 42220) {
        stables = new address[](3);
        stables[0] = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
        stables[1] = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
        stables[2] = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
        return stables;
    }

    // Chain 59144
    if (chainId == 59144) {
        stables = new address[](2);
        stables[0] = 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5;
        stables[1] = 0x176211869cA2b568f2A7D4EE941E073a821EE1ff;
        return stables;
    }

    // Chain 534352
    if (chainId == 534352) {
        stables = new address[](2);
        stables[0] = 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4;
        stables[1] = 0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df;
        return stables;
    }

    // If chain not found, return empty array
    return new address[](0);
}

// Return the partial start threshold in USD (with 6 decimals).
function getUAPartialStartThreshold()
    pure
    returns (uint256 threshold)
{
    return 1000;
}
