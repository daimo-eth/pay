#!/usr/bin/env python3
"""
Tron operations for DepositAddressManagerTron.

Operations:
  1. setRelayer - authorize relayer address
  2. getDepositAddress - compute counterfactual deposit address  
  3. startIntent - initiate bridge to destination chain

Environment variables:
  TRON_PRIVATE_KEY   - hex private key (without 0x prefix)
  TRON_API_KEY       - TronGrid API key
  FEEE_API_KEY       - Feee.io API key for energy rental
  TRON_EXTRA_ENERGY  - extra energy buffer (default: 50000)

Usage:
  python tron_operations.py set-relayer
  python tron_operations.py get-deposit <arb_recipient> <expires_at>
  python tron_operations.py start-intent <arb_recipient> <expires_at> <amount>
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from eth_abi import encode, decode
from tronpy import Tron
from tronpy.keys import PrivateKey, to_base58check_address, to_hex_address
from tronpy.providers import HTTPProvider

# =============================================================================
# Configuration
# =============================================================================

NETWORK = os.environ.get("TRON_NETWORK", "mainnet")
PRIVATE_KEY = os.environ.get("TRON_PRIVATE_KEY")
API_KEY = os.environ.get("TRON_API_KEY")

# Deployed contract addresses (2026-01-06)
FACTORY_ADDR = "TKjMyTrjW7FEp8enZUEsnWWmhzfDyBQ2GF"
MANAGER_PROXY_ADDR = "TKqaUUBccHAR7x4XZYzPfS3sRe16aMg3sN"
# UniversalAddressBridger wraps DaimoPayLegacyMeshBridger (TCJrFm5CLbCJsoQTCnMTauWc34FFjjJXfn)
BRIDGER_ADDR = "TGUdhENmUhxG6qSt985aVGjD337Uq5rUdn"
PRICER_ADDR = "TRYkSGnYqyucfFfejmwNakC8P3vX5mdeyj"

# Token addresses (Tron Base58)
TRON_USDT_ADDR = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"

# Arbitrum USDT (EVM address)
ARB_USDT_ADDR = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

# Tron chain ID (used internally)
TRON_CHAIN_ID = 728126428

# Arbitrum chain ID
ARB_CHAIN_ID = 42161

# Fee limits (in SUN) - conservative for rented energy
FEE_LIMITS = {
    "setRelayer": 100_000_000,  # 100 TRX
    "startIntent": 500_000_000,  # 500 TRX
    "approve": 50_000_000,  # 50 TRX
}

# Energy estimates for each operation
ENERGY_ESTIMATES = {
    "setRelayer": 30_000,
    "startIntent": 400_000,  # Conservative: includes vault creation + bridge call
    "approve": 15_000,
}

# Extra energy buffer
EXTRA_ENERGY = int(os.environ.get("TRON_EXTRA_ENERGY", "50000"))

# =============================================================================
# Helpers
# =============================================================================


def load_artifact(contract_name: str) -> tuple[str, list[dict[str, Any]]]:
    """Load bytecode and ABI from forge build output."""
    out_dir = Path(__file__).parent.parent / "out"
    artifact_path = out_dir / f"{contract_name}.sol" / f"{contract_name}.json"
    
    if not artifact_path.exists():
        for sol_dir in out_dir.iterdir():
            if sol_dir.is_dir():
                candidate = sol_dir / f"{contract_name}.json"
                if candidate.exists():
                    artifact_path = candidate
                    break
    
    if not artifact_path.exists():
        raise FileNotFoundError(f"artifact not found: {contract_name}")
    
    with open(artifact_path) as f:
        artifact = json.load(f)
    
    bytecode = artifact["bytecode"]["object"]
    if bytecode.startswith("0x"):
        bytecode = bytecode[2:]
    
    return bytecode, artifact["abi"]


def load_abi(contract_name: str) -> list[dict[str, Any]]:
    """Load ABI from forge build output."""
    _, abi = load_artifact(contract_name)
    return abi


def get_client() -> Tron:
    """Create Tron client."""
    if NETWORK == "mainnet":
        if API_KEY:
            provider = HTTPProvider(api_key=API_KEY)
            return Tron(provider=provider)
        return Tron()
    elif NETWORK == "shasta":
        return Tron(network="shasta")
    elif NETWORK == "nile":
        return Tron(network="nile")
    else:
        raise ValueError(f"unknown network: {NETWORK}")


def retry_on_rate_limit(fn, max_retries: int = 5):
    """Retry on 429 rate limit errors."""
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                wait = 2 ** attempt
                print(f"  rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                raise


def tron_to_hex(addr: str) -> bytes:
    """Convert Tron Base58 address to 20-byte hex."""
    hex_addr = to_hex_address(addr)
    # Remove 41 prefix
    return bytes.fromhex(hex_addr[2:])


def evm_to_bytes(addr: str) -> bytes:
    """Convert EVM address to 20-byte bytes."""
    if addr.startswith("0x"):
        addr = addr[2:]
    return bytes.fromhex(addr.zfill(40))


def load_abi(contract_name: str) -> list[dict[str, Any]]:
    """Load ABI from forge build output."""
    out_dir = Path(__file__).parent.parent / "out"
    artifact_path = out_dir / f"{contract_name}.sol" / f"{contract_name}.json"
    
    if not artifact_path.exists():
        for sol_dir in out_dir.iterdir():
            if sol_dir.is_dir():
                candidate = sol_dir / f"{contract_name}.json"
                if candidate.exists():
                    artifact_path = candidate
                    break
    
    if not artifact_path.exists():
        raise FileNotFoundError(f"artifact not found: {contract_name}")
    
    with open(artifact_path) as f:
        artifact = json.load(f)
    return artifact["abi"]


def ensure_energy(operation: str, address: str) -> bool:
    """
    Ensure sufficient energy before an operation.
    Rents energy via Feee.io if needed.
    """
    required = ENERGY_ESTIMATES.get(operation, 100_000) + EXTRA_ENERGY
    
    try:
        from tron_energy import ensure_energy as _ensure_energy
        return _ensure_energy(required, address)
    except ImportError:
        # Fallback: just check if we have enough
        print(f"  Checking energy for {operation}...")
        client = get_client()
        account = retry_on_rate_limit(lambda: client.get_account_resource(address))
        available = account.get("EnergyLimit", 0) - account.get("EnergyUsed", 0)
        
        if available < required:
            print(f"  ⚠️  Low energy: {available:,} < {required:,}")
            print(f"     Set FEEE_API_KEY for automatic energy rental")
            return False
        
        print(f"  ✅ Energy available: {available:,}")
        return True


def print_receipt(receipt: dict) -> None:
    """Print transaction receipt summary."""
    print(f"\n{'=' * 60}")
    print("TRANSACTION RECEIPT")
    print("=" * 60)
    print(f"  txid:    {receipt.get('id', 'N/A')}")
    print(f"  result:  {receipt.get('receipt', {}).get('result', 'N/A')}")
    
    energy = receipt.get("receipt", {}).get("energy_usage_total", 0)
    energy_fee = receipt.get("receipt", {}).get("energy_fee", 0)
    net_fee = receipt.get("receipt", {}).get("net_fee", 0)
    
    print(f"  energy:  {energy:,}")
    print(f"  energy_fee: {energy_fee / 1_000_000:.2f} TRX")
    print(f"  net_fee: {net_fee / 1_000_000:.2f} TRX")
    print(f"  total:   {(energy_fee + net_fee) / 1_000_000:.2f} TRX")
    
    if NETWORK == "mainnet":
        print(f"  explorer: https://tronscan.org/#/transaction/{receipt.get('id', '')}")


# =============================================================================
# Operations
# =============================================================================


def set_relayer(relayer_addr: str, authorized: bool = True) -> dict:
    """Call setRelayer on DepositAddressManagerTron proxy."""
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")
    
    client = get_client()
    priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
    owner = priv_key.public_key.to_base58check_address()
    
    # Ensure sufficient energy
    if not ensure_energy("setRelayer", owner):
        print("❌ Insufficient energy. Aborting.")
        sys.exit(1)
    
    print(f"Calling setRelayer on {MANAGER_PROXY_ADDR}")
    print(f"  relayer: {relayer_addr}")
    print(f"  authorized: {authorized}")
    
    # Load ABI
    abi = load_abi("DepositAddressManagerTron")
    
    # Get contract
    contract = client.get_contract(MANAGER_PROXY_ADDR)
    contract.abi = abi
    
    # Build transaction
    txn = (
        contract.functions.setRelayer(relayer_addr, authorized)
        .with_owner(owner)
        .fee_limit(FEE_LIMITS["setRelayer"])
        .build()
        .sign(priv_key)
    )
    
    result = retry_on_rate_limit(lambda: txn.broadcast())
    print(f"  txid: {result['txid']}")
    
    receipt = retry_on_rate_limit(lambda: result.wait())
    print_receipt(receipt)
    
    return receipt


def compute_deposit_address(
    to_chain_id: int,
    to_token: bytes,
    to_address: bytes,
    refund_address: bytes,
    escrow: bytes,
    bridger: bytes,
    pricer: bytes,
    max_start_slippage_bps: int,
    max_fast_finish_slippage_bps: int,
    max_same_chain_finish_slippage_bps: int,
    expires_at: int,
) -> tuple[str, bytes]:
    """
    Compute deterministic deposit address.
    Returns (tron_address, route_hash).
    """
    # Encode the route struct
    route_encoded = encode(
        [
            "uint256",  # toChainId
            "address",  # toToken
            "address",  # toAddress
            "address",  # refundAddress
            "address",  # escrow
            "address",  # bridger
            "address",  # pricer
            "uint256",  # maxStartSlippageBps
            "uint256",  # maxFastFinishSlippageBps
            "uint256",  # maxSameChainFinishSlippageBps
            "uint256",  # expiresAt
        ],
        [
            to_chain_id,
            to_token,
            to_address,
            refund_address,
            escrow,
            bridger,
            pricer,
            max_start_slippage_bps,
            max_fast_finish_slippage_bps,
            max_same_chain_finish_slippage_bps,
            expires_at,
        ]
    )
    
    # route_hash = keccak256(route_encoded)
    from hashlib import sha3_256 as keccak256
    # Actually use eth keccak
    from eth_hash.auto import keccak
    route_hash = keccak(route_encoded)
    
    return route_hash


def get_deposit_address(arb_recipient: str, expires_at: int) -> dict:
    """
    Get the deposit address for a given Arbitrum recipient.
    
    Calls factory.getDepositAddress() to get the correct CREATE2 address.
    Returns route parameters and deposit address.
    """
    client = get_client()
    
    # Convert EVM addresses to Tron format for the contract call
    to_token_tron = evm_addr_to_tron(ARB_USDT_ADDR)
    to_address_tron = evm_addr_to_tron(arb_recipient)
    
    # Build the route parameters for display
    route = {
        "toChainId": ARB_CHAIN_ID,
        "toToken": ARB_USDT_ADDR,
        "toAddress": arb_recipient,
        "refundAddress": arb_recipient,
        "escrow": MANAGER_PROXY_ADDR,
        "bridger": BRIDGER_ADDR,
        "pricer": PRICER_ADDR,
        "maxStartSlippageBps": 100,
        "maxFastFinishSlippageBps": 100,
        "maxSameChainFinishSlippageBps": 100,
        "expiresAt": expires_at,
    }
    
    print(f"\n{'=' * 60}")
    print("DEPOSIT ADDRESS ROUTE")
    print("=" * 60)
    for k, v in route.items():
        print(f"  {k}: {v}")
    
    # Build route tuple for contract call (all addresses in Tron format)
    route_tuple = (
        ARB_CHAIN_ID,
        to_token_tron,
        to_address_tron,
        to_address_tron,  # refundAddress = toAddress
        MANAGER_PROXY_ADDR,
        BRIDGER_ADDR,
        PRICER_ADDR,
        100,
        100,
        100,
        expires_at,
    )
    
    # Load factory and call getDepositAddress
    factory_abi = load_abi("DepositAddressFactory")
    factory = client.get_contract(FACTORY_ADDR)
    factory.abi = factory_abi
    
    # Call factory.getDepositAddress(route) to get the correct CREATE2 address
    deposit_addr = retry_on_rate_limit(
        lambda: factory.functions.getDepositAddress(route_tuple)
    )
    
    print(f"\n{'=' * 60}")
    print("DEPOSIT ADDRESS (from factory)")
    print("=" * 60)
    print(f"  Tron address: {deposit_addr}")
    print(f"\n  Send USDT to this address, then call startIntent.")
    
    route["depositAddress"] = deposit_addr
    
    return route


def approve_usdt(spender: str, amount: int) -> dict:
    """Approve USDT spending."""
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")
    
    client = get_client()
    priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
    owner = priv_key.public_key.to_base58check_address()
    
    # Ensure sufficient energy
    if not ensure_energy("approve", owner):
        print("❌ Insufficient energy. Aborting.")
        sys.exit(1)
    
    print(f"Approving USDT for {spender}")
    print(f"  amount: {amount}")
    
    # Get USDT contract
    usdt = client.get_contract(TRON_USDT_ADDR)
    
    txn = (
        usdt.functions.approve(spender, amount)
        .with_owner(owner)
        .fee_limit(FEE_LIMITS["approve"])
        .build()
        .sign(priv_key)
    )
    
    result = retry_on_rate_limit(lambda: txn.broadcast())
    print(f"  txid: {result['txid']}")
    
    receipt = retry_on_rate_limit(lambda: result.wait())
    print_receipt(receipt)
    
    return receipt


def sign_price_data(token_hex: str, price_usd: int, timestamp: int, chain_id: int) -> bytes:
    """Sign price data using EIP-191 format.
    
    The Solidity contract uses abi.encodePacked which does NOT pad:
    - address: 20 bytes (not 32)
    - uint256: 32 bytes each
    """
    from eth_hash.auto import keccak
    from eth_account.messages import encode_defunct
    from eth_account import Account
    
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")
    
    # Create message using encodePacked format (no padding for address)
    # token: 20 bytes, priceUsd: 32 bytes, timestamp: 32 bytes, chainId: 32 bytes
    token_bytes = bytes.fromhex(token_hex.zfill(40))  # 20 bytes
    price_bytes = price_usd.to_bytes(32, 'big')
    timestamp_bytes = timestamp.to_bytes(32, 'big')
    chain_id_bytes = chain_id.to_bytes(32, 'big')
    
    message_data = token_bytes + price_bytes + timestamp_bytes + chain_id_bytes
    message_hash = keccak(message_data)
    
    # Sign using EIP-191 (Ethereum signed message)
    account = Account.from_key(bytes.fromhex(PRIVATE_KEY))
    signable = encode_defunct(primitive=message_hash)
    signed = account.sign_message(signable)
    
    return signed.signature


def evm_addr_to_tron(evm_addr: str) -> str:
    """Convert EVM address (0x...) to Tron Base58 format."""
    if evm_addr.startswith("0x"):
        evm_addr = evm_addr[2:]
    # Add Tron's 41 prefix and convert to Base58
    tron_hex = "41" + evm_addr.lower().zfill(40)
    return to_base58check_address(tron_hex)


def start_intent(arb_recipient: str, expires_at: int, amount: int) -> dict:
    """
    Call startIntent on DepositAddressManagerTron to initiate bridge.
    
    Args:
        arb_recipient: Arbitrum destination address (0x...)
        expires_at: Expiration timestamp
        amount: Amount of USDT in 6 decimals (e.g., 1000000 = 1 USDT)
    """
    from eth_hash.auto import keccak
    
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")
    
    client = get_client()
    priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
    owner = priv_key.public_key.to_base58check_address()
    
    # Ensure sufficient energy
    if not ensure_energy("startIntent", owner):
        print("❌ Insufficient energy. Aborting.")
        sys.exit(1)
    
    print(f"\n{'=' * 60}")
    print("START INTENT")
    print("=" * 60)
    print(f"  recipient: {arb_recipient}")
    print(f"  amount: {amount / 1e6:.6f} USDT")
    print(f"  expires: {expires_at}")
    
    # For Tron contract calls, all addresses must be in Tron Base58 format
    # EVM addresses get 41 prefix added and converted to Base58
    to_token_tron = evm_addr_to_tron(ARB_USDT_ADDR)
    to_address_tron = evm_addr_to_tron(arb_recipient)
    
    print(f"  toToken (Tron fmt): {to_token_tron}")
    print(f"  toAddress (Tron fmt): {to_address_tron}")
    
    # Current timestamp for price data
    current_time = int(time.time())
    
    # USDT price = $1 = 1e18 (18 decimals)
    usdt_price = 10**18
    
    # For price signing, use the raw hex (without 41 prefix)
    tron_usdt_hex = to_hex_address(TRON_USDT_ADDR)[2:]
    
    # Sign price data for payment token (Tron USDT) and bridge token (same)
    # Note: Tron chain ID is 728126428
    payment_signature = sign_price_data(tron_usdt_hex, usdt_price, current_time, TRON_CHAIN_ID)
    bridge_signature = sign_price_data(tron_usdt_hex, usdt_price, current_time, TRON_CHAIN_ID)
    
    print(f"  payment price signed at: {current_time}")
    
    # Build route tuple for the contract call
    # All addresses in Tron Base58 format
    route_tuple = (
        ARB_CHAIN_ID,  # toChainId
        to_token_tron,  # toToken (Arb USDT as Tron address)
        to_address_tron,  # toAddress
        to_address_tron,  # refundAddress
        MANAGER_PROXY_ADDR,  # escrow
        BRIDGER_ADDR,  # bridger
        PRICER_ADDR,  # pricer
        100,  # maxStartSlippageBps (1%)
        100,  # maxFastFinishSlippageBps
        100,  # maxSameChainFinishSlippageBps
        expires_at,  # expiresAt
    )
    
    # TokenAmount for bridgeTokenOut: (token, amount)
    bridge_token_out = (to_token_tron, amount)
    
    # PriceData: (token, priceUsd, timestamp, signature)
    payment_price_data = (TRON_USDT_ADDR, usdt_price, current_time, payment_signature)
    bridge_price_data = (TRON_USDT_ADDR, usdt_price, current_time, bridge_signature)
    
    # Random relay salt
    import secrets
    relay_salt = secrets.token_bytes(32)
    print(f"  relaySalt: 0x{relay_salt.hex()}")
    
    # Empty calls (no swap needed, payment token = bridge token)
    calls = []
    
    # Empty bridge extra data (Legacy Mesh uses enforced options)
    bridge_extra_data = b""
    
    # Load manager ABI
    manager_abi = load_abi("DepositAddressManagerTron")
    manager = client.get_contract(MANAGER_PROXY_ADDR)
    manager.abi = manager_abi
    
    print(f"\n  Calling startIntent on {MANAGER_PROXY_ADDR}...")
    
    # Build and send transaction
    txn = (
        manager.functions.startIntent(
            route_tuple,
            TRON_USDT_ADDR,  # paymentToken
            bridge_token_out,
            payment_price_data,
            bridge_price_data,
            relay_salt,
            calls,
            bridge_extra_data,
        )
        .with_owner(owner)
        .fee_limit(FEE_LIMITS["startIntent"])
        .build()
        .sign(priv_key)
    )
    
    result = retry_on_rate_limit(lambda: txn.broadcast())
    print(f"  txid: {result['txid']}")
    
    receipt = retry_on_rate_limit(lambda: result.wait())
    print_receipt(receipt)
    
    return receipt


# =============================================================================
# Main
# =============================================================================


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "set-relayer":
        # Set deployer as relayer
        if not PRIVATE_KEY:
            raise ValueError("TRON_PRIVATE_KEY not set")
        priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
        deployer = priv_key.public_key.to_base58check_address()
        set_relayer(deployer, True)
        
    elif command == "get-deposit":
        if len(sys.argv) < 4:
            print("Usage: get-deposit <arb_recipient> <expires_at>")
            sys.exit(1)
        arb_recipient = sys.argv[2]
        expires_at = int(sys.argv[3])
        get_deposit_address(arb_recipient, expires_at)
        
    elif command == "start-intent":
        if len(sys.argv) < 5:
            print("Usage: start-intent <arb_recipient> <expires_at> <amount_usdt>")
            print("  amount_usdt: amount in USDT (e.g., 1.5 for 1.5 USDT)")
            sys.exit(1)
        arb_recipient = sys.argv[2]
        expires_at = int(sys.argv[3])
        amount_usdt = float(sys.argv[4])
        amount = int(amount_usdt * 1e6)  # Convert to 6 decimals
        start_intent(arb_recipient, expires_at, amount)
        
    elif command == "check-balance":
        # Check USDT balance of deposit address
        if len(sys.argv) < 3:
            print("Usage: check-balance <tron_address>")
            sys.exit(1)
        addr = sys.argv[2]
        client = get_client()
        usdt = client.get_contract(TRON_USDT_ADDR)
        balance = retry_on_rate_limit(lambda: usdt.functions.balanceOf(addr))
        print(f"USDT balance of {addr}: {balance / 1e6:.6f}")
        
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
