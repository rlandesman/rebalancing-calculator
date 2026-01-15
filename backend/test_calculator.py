"""Tests for the portfolio rebalancing calculator."""

import pytest
from decimal import Decimal
from calculator import AssetAllocation, calculate_rebalance, calculate_auto_contribution


def make_asset(name: str, target_pct: float, current_value: float, allow_sell: bool = False) -> AssetAllocation:
    """Helper to create AssetAllocation with Decimal conversion."""
    return AssetAllocation(
        name=name,
        target_pct=Decimal(str(target_pct)),
        current_value=Decimal(str(current_value)),
        allow_sell=allow_sell,
    )


class TestBasicRebalancing:
    """Basic functionality tests for calculate_rebalance."""

    def test_simple_contribution(self):
        """Add $1000 to a 60/40 portfolio - verify proportional distribution."""
        assets = [
            make_asset("Stocks", 60, 6000),
            make_asset("Bonds", 40, 4000),
        ]
        results = calculate_rebalance(assets, Decimal("1000"))
        
        # Total should be $11,000. Stocks should get 60% = $6600, Bonds 40% = $4400
        assert results[0].final_value == Decimal("6600.00")
        assert results[1].final_value == Decimal("4400.00")
        assert results[0].buy_sell == Decimal("600.00")
        assert results[1].buy_sell == Decimal("400.00")

    def test_zero_contribution(self):
        """No contribution - verify no buy/sell amounts when already balanced."""
        assets = [
            make_asset("Stocks", 60, 6000),
            make_asset("Bonds", 40, 4000),
        ]
        results = calculate_rebalance(assets, Decimal("0"))
        
        # Already balanced, no changes
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("0")
        assert results[0].final_value == Decimal("6000")
        assert results[1].final_value == Decimal("4000")

    def test_perfect_balance(self):
        """Portfolio already balanced - verify no changes needed."""
        assets = [
            make_asset("Stocks", 50, 5000),
            make_asset("Bonds", 50, 5000),
        ]
        results = calculate_rebalance(assets, Decimal("0"))
        
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("0")
        assert results[0].final_pct == Decimal("50.00")
        assert results[1].final_pct == Decimal("50.00")

    def test_single_asset(self):
        """Single asset at 100% - all contribution goes to one asset."""
        assets = [make_asset("Total Market", 100, 10000)]
        results = calculate_rebalance(assets, Decimal("5000"))
        
        assert results[0].buy_sell == Decimal("5000.00")
        assert results[0].final_value == Decimal("15000.00")
        assert results[0].final_pct == Decimal("100.00")

    def test_three_asset_split(self):
        """Verify 40/40/20 split works correctly."""
        assets = [
            make_asset("US Stocks", 40, 4000),
            make_asset("Intl Stocks", 40, 4000),
            make_asset("Bonds", 20, 2000),
        ]
        results = calculate_rebalance(assets, Decimal("5000"))
        
        # Total $15,000: US $6000, Intl $6000, Bonds $3000
        assert results[0].final_value == Decimal("6000.00")
        assert results[1].final_value == Decimal("6000.00")
        assert results[2].final_value == Decimal("3000.00")
        
        # Buy amounts
        assert results[0].buy_sell == Decimal("2000.00")
        assert results[1].buy_sell == Decimal("2000.00")
        assert results[2].buy_sell == Decimal("1000.00")


