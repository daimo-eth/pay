See `README.md` for repo structure.

- Write clean, minimal, neatly decomposed code.
- Order: constants at top, then top-level functions, then helpers.
- Add useful doc comments explaining invariants; one-liners preferred.
- SDK CSS is namespaced. In `packages/sdk/src/web/**`, use the `daimo-` Tailwind prefix and `daimo-*` helper classes. Do not introduce unprefixed Tailwind or helper class names.
- Contracts: `cd packages/contract && make test`.
- SDK: `cd packages/sdk && npm test`.
