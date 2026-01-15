"""Portfolio rebalancing calculator algorithm."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass
class AssetAllocation:
    """Represents an asset with its allocation data."""
    name: str
    target_pct: Decimal
    current_value: Decimal
    allow_sell: bool = False
    
    # Calculated fields
    current_pct: Decimal = Decimal("0")
    buy_sell: Decimal = Decimal("0")
    final_value: Decimal = Decimal("0")
    final_pct: Decimal = Decimal("0")


def calculate_rebalance(
    assets: list[AssetAllocation],
    contribution: Decimal,
) -> list[AssetAllocation]:
    """
    Calculate the rebalancing amounts for each asset.
    
    Args:
        assets: List of assets with target percentages and current values
        contribution: Amount to contribute (positive) or withdraw (negative)
    
    Returns:
        Updated list of assets with calculated buy/sell amounts
    """
    if not assets:
        return assets
    
    # Calculate totals
    total_current = sum(a.current_value for a in assets)
    total_target_pct = sum(a.target_pct for a in assets)
    
    # Handle edge case of no target allocation
    if total_target_pct == 0:
        for asset in assets:
            asset.current_pct = Decimal("0")
            asset.buy_sell = Decimal("0")
            asset.final_value = asset.current_value
            asset.final_pct = Decimal("0")
        return assets
    
    # Calculate current percentages
    for asset in assets:
        if total_current > 0:
            asset.current_pct = (asset.current_value / total_current * 100).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            asset.current_pct = Decimal("0")
    
    # Calculate target final portfolio value
    total_final = total_current + contribution
    
    if total_final <= 0:
        # Withdrawing more than portfolio value - just distribute the withdrawal
        for asset in assets:
            asset.buy_sell = -asset.current_value
            asset.final_value = Decimal("0")
            asset.final_pct = Decimal("0")
        return assets
    
    # Calculate ideal buy/sell amounts (unconstrained)
    ideal_buy_sell = []
    for asset in assets:
        target_value = (asset.target_pct / total_target_pct) * total_final
        ideal = target_value - asset.current_value
        ideal_buy_sell.append(ideal)
    
    # Apply constraints and redistribute
    buy_sell_amounts = _apply_constraints(assets, ideal_buy_sell, contribution)
    
    # Apply calculated amounts and compute final values
    total_buy_sell = Decimal("0")
    for i, asset in enumerate(assets):
        asset.buy_sell = buy_sell_amounts[i].quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        asset.final_value = asset.current_value + asset.buy_sell
        total_buy_sell += asset.buy_sell
    
    # Distribute rounding difference to largest position
    rounding_diff = contribution - total_buy_sell
    if rounding_diff != 0 and assets:
        # Find the asset with the largest absolute buy_sell that can absorb the difference
        max_idx = 0
        max_abs = abs(assets[0].buy_sell)
        for i, asset in enumerate(assets):
            if abs(asset.buy_sell) > max_abs:
                max_abs = abs(asset.buy_sell)
                max_idx = i
        assets[max_idx].buy_sell += rounding_diff
        assets[max_idx].final_value += rounding_diff
    
    # Calculate final percentages
    total_final_actual = sum(a.final_value for a in assets)
    for asset in assets:
        if total_final_actual > 0:
            asset.final_pct = (asset.final_value / total_final_actual * 100).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            asset.final_pct = Decimal("0")
    
    return assets


def _apply_constraints(
    assets: list[AssetAllocation],
    ideal_buy_sell: list[Decimal],
    contribution: Decimal,
) -> list[Decimal]:
    """
    Apply constraints (no-sell, can't sell more than owned) and redistribute.
    
    Uses weighted redistribution to handle constrained assets.
    """
    result = list(ideal_buy_sell)
    total_target_pct = sum(a.target_pct for a in assets)
    
    # Iteratively apply constraints and redistribute
    max_iterations = len(assets) * 2  # Prevent infinite loops
    for _ in range(max_iterations):
        constrained_indices = set()
        excess = Decimal("0")
        
        for i, asset in enumerate(assets):
            # Can't sell if not allowed
            if not asset.allow_sell and result[i] < 0:
                excess += result[i]  # This is negative
                result[i] = Decimal("0")
                constrained_indices.add(i)
            
            # Can't sell more than current value
            elif result[i] < -asset.current_value:
                excess += result[i] + asset.current_value
                result[i] = -asset.current_value
                constrained_indices.add(i)
        
        if excess == 0:
            break
        
        # Redistribute excess to unconstrained assets by weight
        unconstrained_weight = sum(
            assets[i].target_pct for i in range(len(assets))
            if i not in constrained_indices
        )
        
        if unconstrained_weight == 0:
            # All assets are constrained, can't redistribute
            break
        
        for i in range(len(assets)):
            if i not in constrained_indices:
                weight = assets[i].target_pct / unconstrained_weight
                result[i] += excess * weight
    
    return result


def calculate_auto_contribution(assets: list[AssetAllocation]) -> Decimal:
    """
    Calculate the minimum contribution needed to perfectly balance the portfolio.
    
    This finds the contribution amount where no selling is required
    (all buy_sell amounts are >= 0).
    """
    if not assets:
        return Decimal("0")
    
    total_current = sum(a.current_value for a in assets)
    total_target_pct = sum(a.target_pct for a in assets)
    
    if total_target_pct == 0:
        return Decimal("0")
    
    # For each asset, calculate the contribution that would make its buy_sell = 0
    # target_value = (target_pct / total_target_pct) * (total_current + contribution)
    # current_value = target_value  (for buy_sell = 0)
    # current_value = (target_pct / total_target_pct) * (total_current + contribution)
    # current_value * total_target_pct / target_pct = total_current + contribution
    # contribution = current_value * total_target_pct / target_pct - total_current
    
    min_contributions = []
    for asset in assets:
        if asset.target_pct > 0:
            required_total = asset.current_value * total_target_pct / asset.target_pct
            required_contribution = required_total - total_current
            min_contributions.append(required_contribution)
    
    if not min_contributions:
        return Decimal("0")
    
    # The minimum contribution is the maximum of all required contributions
    # (to ensure no asset needs to be sold)
    return max(min_contributions).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
