#!/usr/bin/env python3
"""
Tron energy rental via Feee.io API.

Environment variables:
  FEEE_API_KEY       - Feee.io API key (required for rental)
  TRON_API_KEY       - TronGrid API key
  TRON_PRIVATE_KEY   - Hex private key (to get owner address)
  TRON_EXTRA_ENERGY  - Extra energy buffer (default: 50000)

Usage:
  # Check current energy
  python tron_energy.py check
  
  # Rent energy
  python tron_energy.py rent <energy_amount>
  
  # Ensure minimum energy before action
  python tron_energy.py ensure <required_energy>
"""

import json
import os
import sys
import time
import http.client
from typing import Optional

from tronpy import Tron
from tronpy.keys import PrivateKey
from tronpy.providers import HTTPProvider

# =============================================================================
# Configuration
# =============================================================================

NETWORK = os.environ.get("TRON_NETWORK", "mainnet")
PRIVATE_KEY = os.environ.get("TRON_PRIVATE_KEY")
TRON_API_KEY = os.environ.get("TRON_API_KEY")
FEEE_API_KEY = os.environ.get("FEEE_API_KEY")

# Extra energy buffer for safety margin
EXTRA_ENERGY = int(os.environ.get("TRON_EXTRA_ENERGY", "200000"))

# Feee.io API base URL
FEEE_API_HOST = "feee.io"

# Minimum rental duration (seconds) - 10 minutes for V2
MIN_RENTAL_SECONDS = 600


# =============================================================================
# Helpers
# =============================================================================


def get_client() -> Tron:
    """Create Tron client."""
    if NETWORK == "mainnet":
        if TRON_API_KEY:
            provider = HTTPProvider(api_key=TRON_API_KEY)
            return Tron(provider=provider)
        return Tron()
    elif NETWORK == "shasta":
        return Tron(network="shasta")
    elif NETWORK == "nile":
        return Tron(network="nile")
    else:
        raise ValueError(f"unknown network: {NETWORK}")


def get_owner_address() -> str:
    """Get owner address from private key."""
    if not PRIVATE_KEY:
        raise ValueError("TRON_PRIVATE_KEY not set")
    priv_key = PrivateKey(bytes.fromhex(PRIVATE_KEY))
    return priv_key.public_key.to_base58check_address()


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


# =============================================================================
# Energy status
# =============================================================================


def get_account_resources(address: str) -> dict:
    """Get account resources (energy, bandwidth) from chain."""
    client = get_client()
    
    # Get account info
    account = retry_on_rate_limit(lambda: client.get_account_resource(address))
    
    energy_limit = account.get("EnergyLimit", 0)
    energy_used = account.get("EnergyUsed", 0)
    energy_available = energy_limit - energy_used
    
    bandwidth_limit = account.get("freeNetLimit", 0) + account.get("NetLimit", 0)
    bandwidth_used = account.get("freeNetUsed", 0) + account.get("NetUsed", 0)
    bandwidth_available = bandwidth_limit - bandwidth_used
    
    return {
        "energy_limit": energy_limit,
        "energy_used": energy_used,
        "energy_available": energy_available,
        "bandwidth_limit": bandwidth_limit,
        "bandwidth_used": bandwidth_used,
        "bandwidth_available": bandwidth_available,
    }


def check_energy(address: Optional[str] = None) -> dict:
    """Check current energy balance."""
    if address is None:
        address = get_owner_address()
    
    resources = get_account_resources(address)
    
    print(f"\n{'=' * 60}")
    print("ACCOUNT RESOURCES")
    print("=" * 60)
    print(f"  address: {address}")
    print(f"  energy:  {resources['energy_available']:,} / {resources['energy_limit']:,}")
    print(f"  bandwidth: {resources['bandwidth_available']:,} / {resources['bandwidth_limit']:,}")
    
    return resources


# =============================================================================
# Feee.io API
# =============================================================================


