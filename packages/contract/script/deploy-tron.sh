#!/bin/bash
set -e

# =============================================================================
# Deploy DepositAddress contracts to Tron mainnet.
# =============================================================================
#
# DEPLOYED CONTRACTS (2026-01-07):
#   ✅ DepositAddressManagerTron:         TEugsLgvvyYYiYZ5Q4YAU2uZ6Lfd7zNVcX (non-upgradeable)
#   ✅ DaimoPayLegacyMeshBridger:         TCJrFm5CLbCJsoQTCnMTauWc34FFjjJXfn
#   ✅ DaimoPayPricer:                    TRYkSGnYqyucfFfejmwNakC8P3vX5mdeyj
#   ✅ UniversalAddressBridger:           TGUdhENmUhxG6qSt985aVGjD337Uq5rUdn
#
# DepositAddressManagerTron features:
#   - Inlined factory (no separate DepositAddressFactory needed)
#   - DepositAddressTron vault (handles TRC20-USDT's non-standard transfer via balance-diff)
#   - Correct getDepositAddress() using Tron's 0x41 CREATE2 prefix
#
# Requirements:
#   pip install tronpy eth-abi
#   TRON_PRIVATE_KEY - hex private key (without 0x prefix)
#   TRON_NETWORK     - "mainnet", "shasta", or "nile" (default: mainnet)
#   TRON_API_KEY     - optional TronGrid API key for higher rate limits
#
# Usage:
#   ./deploy-tron.sh [--dry-run]
#
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$CONTRACT_DIR"

# Build contracts (quiet)
echo "Building contracts..."
forge build --silent

# Activate venv, create if needed
VENV_PATH="$CONTRACT_DIR/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating venv..."
    python3 -m venv "$VENV_PATH"
    source "$VENV_PATH/bin/activate"
    pip install -q -r "$CONTRACT_DIR/requirements.txt"
else
    source "$VENV_PATH/bin/activate"
fi

# Run Python deployment script
echo ""
echo "Deploying to Tron (${TRON_NETWORK:-mainnet})..."
python3 "$SCRIPT_DIR/deploy_tron_deposit_address.py" "$@"
