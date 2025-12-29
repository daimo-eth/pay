#!/usr/bin/env python3
"""
Deploy contracts to Tron mainnet/testnet.

Requirements:
  pip install tronpy

Environment variables:
  TRON_PRIVATE_KEY - hex private key (without 0x prefix)
  TRON_NETWORK     - "mainnet", "shasta", or "nile" (default: mainnet)

Usage:
  python deploy_tron.py <contract_name> [constructor_args...]

Example:
  python deploy_tron.py DaimoPayRelayer TOwnerAddress
"""

import json
import os
import sys
from pathlib import Path

from tronpy import Tron
from tronpy.keys import PrivateKey
from tronpy.contract import Contract

# Config
NETWORK = os.environ.get("TRON_NETWORK", "mainnet")
PRIVATE_KEY = os.environ.get("TRON_PRIVATE_KEY")


def load_contract_artifact(contract_name: str) -> tuple[str, list]:
    """Load bytecode and ABI from forge build output."""
    out_dir = Path(__file__).parent.parent / "out"
    artifact_path = out_dir / f"{contract_name}.sol" / f"{contract_name}.json"

    if not artifact_path.exists():
        # Try looking in subdirectories
        for sol_dir in out_dir.iterdir():
            if sol_dir.is_dir():
                candidate = sol_dir / f"{contract_name}.json"
                if candidate.exists():
                    artifact_path = candidate
                    break

    if not artifact_path.exists():
        raise FileNotFoundError(
            f"contract artifact not found: {artifact_path}\n"
            f"run 'forge build' first"
        )

    with open(artifact_path) as f:
        artifact = json.load(f)

    bytecode = artifact["bytecode"]["object"]
    if bytecode.startswith("0x"):
        bytecode = bytecode[2:]

    abi = artifact["abi"]
    return bytecode, abi


def deploy(contract_name: str, constructor_args: list[str]) -> str:
    """Deploy contract to Tron and return the contract address."""
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")

    # Connect to network
    if NETWORK == "mainnet":
        client = Tron()
    elif NETWORK == "shasta":
        client = Tron(network="shasta")
    elif NETWORK == "nile":
        client = Tron(network="nile")
    else:
        raise ValueError(f"unknown network: {NETWORK}")

    priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
    owner_address = priv_key.public_key.to_base58check_address()
    print(f"deployer: {owner_address}")
    print(f"network:  {NETWORK}")

    # Load contract
    bytecode, abi = load_contract_artifact(contract_name)
    print(f"contract: {contract_name}")
    print(f"bytecode: {len(bytecode) // 2} bytes")

    if constructor_args:
        print(f"constructor args: {constructor_args}")

    # Create contract wrapper
    contract = Contract(name=contract_name, bytecode=bytecode, abi=abi)

    # Build deploy transaction
    # fee_limit in SUN (1 TRX = 1_000_000 SUN), 1000 TRX should cover most deploys
    txn_builder = client.trx.deploy_contract(owner_address, contract)
    txn_builder = txn_builder.fee_limit(1_000_000_000)

    # Add constructor parameters if any
    # Note: constructor args must match the types in the ABI
    if constructor_args:
        txn_builder = txn_builder.with_parameters(*constructor_args)

    txn = txn_builder.build().sign(priv_key)
    result = txn.broadcast().wait()

    contract_address = result.get("contract_address")
    if not contract_address:
        raise RuntimeError(f"deployment failed: {result}")

    print(f"\ndeployed at: {contract_address}")
    print(f"txid: {result.get('id', 'unknown')}")

    if NETWORK == "mainnet":
        print(f"explorer: https://tronscan.org/#/contract/{contract_address}")
    elif NETWORK == "shasta":
        print(f"explorer: https://shasta.tronscan.org/#/contract/{contract_address}")
    else:
        print(f"explorer: https://nile.tronscan.org/#/contract/{contract_address}")

    return contract_address


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    contract_name = sys.argv[1]
    constructor_args = sys.argv[2:]

    deploy(contract_name, constructor_args)


if __name__ == "__main__":
    main()