def feee_request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Make request to Feee.io API."""
    if not FEEE_API_KEY:
        raise ValueError("FEEE_API_KEY not set - get one from https://feee.io/console/buyer/api-key")
    
    conn = http.client.HTTPSConnection(FEEE_API_HOST)
    
    headers = {
        "key": FEEE_API_KEY,
        "User-Agent": "DaimoPay/1.0.0",
        "Content-Type": "application/json",
    }
    
    body_str = json.dumps(body) if body else ""
    
    conn.request(method, f"/open{path}", body_str, headers)
    response = conn.getresponse()
    data = json.loads(response.read().decode("utf-8"))
    
    if data.get("code") != 0:
        raise RuntimeError(f"Feee.io API error: {data.get('msg', 'unknown error')}")
    
    return data


def get_rental_price(energy_amount: int, duration_hours: int = 1) -> dict:
    """Get price quote for energy rental."""
    path = f"/v2/order/price?resource_value={energy_amount}&rent_time_unit=h&rent_duration={duration_hours}"
    data = feee_request("GET", path)
    return data.get("data", {})


def rent_energy(
    receive_address: str,
    energy_amount: int,
    duration_hours: int = 1,
) -> dict:
    """
    Rent energy from Feee.io.
    
    Args:
        receive_address: Tron address to receive energy
        energy_amount: Amount of energy to rent
        duration_hours: Rental duration in hours (1 or 3 for hourly)
    
    Returns:
        Order details from Feee.io
    """
    if not FEEE_API_KEY:
        raise ValueError("FEEE_API_KEY not set - get one from https://feee.io/console/buyer/api-key")
    
    print(f"\n{'=' * 60}")
    print("RENTING ENERGY")
    print("=" * 60)
    print(f"  receive_address: {receive_address}")
    print(f"  energy_amount: {energy_amount:,}")
    print(f"  duration: {duration_hours} hour(s)")
    
    # Get price quote first
    price = get_rental_price(energy_amount, duration_hours)
    print(f"  price: {price.get('pay_amount', 'N/A')} TRX")
    
    # Create order
    body = {
        "resource_type": 1,  # 1 = energy
        "receive_address": receive_address,
        "resource_value": energy_amount,
        "rent_duration": duration_hours,
        "rent_time_unit": "h",
        "rent_time_second": duration_hours * 3600,
    }
    
    data = feee_request("POST", "/v2/order/submit", body)
    order = data.get("data", {})
    
    print(f"  order_no: {order.get('order_no', 'N/A')}")
    print(f"  status: {order.get('status', 'N/A')}")
    print(f"  pay_amount: {order.get('pay_amount', 'N/A')} TRX")
    
    # Wait for energy to be delegated (usually 3-6 seconds)
    print("\n  Waiting for energy delegation...")
    for i in range(20):  # Wait up to 20 seconds
        time.sleep(1)
        resources = get_account_resources(receive_address)
        if resources["energy_available"] >= energy_amount * 0.9:  # 90% tolerance
            print(f"  ✅ Energy received: {resources['energy_available']:,}")
            break
        print(f"  ... {resources['energy_available']:,} / {energy_amount:,}")
    else:
        print(f"  ⚠️  Energy may not have been fully delegated yet")
    
    return order


def ensure_energy(required_energy: int, address: Optional[str] = None) -> bool:
    """
    Ensure we have enough energy before an action.
    Rents additional energy if needed.
    
    Args:
        required_energy: Minimum energy needed
        address: Address to check/receive energy (defaults to owner)
    
    Returns:
        True if we have enough energy, False otherwise
    """
    if address is None:
        address = get_owner_address()
    
    # Check current energy
    resources = get_account_resources(address)
    current = resources["energy_available"]
    
    # Add buffer
    total_needed = required_energy + EXTRA_ENERGY
    
    print(f"\n{'=' * 60}")
    print("ENERGY CHECK")
    print("=" * 60)
    print(f"  address: {address}")
    print(f"  current: {current:,}")
    print(f"  required: {required_energy:,}")
    print(f"  buffer: {EXTRA_ENERGY:,}")
    print(f"  total needed: {total_needed:,}")
    
    if current >= total_needed:
        print(f"  ✅ Sufficient energy available")
        return True
    
    # Need to rent more
    to_rent = total_needed - current
    print(f"  ⚠️  Need to rent {to_rent:,} more energy")
    
    if not FEEE_API_KEY:
        print(f"  ❌ FEEE_API_KEY not set - cannot rent energy")
        print(f"     Get one from: https://feee.io/console/buyer/api-key")
        print(f"     Or manually rent energy for address: {address}")
        return False
    
    # Rent energy
    try:
        rent_energy(address, to_rent, duration_hours=1)
        return True
    except Exception as e:
        print(f"  ❌ Failed to rent energy: {e}")
        return False


# =============================================================================
# Main
# =============================================================================


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check":
        address = sys.argv[2] if len(sys.argv) > 2 else None
        check_energy(address)
        
    elif command == "rent":
        if len(sys.argv) < 3:
            print("Usage: rent <energy_amount> [duration_hours]")
            sys.exit(1)
        
        address = get_owner_address()
        energy_amount = int(sys.argv[2])
        duration_hours = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        rent_energy(address, energy_amount, duration_hours)
        
    elif command == "ensure":
        if len(sys.argv) < 3:
            print("Usage: ensure <required_energy>")
            sys.exit(1)
        
        required = int(sys.argv[2])
        success = ensure_energy(required)
        sys.exit(0 if success else 1)
        
    elif command == "price":
        if len(sys.argv) < 3:
            print("Usage: price <energy_amount> [duration_hours]")
            sys.exit(1)
        
        energy_amount = int(sys.argv[2])
        duration_hours = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        price = get_rental_price(energy_amount, duration_hours)
        print(f"\nPrice for {energy_amount:,} energy ({duration_hours}h):")
        print(f"  pay_amount: {price.get('pay_amount', 'N/A')} TRX")
        print(f"  price_in_sun: {price.get('price_in_sun', 'N/A')} SUN/energy")
        
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
