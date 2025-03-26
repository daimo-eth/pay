## Daimo Pay Contracts

Main contracts:

- DaimoPay - Orchestrates and tracks cross-chain intents with optimistic
  fast finishes from relayers
- PayIntent - Implementation for single-use intent contracts that forwards
  received tokens to a specified destination action via bridging/swapping
- PayIntentFactory - Creates deterministic PayIntent contract addresses using CREATE2
- DaimoPayBridger - Multiplexes between different bridging protocols based on
  destination chain
- DaimoPayCCTPBridger - Implements Circle's CCTP protocol for USDC cross-chain
  transfers
- DaimoPayAxelarBridger - Implements Axelar protocol for cross-chain token
  transfers
- DaimoPayAcrossBridger - Implements Across protocol for cross-chain token
  transfers

### Building the contracts

1. **Install Foundryup**

    ```
    curl -L https://foundry.paradigm.xyz | bash
    ```

2. **Install Foundry**

    ```
    foundryup
    ```

3. **Build contracts**

    ```
    make full
    ```

### Testing

To run tests:

```
make test
```

To view detailed test coverage:

```
make coverage
```

You can see line-by-line coverage in VSCode using the recommended extension. Run
`Cmd+Shift+P` > `Coverage Gutters: Display Coverage`.
