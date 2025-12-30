# Daimo Pay Contracts

Open-source, audited smart contracts powering Daimo Pay's cross-chain payment infrastructure.

## Architecture Overview

Daimo Pay enables instant cross-chain payments through an optimistic intent system. Here's how it works:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CROSS-CHAIN PAYMENT FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CHAIN A (Source)                          CHAIN B (Destination)           │
│   ─────────────────                         ─────────────────────           │
│                                                                             │
│   1. User sends tokens ──►  Intent Address                                  │
│                                   │                                         │
│   2. Relayer calls ──────►  startIntent()                                   │
│                                   │                                         │
│                            [swap + bridge]                                  │
│                                   │                                         │
│                                   │         3. Relayer calls fastFinishIntent()
│                                   │                     │                   │
│                                   │              [immediate payment to Bob] │
│                                   │                                         │
│                            [bridge delay ~10min]                            │
│                                   │                                         │
│                                   └────────► 4. claimIntent() repays relayer│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payment Flow

1. **User Payment**: Alice sends tokens to a deterministic intent address on Chain A (simple ERC20 transfer)
2. **Intent Start**: Relayer swaps tokens if needed and initiates the bridge via `startIntent()`
3. **Fast Finish** (optional): Relayer immediately calls `fastFinishIntent()` on Chain B, paying Bob instantly
4. **Claim**: When the bridge transfer arrives, relayer calls `claimIntent()` to get repaid

Same-chain payments follow the same flow but skip the bridging step.

## Core Contracts

### DaimoPay.sol

The main orchestrator contract that coordinates cross-chain intents.

**Key Functions:**
- `startIntent()` - Initiates a payment, swapping and bridging tokens to the destination chain
- `fastFinishIntent()` - Allows relayers to complete payments immediately (optimistically)
- `claimIntent()` - Settles the intent once bridge funds arrive, repaying the relayer

**Events:**
- `Start` - Intent initiated on source chain
- `FastFinish` - Intent completed immediately by relayer
- `Claim` - Intent settled after bridge completes
- `IntentFinished` - Payment delivered to destination
- `IntentRefunded` - Refund processed for failed/duplicate payments

### PayIntent.sol

Represents a single payment intent with all required parameters:

```solidity
struct PayIntent {
    uint256 toChainId;              // Destination chain
    TokenAmount[] bridgeTokenOutOptions;  // Acceptable bridge output tokens
    TokenAmount finalCallToken;      // Token for final call
    Call finalCall;                  // Destination contract call
    address payable escrow;          // Escrow contract address
    IDaimoPayBridger bridger;        // Bridge protocol to use
    address refundAddress;           // Where to refund on failure
    uint256 nonce;                   // Unique nonce (addresses are one-time use)
    uint256 expirationTimestamp;     // Intent expiry time
}
```

### PayIntentFactory.sol

Creates deterministic intent addresses using CREATE2. This allows:
- Computing intent addresses before deployment
- Users can send funds to the address before the contract exists
- Relayers can start and claim in a single transaction

### DaimoPayBridger.sol

Multiplexer contract that routes bridge calls to the appropriate protocol based on destination chain.

**Supported Bridges:**
- **CCTP** (Circle) - USDC cross-chain transfers
- **CCTP V2** - Updated Circle protocol
- **Axelar** - General-purpose cross-chain messaging
- **Across** - Fast bridge with optimistic verification
- **Stargate** - LayerZero-based bridge
- **LayerZero** - Direct LayerZero integration
- **Hop** - Rollup-native bridging

### DaimoPayExecutor.sol

Executes arbitrary contract calls on behalf of the escrow. Handles:
- Token approvals
- Contract calls with calldata
- Native token (ETH) transfers
- Call reversion handling

## Security Features

### Non-Custodial Design
- Funds are never held by Daimo
- Users always have refund paths
- Intents can be permissionlessly completed by anyone

### Intent Expiration
- Intents have configurable expiration timestamps
- Expired intents can be refunded to the refund address
- Prevents funds from being stuck indefinitely

### Refund Mechanism
- If the destination call reverts, funds go to `refundAddress`
- Double-paid intents automatically refund excess funds
- Expired intents can be claimed back

## Building the Contracts

### Prerequisites

1. **Install Foundryup**
   ```sh
   curl -L https://foundry.paradigm.xyz | bash
   ```

2. **Install Foundry**
   ```sh
   foundryup
   ```

### Build

Build all contracts:
```sh
make full
```

This will:
- Install dependencies
- Compile contracts
- Generate ABIs

### Testing

Run the test suite:
```sh
make test
```

View detailed test coverage:
```sh
make coverage
```

You can view line-by-line coverage in VSCode using the Coverage Gutters extension:
`Cmd+Shift+P` > `Coverage Gutters: Display Coverage`

### Linting

```sh
make fmt       # Format code
make fmt-check # Check formatting
```

## Contract Addresses

Daimo Pay contracts are deployed on all supported chains. For the latest deployment addresses, see the [documentation](https://paydocs.daimo.com).

## Audits

Daimo Pay contracts have been audited by:

- [Nethermind, August 2025](https://github.com/user-attachments/files/22227674/NM-0585-Daimo.pdf)
- [Nethermind, April 2025](https://github.com/user-attachments/files/20544714/NM-0500-Daimo-Pay-final-report.pdf)

## Development

### Adding a New Bridge

1. Implement `IDaimoPayBridger` interface
2. Add bridge contract to `DaimoPayBridger` multiplexer
3. Configure supported chains and tokens
4. Add tests for the new bridge

### Interface

```solidity
interface IDaimoPayBridger {
    /// Initiate a bridge transfer to the destination chain
    function sendToChain(
        IERC20 tokenIn,
        uint256 amountIn,
        uint256 toChainId,
        bytes32 toAddress,
        bytes calldata extraData
    ) external payable;

    /// Get the expected output token and amount for a bridge transfer
    function getOutputToken(
        IERC20 tokenIn,
        uint256 amountIn,
        uint256 toChainId
    ) external view returns (IERC20 tokenOut, uint256 amountOut);
}
```

## License

GPL-3.0-or-later

## Contact

For security issues: security@daimo.com
For support: support@daimo.com
