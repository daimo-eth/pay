#!/usr/bin/env python3
"""
Deploy DepositAddress contracts to Tron mainnet.

Requirements:
  pip install tronpy eth-abi

Environment variables:
  TRON_PRIVATE_KEY   - hex private key (without 0x prefix)
  TRON_NETWORK       - "mainnet", "shasta", or "nile" (default: mainnet)
  TRON_API_KEY       - optional TronGrid API key for higher rate limits
  TRON_EXTRA_ENERGY  - extra energy buffer (default: 200000)

Usage:
  python deploy_tron_deposit_address.py [--dry-run]
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from tronpy import Tron
from tronpy.keys import PrivateKey

# =============================================================================
# Configuration - Comment/uncomment to control what gets deployed
# =============================================================================

# Already deployed contracts (for reference in proxy init, etc.)
DEPLOYED = {
    "DepositAddressFactory": "TKjMyTrjW7FEp8enZUEsnWWmhzfDyBQ2GF",
    "DepositAddressManagerTron_impl": "TSeTWB5FhcKrg8BkY4QAVjAh1uZridemuQ",
    "DepositAddressManagerTron": "TKqaUUBccHAR7x4XZYzPfS3sRe16aMg3sN",
    "DaimoPayLegacyMeshBridger": "TCJrFm5CLbCJsoQTCnMTauWc34FFjjJXfn",
    "DaimoPayPricer": "TRYkSGnYqyucfFfejmwNakC8P3vX5mdeyj",
    "UniversalAddressBridger": "TGUdhENmUhxG6qSt985aVGjD337Uq5rUdn",
}

# Contracts to deploy (set to True to deploy, False to skip)
DEPLOY_FLAGS = {
    "DepositAddressFactory": False,  # ✅ Deployed: TKjMyTrjW7FEp8enZUEsnWWmhzfDyBQ2GF
    "DepositAddressManagerTron": False,  # ✅ Deployed: TKqaUUBccHAR7x4XZYzPfS3sRe16aMg3sN
    "DaimoPayLegacyMeshBridger": False,  # ✅ Deployed: TCJrFm5CLbCJsoQTCnMTauWc34FFjjJXfn
    "DaimoPayPricer": False,  # ✅ Deployed: TRYkSGnYqyucfFfejmwNakC8P3vX5mdeyj
    "UniversalAddressBridger": False,  # ✅ Deployed: TGUdhENmUhxG6qSt985aVGjD337Uq5rUdn
}

NETWORK = os.environ.get("TRON_NETWORK", "mainnet")
PRIVATE_KEY = os.environ.get("TRON_PRIVATE_KEY")
API_KEY = os.environ.get("TRON_API_KEY")
EXTRA_ENERGY = int(os.environ.get("TRON_EXTRA_ENERGY", "200000"))

# LayerZero endpoint IDs
ARBITRUM_LZ_EID = 30110


def base58_to_hex20(base58_addr: str) -> str:
    """Convert Tron Base58 address to 20-byte hex (no 0x prefix, no 41 prefix)."""
    from tronpy.keys import to_hex_address
    full_hex = to_hex_address(base58_addr)  # Returns "41" + 40 hex chars
    return full_hex[2:]  # Strip "41" prefix, return 20-byte hex


# Token addresses - derive hex from Base58 for correctness
# Tron USDT TRC20
TRON_USDT_BASE58 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
TRON_USDT_HEX = base58_to_hex20(TRON_USDT_BASE58)

# Arbitrum USDT (EVM address, just strip 0x)
ARBITRUM_USDT_HEX = "fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"

# Legacy Mesh UsdtOFT on Tron
TRON_LEGACY_MESH_OFT_BASE58 = "TFG4wBaDQ8sHWWP1ACeSGnoNR6RRzevLPt"
TRON_LEGACY_MESH_OFT_HEX = base58_to_hex20(TRON_LEGACY_MESH_OFT_BASE58)

# Fee limits in SUN (1 TRX = 1_000_000 SUN)
# Even with rented energy, fee_limit must cover full energy at burn rate
FEE_LIMITS = {
    "DepositAddressFactory": 500_000_000,  # 500 TRX
    "DepositAddressManagerTron": 1_500_000_000,  # 1500 TRX
    "ERC1967Proxy": 200_000_000,  # 200 TRX
    "DaimoPayLegacyMeshBridger": 600_000_000,  # 600 TRX
    "DaimoPayPricer": 300_000_000,  # 300 TRX
    "UniversalAddressBridger": 400_000_000,  # 400 TRX
}

# =============================================================================
# Energy check (manual rental required for deployment)
# =============================================================================


def get_account_energy(client: Tron, address: str) -> int:
    """Get available energy for an address."""
    account = retry_on_rate_limit(lambda: client.get_account_resource(address))
    limit = account.get("EnergyLimit", 0)
    used = account.get("EnergyUsed", 0)
    return limit - used


def check_energy_sufficient(
    client: Tron,
    address: str,
    required_energy: int,
    dry_run: bool = False,
) -> bool:
    """
    Check if we have sufficient energy for deployment.
    Returns True if sufficient, False otherwise.
    """
    if dry_run:
        print(f"[dry-run] would require {required_energy:,} energy")
        return True
    
    available = get_account_energy(client, address)
    print(f"\n{'=' * 60}")
    print("ENERGY CHECK")
    print("=" * 60)
    print(f"  address:   {address}")
    print(f"  available: {available:,}")
    print(f"  required:  {required_energy:,}")
    
    if available >= required_energy:
        print(f"  status:    ✅ SUFFICIENT")
        return True
    
    shortfall = required_energy - available
    print(f"  shortfall: {shortfall:,}")
    print(f"  status:    ❌ INSUFFICIENT")
    print()
    print("  To proceed, rent energy manually:")
    print(f"    1. Go to https://feee.io or https://trxrocket.com")
    print(f"    2. Rent {shortfall:,} energy to: {address}")
    print(f"    3. Re-run this script")
    return False


def verify_contract_bytecode(client: Tron, address: str, name: str) -> bool:
    """Verify a contract has bytecode on-chain."""
    try:
        contract = retry_on_rate_limit(lambda: client.get_contract(address))
        has_code = contract.bytecode is not None and len(contract.bytecode) > 0
        return has_code
    except Exception as e:
        print(f"  ❌ {name}: failed to verify - {e}")
        return False


# =============================================================================
# Helpers
# =============================================================================


def load_artifact(contract_name: str) -> tuple[str, list[dict[str, Any]]]:
    """Load bytecode and ABI from forge build output."""
    out_dir = Path(__file__).parent.parent / "out"

    # First try direct path
    artifact_path = out_dir / f"{contract_name}.sol" / f"{contract_name}.json"

    if not artifact_path.exists():
        # Search in subdirectories
        for sol_dir in out_dir.iterdir():
            if sol_dir.is_dir():
                candidate = sol_dir / f"{contract_name}.json"
                if candidate.exists():
                    artifact_path = candidate
                    break

    if not artifact_path.exists():
        raise FileNotFoundError(
            f"artifact not found: {contract_name}\n" f"run 'forge build' first"
        )

    with open(artifact_path) as f:
        artifact = json.load(f)

    bytecode = artifact["bytecode"]["object"]
    if bytecode.startswith("0x"):
        bytecode = bytecode[2:]

    return bytecode, artifact["abi"]


def retry_on_rate_limit(fn, max_retries: int = 5):
    """Retry a function on 429 rate limit errors with exponential backoff."""
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


def get_client() -> Tron:
    """Create Tron client for the configured network."""
    from tronpy.providers import HTTPProvider
    
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


def tron_address_to_hex(base58_addr: str) -> str:
    """Convert Tron Base58 address to hex (with 41 prefix)."""
    from tronpy.keys import to_hex_address
    return to_hex_address(base58_addr)


def hex_to_tron_address(hex_addr: str) -> str:
    """Convert hex address (with 41 prefix) to Tron Base58."""
    from tronpy.keys import to_base58check_address
    if hex_addr.startswith("0x"):
        hex_addr = "41" + hex_addr[2:]
    elif not hex_addr.startswith("41"):
        hex_addr = "41" + hex_addr
    return to_base58check_address(hex_addr)


def deploy_contract(
    client: Tron,
    priv_key: PrivateKey,
    name: str,
    bytecode: str,
    abi: list[dict[str, Any]],
    fee_limit: int,
    dry_run: bool = False,
) -> tuple[str, int]:
    """Deploy a contract. Returns (address, energy_used)."""
    from tronpy.contract import Contract
    
    owner = priv_key.public_key.to_base58check_address()

    bytecode_size = len(bytecode) // 2
    estimated_energy = bytecode_size * 180  # ~180 energy/byte empirically on Tron

    print(f"\n{'=' * 60}")
    print(f"deploying: {name}")
    print(f"bytecode:  {bytecode_size:,} bytes")
    print(f"energy:    ~{estimated_energy:,} (est)")
    print(f"fee_limit: {fee_limit / 1_000_000:,.0f} TRX")

    if dry_run:
        print("[dry-run] skipping deployment")
        return f"T_DRY_RUN_{name[:10]}", estimated_energy

    # Create contract object
    contract = Contract(abi=abi, bytecode=bytecode)
    
    txn_builder = (
        client.trx.deploy_contract(owner, contract)
        .fee_limit(fee_limit)
    )

    txn = txn_builder.build().sign(priv_key)
    result = retry_on_rate_limit(lambda: txn.broadcast())
    print(f"txid:      {result['txid']}")

    receipt = retry_on_rate_limit(lambda: result.wait())
    contract_address = receipt.get("contract_address")
    if not contract_address:
        raise RuntimeError(f"deployment failed: {receipt}")

    energy_used = receipt.get("receipt", {}).get("energy_usage_total", estimated_energy)
    print(f"deployed:  {contract_address}")
    print(f"energy:    {energy_used:,}")
    print_explorer_url(contract_address)

    return contract_address, energy_used


def print_explorer_url(address: str) -> None:
    """Print explorer URL for the contract."""
    if NETWORK == "mainnet":
        print(f"explorer:  https://tronscan.org/#/contract/{address}")
    elif NETWORK == "shasta":
        print(f"explorer:  https://shasta.tronscan.org/#/contract/{address}")
    else:
        print(f"explorer:  https://nile.tronscan.org/#/contract/{address}")




# =============================================================================
# Individual contract deployment functions
# =============================================================================


def deploy_factory(
    client: Tron, priv_key: PrivateKey, dry_run: bool
) -> tuple[str, int]:
    """Deploy DepositAddressFactory."""
    bytecode, abi = load_artifact("DepositAddressFactory")
    return deploy_contract(
        client=client,
        priv_key=priv_key,
        name="DepositAddressFactory",
        bytecode=bytecode,
        abi=abi,
        fee_limit=FEE_LIMITS["DepositAddressFactory"],
        dry_run=dry_run,
    )


def deploy_manager(
    client: Tron, priv_key: PrivateKey, factory_addr: str, dry_run: bool
) -> tuple[str, str, int]:
    """Deploy DepositAddressManagerTron (impl + proxy). Returns (proxy_addr, impl_addr, energy)."""
    total_energy = 0
    owner_address = priv_key.public_key.to_base58check_address()
    owner_hex = tron_address_to_hex(owner_address)[2:]  # 20 bytes, no 41 prefix

    # 1. Deploy implementation
    bytecode, abi = load_artifact("DepositAddressManagerTron")
    impl_addr, energy = deploy_contract(
        client=client,
        priv_key=priv_key,
        name="DepositAddressManagerTron (impl)",
        bytecode=bytecode,
        abi=abi,
        fee_limit=FEE_LIMITS["DepositAddressManagerTron"],
        dry_run=dry_run,
    )
    total_energy += energy

    # 2. Deploy proxy
    proxy_bytecode, proxy_abi = load_artifact("ERC1967Proxy")

    if not dry_run and factory_addr.startswith("T"):
        factory_hex = tron_address_to_hex(factory_addr)[2:]
        impl_hex = tron_address_to_hex(impl_addr)[2:]
    else:
        factory_hex = "0" * 40
        impl_hex = "0" * 40

    # Encode initialize(address owner, DepositAddressFactory factory) calldata
    # selector = 0x485cc955
    init_data = bytes.fromhex("485cc955") + bytes.fromhex(owner_hex.zfill(64)) + bytes.fromhex(factory_hex.zfill(64))

    # Constructor: (address implementation, bytes memory _data)
    from eth_abi import encode
    constructor_data = encode(["address", "bytes"], [bytes.fromhex(impl_hex), init_data])

    proxy_addr, energy = deploy_contract(
        client=client,
        priv_key=priv_key,
        name="DepositAddressManagerTron (proxy)",
        bytecode=proxy_bytecode + constructor_data.hex(),
        abi=proxy_abi,
        fee_limit=FEE_LIMITS["ERC1967Proxy"],
        dry_run=dry_run,
    )
    total_energy += energy

    return proxy_addr, impl_addr, total_energy


def deploy_bridger(
    client: Tron, priv_key: PrivateKey, dry_run: bool
) -> tuple[str, int]:
    """Deploy DaimoPayLegacyMeshBridger."""
    bytecode, abi = load_artifact("DaimoPayLegacyMeshBridger")

    # Constructor: (uint256[] chainIds, LZBridgeRoute[] routes)
    # LZBridgeRoute = (uint32 dstEid, address app, address bridgeTokenIn, address bridgeTokenOut, uint256 decimals)
    chain_ids = [42161]  # Arbitrum
    routes = [(
        ARBITRUM_LZ_EID,  # dstEid
        bytes.fromhex(TRON_LEGACY_MESH_OFT_HEX.zfill(40)),  # app (UsdtOFT on Tron)
        bytes.fromhex(TRON_USDT_HEX.zfill(40)),  # bridgeTokenIn (USDT TRC20)
        bytes.fromhex(ARBITRUM_USDT_HEX.zfill(40)),  # bridgeTokenOut (USDT on Arb)
        6,  # bridgeTokenOutDecimals
    )]

    from eth_abi import encode
    constructor_data = encode(
        ["uint256[]", "(uint32,address,address,address,uint256)[]"],
        [chain_ids, routes]
    )

    return deploy_contract(
        client=client,
        priv_key=priv_key,
        name="DaimoPayLegacyMeshBridger",
        bytecode=bytecode + constructor_data.hex(),
        abi=abi,
        fee_limit=FEE_LIMITS["DaimoPayLegacyMeshBridger"],
        dry_run=dry_run,
    )


def deploy_pricer(
    client: Tron, priv_key: PrivateKey, dry_run: bool
) -> tuple[str, int]:
    """Deploy DaimoPayPricer."""
    bytecode, abi = load_artifact("DaimoPayPricer")

    owner_address = priv_key.public_key.to_base58check_address()
    owner_hex = tron_address_to_hex(owner_address)[2:]  # 20 bytes, no 41 prefix

    # Constructor: (address trustedSigner, uint256 maxPriceAge)
    # trustedSigner = deployer, maxPriceAge = 300 seconds (5 minutes)
    from eth_abi import encode
    constructor_data = encode(
        ["address", "uint256"],
        [bytes.fromhex(owner_hex), 300]
    )

    return deploy_contract(
        client=client,
        priv_key=priv_key,
        name="DaimoPayPricer",
        bytecode=bytecode + constructor_data.hex(),
        abi=abi,
        fee_limit=FEE_LIMITS["DaimoPayPricer"],
        dry_run=dry_run,
    )


def deploy_universal_bridger(
    client: Tron, priv_key: PrivateKey, legacy_mesh_bridger_addr: str, dry_run: bool
) -> tuple[str, int]:
    """Deploy UniversalAddressBridger wrapping the Legacy Mesh bridger."""
    bytecode, abi = load_artifact("UniversalAddressBridger")
    
    # Get bridger hex address (20 bytes, no 41 prefix)
    if legacy_mesh_bridger_addr.startswith("T_DRY"):
        bridger_hex = "00" * 20  # Dummy for dry run
    else:
        bridger_hex = tron_address_to_hex(legacy_mesh_bridger_addr)[2:]
    
    # Constructor: (uint256[] toChainIds, IDaimoPayBridger[] bridgers, address[] stableOut)
    # For Tron -> Arbitrum: 
    #   - chainId = 42161 (Arbitrum)
    #   - bridger = DaimoPayLegacyMeshBridger
    #   - stableOut = Arbitrum USDT
    chain_ids = [42161]
    bridgers = [bytes.fromhex(bridger_hex)]
    stable_outs = [bytes.fromhex(ARBITRUM_USDT_HEX.zfill(40))]
    
    from eth_abi import encode
    constructor_data = encode(
        ["uint256[]", "address[]", "address[]"],
        [chain_ids, bridgers, stable_outs]
    )
    
    return deploy_contract(
        client=client,
        priv_key=priv_key,
        name="UniversalAddressBridger",
        bytecode=bytecode + constructor_data.hex(),
        abi=abi,
        fee_limit=FEE_LIMITS["UniversalAddressBridger"],
        dry_run=dry_run,
    )


# =============================================================================
# Main deployment
# =============================================================================


def estimate_total_energy(dry_run: bool = False) -> int:
    """Estimate total energy needed for all flagged deployments."""
    total = 0
    
    # Estimate based on bytecode size (~20 energy/byte)
    if DEPLOY_FLAGS.get("DepositAddressFactory"):
        bytecode, _ = load_artifact("DepositAddressFactory")
        total += len(bytecode) // 2 * 20
    
    if DEPLOY_FLAGS.get("DepositAddressManagerTron"):
        bytecode, _ = load_artifact("DepositAddressManagerTron")
        total += len(bytecode) // 2 * 20
        proxy_bytecode, _ = load_artifact("ERC1967Proxy")
        total += len(proxy_bytecode) // 2 * 20
    
    if DEPLOY_FLAGS.get("DaimoPayLegacyMeshBridger"):
        bytecode, _ = load_artifact("DaimoPayLegacyMeshBridger")
        total += len(bytecode) // 2 * 20
    
    if DEPLOY_FLAGS.get("DaimoPayPricer"):
        bytecode, _ = load_artifact("DaimoPayPricer")
        total += len(bytecode) // 2 * 20
    
    if DEPLOY_FLAGS.get("UniversalAddressBridger"):
        bytecode, _ = load_artifact("UniversalAddressBridger")
        total += len(bytecode) // 2 * 20
    
    return total


def deploy_all(dry_run: bool = False) -> dict[str, str]:
    """Deploy selected contracts based on DEPLOY_FLAGS."""
    if not PRIVATE_KEY and not dry_run:
        raise ValueError("TRON_PRIVATE_KEY not set")

    print(f"network: {NETWORK}")
    if API_KEY:
        print(f"api_key: {API_KEY[:8]}...")
    client = get_client()

    total_energy = 0
    addresses: dict[str, str] = dict(DEPLOYED)  # Start with already deployed

    if dry_run and not PRIVATE_KEY:
        priv_key = PrivateKey(bytes.fromhex("1" + "0" * 63))
        owner_address = priv_key.public_key.to_base58check_address()
        print(f"deployer: {owner_address} (dry-run dummy)")
        print("balance:  N/A (dry-run)")
    else:
        priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
        owner_address = priv_key.public_key.to_base58check_address()
        print(f"deployer: {owner_address}")
        if not dry_run:
            balance = retry_on_rate_limit(lambda: client.get_account_balance(owner_address))
            print(f"balance:  {balance} TRX")

    # -------------------------------------------------------------------------
    # Check sufficient energy before deployment
    # -------------------------------------------------------------------------
    
    estimated_energy = estimate_total_energy(dry_run)
    if estimated_energy > 0:
        total_required = estimated_energy + EXTRA_ENERGY
        
        if not check_energy_sufficient(client, owner_address, total_required, dry_run):
            sys.exit(1)

    # -------------------------------------------------------------------------
    # Deploy contracts based on flags
    # -------------------------------------------------------------------------

    if DEPLOY_FLAGS.get("DepositAddressFactory"):
        addr, energy = deploy_factory(client, priv_key, dry_run)
        addresses["DepositAddressFactory"] = addr
        total_energy += energy

    if DEPLOY_FLAGS.get("DepositAddressManagerTron"):
        factory_addr = addresses.get("DepositAddressFactory", "T_DRY_RUN_FACTORY")
        proxy_addr, impl_addr, energy = deploy_manager(client, priv_key, factory_addr, dry_run)
        addresses["DepositAddressManagerTron"] = proxy_addr
        addresses["DepositAddressManagerTron_impl"] = impl_addr
        total_energy += energy

    if DEPLOY_FLAGS.get("DaimoPayLegacyMeshBridger"):
        addr, energy = deploy_bridger(client, priv_key, dry_run)
        addresses["DaimoPayLegacyMeshBridger"] = addr
        total_energy += energy

    if DEPLOY_FLAGS.get("DaimoPayPricer"):
        addr, energy = deploy_pricer(client, priv_key, dry_run)
        addresses["DaimoPayPricer"] = addr
        total_energy += energy

    if DEPLOY_FLAGS.get("UniversalAddressBridger"):
        bridger_addr = addresses.get("DaimoPayLegacyMeshBridger", "T_DRY_RUN_BRIDGER")
        addr, energy = deploy_universal_bridger(client, priv_key, bridger_addr, dry_run)
        addresses["UniversalAddressBridger"] = addr
        total_energy += energy

    # -------------------------------------------------------------------------
    # Verify deployments
    # -------------------------------------------------------------------------
    
    if not dry_run and total_energy > 0:
        print("\n" + "=" * 60)
        print("VERIFYING DEPLOYMENTS")
        print("=" * 60)
        all_verified = True
        for name, addr in addresses.items():
            if addr.startswith("T_DRY"):
                continue
            verified = verify_contract_bytecode(client, addr, name)
            status = "✅" if verified else "❌"
            print(f"  {status} {name}: {addr}")
            if not verified:
                all_verified = False
        
        if not all_verified:
            print("\n❌ Some contracts failed to deploy. Check Tronscan for details.")
            sys.exit(1)
    
    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("DEPLOYMENT SUMMARY")
    print("=" * 60)
    for name, addr in addresses.items():
        status = "✅" if not addr.startswith("T_DRY") else "🔶"
        print(f"  {status} {name}: {addr}")

    print(f"\nTotal energy used (this run): {total_energy:,}")

    # Cost estimates for dry runs
    if dry_run and total_energy > 0:
        # Energy rental: ~100 SUN per energy for 1 hour
        rental_cost_trx = (total_energy * 100) / 1_000_000
        print(f"\nEstimated energy rental cost: ~{rental_cost_trx:.1f} TRX")
        print(f"  (at ~100 SUN/energy for 1 hour)")
        print(f"  Plus ~2 TRX for bandwidth")
        print(f"  TOTAL: ~{rental_cost_trx + 2:.1f} TRX")

    # Verification URLs
    if not dry_run:
        print("\n" + "=" * 60)
        print("VERIFY ON TRONSCAN (optional)")
        print("=" * 60)
        for name, addr in addresses.items():
            if not addr.startswith("T_DRY"):
                print(f"  {name}: https://tronscan.org/#/contract/{addr}/code")

    return addresses


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("DRY RUN MODE - no transactions will be sent\n")

    # Show what will be deployed
    print("Contracts to deploy:")
    for name, deploy in DEPLOY_FLAGS.items():
        status = "🔶 DEPLOY" if deploy else "⏭️  skip (already deployed)"
        print(f"  {name}: {status}")
    print()

    deploy_all(dry_run=dry_run)


if __name__ == "__main__":
    main()
