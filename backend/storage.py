"""Portfolio storage - save and load portfolios as JSON files."""

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path("/app/data/portfolios")


def _ensure_data_dir() -> None:
    """Ensure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_portfolio(name: str, data: dict[str, Any]) -> Path:
    """
    Save a portfolio to a JSON file.
    
    Args:
        name: Portfolio name (used as filename)
        data: Portfolio data to save
    
    Returns:
        Path to the saved file
    """
    _ensure_data_dir()
    
    # Sanitize filename
    safe_name = "".join(c for c in name if c.isalnum() or c in " -_").strip()
    if not safe_name:
        safe_name = "portfolio"
    
    filepath = DATA_DIR / f"{safe_name}.json"
    
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    return filepath


def load_portfolio(name: str) -> dict[str, Any] | None:
    """
    Load a portfolio from a JSON file.
    
    Args:
        name: Portfolio name (filename without extension)
    
    Returns:
        Portfolio data or None if not found
    """
    _ensure_data_dir()
    
    filepath = DATA_DIR / f"{name}.json"
    
    if not filepath.exists():
        return None
    
    with open(filepath, "r") as f:
        return json.load(f)


def list_portfolios() -> list[str]:
    """
    List all saved portfolio names.
    
    Returns:
        List of portfolio names (filenames without extension)
    """
    _ensure_data_dir()
    
    portfolios = []
    for filepath in DATA_DIR.glob("*.json"):
        portfolios.append(filepath.stem)
    
    return sorted(portfolios)


def delete_portfolio(name: str) -> bool:
    """
    Delete a saved portfolio.
    
    Args:
        name: Portfolio name to delete
    
    Returns:
        True if deleted, False if not found
    """
    _ensure_data_dir()
    
    filepath = DATA_DIR / f"{name}.json"
    
    if filepath.exists():
        filepath.unlink()
        return True
    
    return False