class TestEdgeCases:
    """Edge case handling tests."""

    def test_empty_portfolio(self):
        """Empty asset list returns empty list."""
        results = calculate_rebalance([], Decimal("1000"))
        assert results == []

    def test_zero_target_percentages(self):
        """All targets at 0% - no allocation."""
        assets = [
            make_asset("A", 0, 1000),
            make_asset("B", 0, 2000),
        ]
        results = calculate_rebalance(assets, Decimal("500"))
        
        # No targets, no changes
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("0")

    def test_zero_current_values(self):
        """Fresh portfolio with no holdings - all contribution allocated."""
        assets = [
            make_asset("Stocks", 60, 0),
            make_asset("Bonds", 40, 0),
        ]
        results = calculate_rebalance(assets, Decimal("10000"))
        
        # All contribution goes to targets
        assert results[0].buy_sell == Decimal("6000.00")
        assert results[1].buy_sell == Decimal("4000.00")
        assert results[0].final_value == Decimal("6000.00")
        assert results[1].final_value == Decimal("4000.00")

    def test_negative_contribution(self):
        """Withdrawal from portfolio."""
        assets = [
            make_asset("Stocks", 60, 6000, allow_sell=True),
            make_asset("Bonds", 40, 4000, allow_sell=True),
        ]
        results = calculate_rebalance(assets, Decimal("-1000"))
        
        # Total $9000: Stocks $5400, Bonds $3600
        assert results[0].final_value == Decimal("5400.00")
        assert results[1].final_value == Decimal("3600.00")
        assert results[0].buy_sell == Decimal("-600.00")
        assert results[1].buy_sell == Decimal("-400.00")

    def test_withdrawal_exceeds_portfolio(self):
        """Withdraw more than total value - zeroes everything."""
        assets = [
            make_asset("Stocks", 60, 6000, allow_sell=True),
            make_asset("Bonds", 40, 4000, allow_sell=True),
        ]
        results = calculate_rebalance(assets, Decimal("-15000"))
        
        # Can't go negative, everything sold
        assert results[0].final_value == Decimal("0")
        assert results[1].final_value == Decimal("0")
        assert results[0].buy_sell == Decimal("-6000")
        assert results[1].buy_sell == Decimal("-4000")

    def test_rounding_cents(self):
        """Verify amounts round to 2 decimal places."""
        assets = [
            make_asset("A", 33.33, 3333),
            make_asset("B", 33.33, 3333),
            make_asset("C", 33.34, 3334),
        ]
        results = calculate_rebalance(assets, Decimal("1000"))
        
        # All buy_sell amounts should be rounded to cents
        for result in results:
            assert result.buy_sell == result.buy_sell.quantize(Decimal("0.01"))
            assert result.final_value == result.final_value.quantize(Decimal("0.01"))

    def test_percentage_sum_not_100(self):
        """Targets sum to 80% - should still work proportionally."""
        assets = [
            make_asset("A", 40, 4000),
            make_asset("B", 40, 4000),
        ]
        # Targets sum to 80%, not 100%
        results = calculate_rebalance(assets, Decimal("2000"))
        
        # Each should get 50% of final total ($10,000) = $5000
        assert results[0].final_value == Decimal("5000.00")
        assert results[1].final_value == Decimal("5000.00")


class TestConstraints:
    """Tests for allow_sell constraint handling."""

    def test_no_sell_constraint(self):
        """Asset overweight but allow_sell=False - redirects to other assets."""
        assets = [
            make_asset("Stocks", 50, 8000, allow_sell=False),  # Overweight
            make_asset("Bonds", 50, 2000, allow_sell=False),  # Underweight
        ]
        results = calculate_rebalance(assets, Decimal("0"))
        
        # Stocks can't sell, so no change. Bonds can't buy without contribution.
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("0")

    def test_allow_sell_rebalance(self):
        """Asset overweight with allow_sell=True - sells to rebalance."""
        assets = [
            make_asset("Stocks", 50, 8000, allow_sell=True),  # Overweight
            make_asset("Bonds", 50, 2000, allow_sell=True),  # Underweight
        ]
        results = calculate_rebalance(assets, Decimal("0"))
        
        # Rebalance to 50/50 of $10,000 = $5000 each
        assert results[0].buy_sell == Decimal("-3000.00")
        assert results[1].buy_sell == Decimal("3000.00")
        assert results[0].final_value == Decimal("5000.00")
        assert results[1].final_value == Decimal("5000.00")

    def test_mixed_sell_constraints(self):
        """Some assets allow sell, others don't."""
        assets = [
            make_asset("Stocks", 50, 8000, allow_sell=False),  # Overweight, can't sell
            make_asset("Bonds", 50, 2000, allow_sell=True),   # Underweight
        ]
        results = calculate_rebalance(assets, Decimal("2000"))
        
        # Stocks can't sell, stays at $8000. All $2000 goes to Bonds.
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("2000.00")

    def test_all_constrained_overweight(self):
        """All assets overweight, none allow sell - best effort allocation."""
        assets = [
            make_asset("A", 25, 5000, allow_sell=False),  # Overweight
            make_asset("B", 25, 5000, allow_sell=False),  # Overweight
            make_asset("C", 25, 0, allow_sell=False),     # Underweight
            make_asset("D", 25, 0, allow_sell=False),     # Underweight
        ]
        results = calculate_rebalance(assets, Decimal("1000"))
        
        # A and B overweight but can't sell. C and D get the contribution.
        assert results[0].buy_sell == Decimal("0")
        assert results[1].buy_sell == Decimal("0")
        # The $1000 should be split between C and D (equal weight)
        assert results[2].buy_sell + results[3].buy_sell == Decimal("1000.00")

    def test_cant_sell_more_than_owned(self):
        """Sell amount capped at current value."""
        assets = [
            make_asset("A", 90, 1000, allow_sell=True),  # Heavily underweight
            make_asset("B", 10, 9000, allow_sell=True),  # Heavily overweight
        ]
        results = calculate_rebalance(assets, Decimal("-9500"))
        
        # Try to withdraw $9500 from $10000. Can't sell more than owned.
        # B can only sell its $9000
        assert results[1].buy_sell >= Decimal("-9000")
        assert results[1].final_value >= Decimal("0")


