# Intent Pay

Rozo Intent Pay enables seamless crypto payments for your app.

Onboard users from any chain, any coin into your app with one click and maximize your conversion.

## Features

- 🌱 Instant cross-chain payments — Accept payment from 1000+ tokens on multiple chains. Payments complete in less than 5 seconds. We handle the swapping
  and bridging so that your customers don't have to.
- 💡 Pay with a single transaction - No more wallet round-trips to make approval, swap, or bridging transactions. Your customers pay with a single transfer transaction.
- ⚡️ Fully permissionless - Rozo Pay never custodies funds and funds can never be stuck in a contract. Payments can be permissionlessly completed by anyone.
- 💱 Support for all major wallets and exchanges - Rozo Pay supports payments from browser wallets like MetaMask and Rabby, as well as exchanges like Coinbase and Binance.
- 💨 Integrate within minutes - Get up and running with Rozo Pay in as little as 10 minutes with little to no code.

and much more...

## Documentation

You can find the full Rozo Pay documentation [here](https://pay.rozoai.com).

## Examples

Check out https://github.com/RozoAI/intent-pay/examples

### Try in CodeSandbox

Coming soon.

### Local Development

Clone the repository and build the SDK in `dev` mode:

```sh
git clone https://github.com/RozoAI/intent-pay.git
cd pay/packages/connectkit
npm i
npm run dev
```

The rollup bundler will now watch file changes in the background. Try using one of the examples for testing:

```sh
cd examples/nextjs
npm i
npm run dev
```

Any changes will be reflected on the Pay button in the example app.

## Contracts

Daimo Pay is noncustodial and runs on open-source, audited contracts. See `/packages/contract`.

Audits:

- [Nethermind, 2025 Apr](https://github.com/user-attachments/files/20544714/NM-0500-Daimo-Pay-final-report.pdf)

## Support

[Contact us](mailto:support@daimo.com) if you'd like to integrate Daimo Pay.

## License

See [LICENSE](https://github.com/RozoAI/intent-pay/blob/master/packages/connectkit/LICENSE) for more information.

## Credits

Rozo Intent Pay SDK is a fork of [Daimo](https://github.com/daimo-eth/pay) developed by [Daimo](https://daimo.com). We're grateful to them for making cross chain payment fast, simple and open-source.

Daimo Pay SDK is a fork of [Connectkit](https://github.com/family/connectkit) developed by [Family](https://family.co). We're grateful to them for making Connectkit fast, beatiful and open-source.

# How to release `connectkit` package

## Setup

Make sure `pnpm` is installed.

```sh
pnpm -v
```

If not, install it.

```sh
npm install -g pnpm
```

## Release

```sh
pnpm run release
```

Choose the version on the prompt.
