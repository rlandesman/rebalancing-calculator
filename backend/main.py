"""FastAPI backend for Portfolio Rebalancing Calculator."""

from decimal import Decimal
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from calculator import AssetAllocation, calculate_rebalance, calculate_auto_contribution
from presets import PRESETS, get_preset
from storage import save_portfolio, load_portfolio, list_portfolios, delete_portfolio
from csv_parser import parse_fidelity_csv, load_etf_mapping, filter_positions_by_account, aggregate_by_asset_type, CSVParseError

app = FastAPI(title="Portfolio Rebalancing Calculator API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class AssetInput(BaseModel):
    name: str
    target_pct: float
    current_value: float
    allow_sell: bool = False


class CalculateRequest(BaseModel):
    assets: list[AssetInput]
    contribution: float


class AssetResult(BaseModel):
    name: str
    target_pct: float
    current_value: float
    current_pct: float
    allow_sell: bool
    buy_sell: float
    final_value: float
    final_pct: float


class CalculateResponse(BaseModel):
    assets: list[AssetResult]
    total_current: float
    total_final: float
    total_target_pct: float


class AutoContributeRequest(BaseModel):
    assets: list[AssetInput]


class AutoContributeResponse(BaseModel):
    contribution: float


class PresetAsset(BaseModel):
    name: str
    target_pct: int


class Preset(BaseModel):
    name: str
    assets: list[PresetAsset]


class PortfolioData(BaseModel):
    name: str
    assets: list[AssetInput]
    contribution: float = 0.0


# API Endpoints

@app.get("/api/presets", response_model=list[Preset])
def get_presets():
    """Get all preset portfolios."""
    return PRESETS


@app.get("/api/presets/{name}", response_model=Preset)
def get_preset_by_name(name: str):
    """Get a specific preset by name."""
    preset = get_preset(name)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset


@app.post("/api/calculate", response_model=CalculateResponse)
def calculate(request: CalculateRequest):
    """Calculate rebalancing amounts."""
    allocations = [
        AssetAllocation(
            name=a.name,
            target_pct=Decimal(str(a.target_pct)),
            current_value=Decimal(str(a.current_value)),
            allow_sell=a.allow_sell,
        )
        for a in request.assets
    ]
    
    results = calculate_rebalance(allocations, Decimal(str(request.contribution)))
    
    total_current = sum(float(r.current_value) for r in results)
    total_final = sum(float(r.final_value) for r in results)
    total_target_pct = sum(float(r.target_pct) for r in results)
    
    return CalculateResponse(
        assets=[
            AssetResult(
                name=r.name,
                target_pct=float(r.target_pct),
                current_value=float(r.current_value),
                current_pct=float(r.current_pct),
                allow_sell=r.allow_sell,
                buy_sell=float(r.buy_sell),
                final_value=float(r.final_value),
                final_pct=float(r.final_pct),
            )
            for r in results
        ],
        total_current=total_current,
        total_final=total_final,
        total_target_pct=total_target_pct,
    )


@app.post("/api/auto-contribute", response_model=AutoContributeResponse)
def auto_contribute(request: AutoContributeRequest):
    """Calculate minimum contribution to perfectly balance portfolio."""
    allocations = [
        AssetAllocation(
            name=a.name,
            target_pct=Decimal(str(a.target_pct)),
            current_value=Decimal(str(a.current_value)),
            allow_sell=a.allow_sell,
        )
        for a in request.assets
    ]
    
    contribution = calculate_auto_contribution(allocations)
    
    return AutoContributeResponse(contribution=float(contribution))


@app.get("/api/portfolios", response_model=list[str])
def get_portfolios():
    """List all saved portfolios."""
    return list_portfolios()


@app.post("/api/portfolios")
def save_portfolio_endpoint(portfolio: PortfolioData):
    """Save a portfolio."""
    data = {
        "name": portfolio.name,
        "assets": [a.model_dump() for a in portfolio.assets],
        "contribution": portfolio.contribution,
    }
    save_portfolio(portfolio.name, data)
    return {"status": "saved", "name": portfolio.name}


@app.get("/api/portfolios/{name}")
def get_portfolio(name: str):
    """Load a saved portfolio."""
    data = load_portfolio(name)
    if not data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return data


@app.delete("/api/portfolios/{name}")
def delete_portfolio_endpoint(name: str):
    """Delete a saved portfolio."""
    if delete_portfolio(name):
        return {"status": "deleted", "name": name}
    raise HTTPException(status_code=404, detail="Portfolio not found")


# CSV Import Endpoints

class Position(BaseModel):
    account: str
    symbol: str
    description: str
    current_value: float
    mapped_asset: str | None


class ParsedCSVResponse(BaseModel):
    accounts: list[str]
    positions: list[Position]
    mapping: dict[str, str]


class AggregateRequest(BaseModel):
    positions: list[Position]
    custom_mappings: dict[str, str] = {}


class AggregatedAsset(BaseModel):
    name: str
    current_value: float


@app.post("/api/import/fidelity", response_model=ParsedCSVResponse)
async def import_fidelity_csv(file: UploadFile = File(...)):
    """Parse uploaded Fidelity CSV and return structured data."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400, 
            detail="Please upload a CSV file. The file must have a .csv extension."
        )
    
    content = await file.read()
    
    # Check file size (reject if too small - likely empty)
    if len(content) < 10:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file appears to be empty or too small."
        )
    
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Could not read the file. Please ensure it's a valid text/CSV file."
            )
    
    try:
        result = parse_fidelity_csv(csv_text)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return ParsedCSVResponse(
        accounts=result["accounts"],
        positions=[Position(**p) for p in result["positions"]],
        mapping=result["mapping"],
    )


@app.get("/api/import/mapping")
def get_etf_mapping_endpoint():
    """Get current ETF mapping configuration."""
    config = load_etf_mapping()
    return {
        "mappings": config.get("mappings", {}),
        "ignore": config.get("ignore", []),
    }


@app.post("/api/import/aggregate", response_model=list[AggregatedAsset])
def aggregate_positions(request: AggregateRequest):
    """Aggregate positions by asset type with optional custom mappings."""
    positions = [p.model_dump() for p in request.positions]
    result = aggregate_by_asset_type(positions, request.custom_mappings)
    return [AggregatedAsset(**a) for a in result]
