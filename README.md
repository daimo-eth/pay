## Daimo SDK

```
npm i @daimo/sdk
```

See [docs.daimo.com](https://docs.daimo.com) for more.

### Development

```
packages/
  sdk/        # @daimo/sdk — TypeScript client, React modal, shared types
  contract/   # Solidity smart contracts (Foundry)
```

### SDK `packages/sdk`

Three entry points:
- `@daimo/sdk/common` — session types, API schemas, and constants
- `@daimo/sdk/client` — thin REST client wrapping `/v1/*` Daimo API, useful for custom UI
- `@daimo/sdk/web` — React modal (`<DaimoModal>`) and hooks for the built-in deposit UI

```bash
cd packages/sdk && npm i && npm test
```

### Contracts `packages/contract`

On-chain payment infrastructure. See `src/DepositAddressManager.sol` for the
current system, `src/DaimoPay.sol` for the legacy intent-based system.

```bash
cd packages/contract && make test
```
