# Rozo Pay Checkout Demo

This demo shows best practices for accepting a checkout payment.

For robust checkout, save the payId in `onPaymentStarted`. This ensures you'll
be able to correlate incoming payments with a cart (or a user ID, form
submission, etc) even if the user closes the tab.

In addition to callbacks like `onPaymentSucceeded`, Rozo Pay supports
[webhooks](https://paydocs.daimo.com/webhooks) to track payment status
reliably on the backend.
