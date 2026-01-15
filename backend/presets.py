"""Portfolio Selection preset definitions."""

from typing import TypedDict


class Asset(TypedDict):
    name: str
    target_pct: int


class Preset(TypedDict):
    name: str
    assets: list[Asset]


PRESETS: list[Preset] = [
    {
        "name": "Rick Ferri 40/40/20",
        "assets": [
            {"name": "Total Bond", "target_pct": 40},
            {"name": "Total Stock", "target_pct": 40},
            {"name": "Total International Stock", "target_pct": 20},
        ],
    },
    {
        "name": "Rick Ferri 60/40",
        "assets": [
            {"name": "Total Stock", "target_pct": 60},
            {"name": "Total Bond", "target_pct": 40},
        ],
    },
    {
        "name": "Rick Ferri 80/20",
        "assets": [
            {"name": "Total Stock", "target_pct": 80},
            {"name": "Total Bond", "target_pct": 20},
        ],
    },
    {
        "name": "Coffeehouse",
        "assets": [
            {"name": "Total Bond", "target_pct": 40},
            {"name": "Large Cap", "target_pct": 10},
            {"name": "Large Cap Value", "target_pct": 10},
            {"name": "Small Cap", "target_pct": 10},
            {"name": "Small Cap Value", "target_pct": 10},
            {"name": "International", "target_pct": 10},
            {"name": "REIT", "target_pct": 10},
        ],
    },
    {
        "name": "California Chill",
        "assets": [
            {"name": "Domestic Equity", "target_pct": 40},
            {"name": "Foreign Developed Equity", "target_pct": 10},
            {"name": "Emerging Markets Equity", "target_pct": 5},
            {"name": "Real Estate", "target_pct": 15},
            {"name": "U.S Treasury Bonds", "target_pct": 15},
            {"name": "US TIPS Bonds", "target_pct": 15},
        ],
    },
]


def get_preset_names() -> list[str]:
    """Return list of preset names."""
    return [p["name"] for p in PRESETS]


def get_preset(name: str) -> Preset | None:
    """Get a preset by name."""
    for preset in PRESETS:
        if preset["name"] == name:
            return preset
    return None
