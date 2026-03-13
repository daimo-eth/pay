<img src="https://daimo.com/og-image.png" alt="Daimo" width="400" />

# Daimo SDK

```
npm i @daimo/sdk
```

See [docs.daimo.com](https://docs.daimo.com) for more.

### Entry points

- `@daimo/sdk/common` — session types, API schemas, and constants
- `@daimo/sdk/client` — thin REST client wrapping `/v1/*` Daimo API, useful for custom UI
- `@daimo/sdk/web` — React modal (`<DaimoModal>`) and hooks for the built-in deposit UI

### Styles

Import `@daimo/sdk/web/theme.css` for the built-in web UI. The distributed stylesheet namespaces internal classes with `daimo-` so it can coexist with a host app's Tailwind build.

`@daimo/sdk/web/styles.css` remains available as an equivalent alias.