class TestAutoContribution:
    """Tests for calculate_auto_contribution."""

    def test_auto_contribution_basic(self):
        """Calculate min contribution to balance without selling."""
        assets = [
            make_asset("Stocks", 60, 6000),
            make_asset("Bonds", 40, 2000),  # Underweight
        ]
        contribution = calculate_auto_contribution(assets)
        
        # Need to add enough so Bonds reaches 40% without selling Stocks
        # Stocks at $6000 = 60%, so total must be $10,000
        # Bonds needs $4000, currently $2000, so contribution = $2000
        assert contribution == Decimal("2000.00")

    def test_auto_contribution_already_balanced(self):
        """Returns 0 when already balanced."""
        assets = [
            make_asset("Stocks", 60, 6000),
            make_asset("Bonds", 40, 4000),
        ]
        contribution = calculate_auto_contribution(assets)
        assert contribution == Decimal("0.00")

    def test_auto_contribution_empty(self):
        """Empty portfolio returns 0."""
        contribution = calculate_auto_contribution([])
        assert contribution == Decimal("0")

    def test_auto_contribution_overweight(self):
        """One asset heavily overweight - calculates correct amount."""
        assets = [
            make_asset("Stocks", 50, 9000),  # Heavily overweight
            make_asset("Bonds", 50, 1000),   # Heavily underweight
        ]
        contribution = calculate_auto_contribution(assets)
        
        # Stocks at $9000 = 50% means total should be $18,000
        # Bonds needs $9000, currently $1000, so contribution = $8000
        assert contribution == Decimal("8000.00")

    def test_auto_contribution_zero_targets(self):
        """Zero target percentages returns 0."""
        assets = [
            make_asset("A", 0, 1000),
            make_asset("B", 0, 2000),
        ]
        contribution = calculate_auto_contribution(assets)
        assert contribution == Decimal("0")


class TestPrecision:
    """Tests for decimal precision and rounding."""

    def test_decimal_precision(self):
        """Large values maintain precision."""
        assets = [
            make_asset("Stocks", 60, 1234567.89),
            make_asset("Bonds", 40, 876543.21),
        ]
        results = calculate_rebalance(assets, Decimal("100000.00"))
        
        # Verify total adds up correctly
        total_final = sum(r.final_value for r in results)
        expected_total = Decimal("1234567.89") + Decimal("876543.21") + Decimal("100000.00")
        assert total_final == expected_total

    def test_rounding_distribution(self):
        """Rounding differences go to largest position."""
        # Create a scenario where rounding could cause issues
        assets = [
            make_asset("A", 33.33, 0),
            make_asset("B", 33.33, 0),
            make_asset("C", 33.34, 0),
        ]
        results = calculate_rebalance(assets, Decimal("100.00"))
        
        # Total buy_sell should equal contribution exactly
        total_buy_sell = sum(r.buy_sell for r in results)
        assert total_buy_sell == Decimal("100.00")

    def test_final_percentages_sum_to_100(self):
        """Final percentages should sum close to 100%."""
        assets = [
            make_asset("A", 40, 1000),
            make_asset("B", 35, 2000),
            make_asset("C", 25, 500),
        ]
        results = calculate_rebalance(assets, Decimal("1500"))
        
        total_pct = sum(r.final_pct for r in results)
        # Allow for rounding (99.99 to 100.01)
        assert Decimal("99.99") <= total_pct <= Decimal("100.01")

    def test_current_percentages_calculated(self):
        """Current percentages are calculated correctly."""
        assets = [
            make_asset("A", 50, 3000),
            make_asset("B", 50, 7000),
        ]
        results = calculate_rebalance(assets, Decimal("0"))
        
        assert results[0].current_pct == Decimal("30.00")
        assert results[1].current_pct == Decimal("70.00")
