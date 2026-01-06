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

### Tron Deployment

Deploy `DepositAddressManagerTron` and related contracts to Tron mainnet.

**Setup:**
```bash
cd packages/contract
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

**API Keys (recommended):**
- **TronGrid API key** - https://www.trongrid.io (avoids rate limits)
- **Feee.io API key** - https://feee.io/console/buyer/api-key (automatic energy rental)

**Dry run:**
```bash
source venv/bin/activate
python3 script/deploy_tron_deposit_address.py --dry-run
```

**Deploy:**
```bash
source venv/bin/activate
export TRON_PRIVATE_KEY="your_hex_key_no_0x"
export TRON_API_KEY="your_trongrid_api_key"  # optional but recommended
export FEEE_API_KEY="your_feee_api_key"      # optional: auto-rent energy
python3 script/deploy_tron_deposit_address.py
```

**Energy Management:**
- With `FEEE_API_KEY`: Energy is automatically rented before each operation
- Without: Manually rent ~7M energy before deploying (~270 TRX)
- Check energy: `python3 script/tron_energy.py check`
- Manual rent: `python3 script/tron_energy.py rent 500000`

**Operations:**
```bash
# Set relayer (required before startIntent)
python3 script/tron_operations.py set-relayer

# Get deposit address for Arbitrum recipient
python3 script/tron_operations.py get-deposit 0xYourArbAddress $(($(date +%s) + 604800))

# Start intent (after sending USDT to deposit address)
python3 script/tron_operations.py start-intent 0xYourArbAddress $EXPIRES_AT 1.0
```
