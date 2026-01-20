# Portfolio Rebalancing Calculator

A React + FastAPI portfolio rebalancing calculator that helps you determine how much to buy or sell of each asset to reach your target allocation.

This app is not financial advice; it merely helps with rebalancing portfolios, which some [Bogleheads](https://www.bogleheads.org/wiki/Rebalancing) do once a year.

It is **heavily** inspired by this online rebalancing calculator: <https://www.richsnapp.com/blog/2020/09-25-rebalancing-your-lazy-portfolio>

<img width="1725" height="660" alt="Screenshot 2026-01-15 at 2 06 48 PM" src="https://github.com/user-attachments/assets/06e5169e-7de8-4dd6-9791-dfdc74cff518" />

## Key Highlights

- **Fully Offline** – All calculations run locally; no external API calls, your data never leaves your machine
- **Fidelity CSV Import** – Upload your Fidelity portfolio export and automatically map ETFs to asset categories
- **Configurable ETF Mapping** – Customize symbol-to-asset-type mapping via `backend/etf_mapping.yaml`

## Features

- **Preset Portfolios**: Rick Ferri 40/40/20, 60/40, 80/20, Coffeehouse, California Chill
- **Custom Portfolios**: Add/remove assets and set target percentages
- **Auto-Calculate**: Compute minimum contribution to perfectly balance your portfolio
- **Interactive Table**: Edit assets, target %, current values, and buy/sell toggles
- **Pie Chart**: Visual representation of target allocation
- **Fidelity Import**: Upload CSV exports from Fidelity with automatic ETF categorization
- **Save/Load**: Persist portfolios locally as JSON files
- **CSV Export**: Download portfolio data for spreadsheets

## Quick Start

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

- **Frontend**: React 18 + Vite + Chakra UI v3 + Recharts
- **Backend**: FastAPI (Python 3.11)
- **Storage**: Local JSON files (persisted via Docker volume)

## Fidelity CSV Import

1. Log into Fidelity and navigate to **Positions**
2. Click the **three dots** -> **Download`** to export your positions as CSV
3. In the calculator, click **Upload Portfolio**
4. Select your account (if you have multiple)
5. Any unmapped ETF symbols will prompt you to assign an asset category
6. Click **Import Portfolio** to load the values

### Customizing ETF Mappings

Edit `backend/etf_mapping.yaml` to add or modify symbol-to-asset-type mappings:

```yaml
mappings:
  VTI: Domestic Equity
  VEA: Foreign Developed Equity
  # Add your own mappings here

ignore:
  - SPAXX  # Money market funds to skip
```

## Usage

1. Select a preset portfolio or create a custom one
2. Enter the current value of each asset (or import from Fidelity CSV)
3. Enter your contribution amount (positive to add, negative to withdraw)
4. Optionally use "Auto Calculate" to find the minimum contribution needed
5. Toggle "Allow Sell" for assets you're willing to sell
6. View the calculated buy/sell amounts and final allocation
7. Export to CSV or save your portfolio for later

## Known Limitations

- **Single account import** – Only one account can be imported at a time from Fidelity CSV
- **Fidelity-only CSV format** – CSV import only works with Fidelity's export format; other brokerages not supported
- **Target date funds** – Mixed-asset funds (e.g., Fidelity Freedom 2060, BlackRock LifePath) don't map cleanly to single asset categories and require manual assignment
- **ETF-focused mappings** – The default `etf_mapping.yaml` covers common Vanguard/Schwab/iShares ETFs; mutual fund equivalents may need manual mapping
- **No tax-lot awareness** – The calculator doesn't consider tax implications or specific lot selection when suggesting sells
- **Rounding to cents** – Buy/sell amounts are rounded to $0.01; small rounding differences may occur
