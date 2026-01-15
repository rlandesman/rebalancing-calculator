"""Fidelity CSV parser for portfolio import."""

import csv
import re
from io import StringIO
from pathlib import Path
from typing import Any

import yaml

MAPPING_FILE = Path(__file__).parent / "etf_mapping.yaml"

# Required columns for Fidelity CSV
REQUIRED_COLUMNS = {"Account Name", "Symbol", "Current Value"}


class CSVParseError(Exception):
    """Human-readable CSV parsing error."""
    pass


def load_etf_mapping() -> dict[str, Any]:
    """Load ETF mapping configuration from YAML file."""
    if not MAPPING_FILE.exists():
        return {"mappings": {}, "ignore": []}
    
    with open(MAPPING_FILE, "r") as f:
        return yaml.safe_load(f) or {"mappings": {}, "ignore": []}


def parse_currency(value: str) -> float | None:
    """Parse currency string like '$281,678.11' or '($78,731.32)' to float."""
    if not value or value == "--":
        return None
    
    # Remove whitespace
    value = value.strip()
    
    # Check for negative (parentheses)
    is_negative = value.startswith("(") and value.endswith(")")
    if is_negative:
        value = value[1:-1]
    
    # Remove $ and commas
    value = value.replace("$", "").replace(",", "")
    
    try:
        result = float(value)
        return -result if is_negative else result
    except ValueError:
        return None


def parse_fidelity_csv(csv_content: str) -> dict[str, Any]:
    """
    Parse Fidelity CSV export and return structured data.
    
    Returns:
        {
            "accounts": ["Account Name 1", "Account Name 2"],
            "positions": [
                {
                    "account": "Account Name",
                    "symbol": "VTI",
                    "description": "VANGUARD TOTAL STK MKT ETF",
                    "current_value": 281678.11,
                    "mapped_asset": "Domestic Equity" | None
                }
            ],
            "mapping": {"VTI": "Domestic Equity", ...}
        }
    
    Raises:
        CSVParseError: If the CSV is malformed or missing required columns
    """
    # Check for empty content
    if not csv_content or not csv_content.strip():
        raise CSVParseError("The file appears to be empty. Please upload a valid Fidelity CSV export.")
    
    config = load_etf_mapping()
    mappings = config.get("mappings", {})
    ignore_list = config.get("ignore", [])
    
    # Parse CSV
    try:
        reader = csv.DictReader(StringIO(csv_content))
        # Force reading fieldnames to detect CSV issues early
        fieldnames = reader.fieldnames
    except csv.Error as e:
        raise CSVParseError(f"Invalid CSV format: {str(e)}. Please ensure you're uploading a valid CSV file.")
    
    # Check for required columns
    if fieldnames is None:
        raise CSVParseError(
            "Could not read CSV headers. The file may be empty or not a valid CSV format."
        )
    
    missing_columns = REQUIRED_COLUMNS - set(fieldnames)
    if missing_columns:
        raise CSVParseError(
            f"Missing required columns: {', '.join(sorted(missing_columns))}. "
            "This doesn't appear to be a Fidelity portfolio export. "
            "Please export from Fidelity: Positions → Download."
        )
    
    accounts = set()
    positions = []
    row_count = 0
    
    for row in reader:
        row_count += 1
        # Get account name (handle None values)
        account_name = (row.get("Account Name") or "").strip()
        if not account_name:
            continue
        
        # Get symbol (handle None values)
        symbol = (row.get("Symbol") or "").strip()
        
        # Skip if no symbol or in ignore list
        if not symbol:
            continue
        
        # Clean symbol (remove ** suffix for money market)
        clean_symbol = re.sub(r"\*+$", "", symbol)
        
        # Skip ignored symbols
        if clean_symbol in ignore_list or symbol in ignore_list:
            continue
        
        # Get description (handle None values)
        description = (row.get("Description") or "").strip()
        if description in ignore_list:
            continue
        
        # Get current value (handle None values)
        current_value = parse_currency(row.get("Current Value") or "")
        
        # Skip if no value or negative (pending activity)
        if current_value is None or current_value < 0:
            continue
        
        # Map to asset type
        mapped_asset = mappings.get(clean_symbol)
        
        accounts.add(account_name)
        positions.append({
            "account": account_name,
            "symbol": clean_symbol,
            "description": description,
            "current_value": current_value,
            "mapped_asset": mapped_asset,
        })
    
    # Check if we found any valid positions
    if row_count == 0:
        raise CSVParseError(
            "No data rows found in the CSV file. "
            "Please ensure the file contains portfolio positions."
        )
    
    if not positions:
        raise CSVParseError(
            "No valid positions found in the CSV. "
            "All rows were either empty, had no value, or were filtered out (cash/money market). "
            "Please check that your Fidelity export contains investment positions."
        )
    
    return {
        "accounts": sorted(list(accounts)),
        "positions": positions,
        "mapping": mappings,
    }


def filter_positions_by_account(
    positions: list[dict], 
    account_name: str
) -> list[dict]:
    """Filter positions to only include those from a specific account."""
    return [p for p in positions if p["account"] == account_name]


def aggregate_by_asset_type(
    positions: list[dict],
    custom_mappings: dict[str, str] | None = None
) -> list[dict]:
    """
    Aggregate positions by asset type.
    
    Args:
        positions: List of position dicts
        custom_mappings: Additional symbol->asset mappings from user
    
    Returns:
        List of aggregated assets: [{"name": "Domestic Equity", "current_value": 123.45}, ...]
    """
    custom_mappings = custom_mappings or {}
    
    aggregated: dict[str, float] = {}
    
    for pos in positions:
        # Use custom mapping if provided, otherwise use pre-mapped
        asset_type = custom_mappings.get(pos["symbol"]) or pos.get("mapped_asset")
        
        if asset_type:
            aggregated[asset_type] = aggregated.get(asset_type, 0) + pos["current_value"]
    
    return [
        {"name": asset_type, "current_value": round(value, 2)}
        for asset_type, value in sorted(aggregated.items())
    ]
