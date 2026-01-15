// API client for the rebalancing calculator backend

const API_BASE = '/api';

export interface Asset {
  name: string;
  target_pct: number;
  current_value: number;
  allow_sell: boolean;
}

export interface AssetResult extends Asset {
  current_pct: number;
  buy_sell: number;
  final_value: number;
  final_pct: number;
}

export interface CalculateResponse {
  assets: AssetResult[];
  total_current: number;
  total_final: number;
  total_target_pct: number;
}

export interface Preset {
  name: string;
  assets: { name: string; target_pct: number }[];
}

export interface Portfolio {
  name: string;
  assets: Asset[];
  contribution: number;
}

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch(`${API_BASE}/presets`);
  if (!response.ok) throw new Error('Failed to fetch presets');
  return response.json();
}

export async function calculate(assets: Asset[], contribution: number): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets, contribution }),
  });
  if (!response.ok) throw new Error('Failed to calculate');
  return response.json();
}

export async function autoContribute(assets: Asset[]): Promise<number> {
  const response = await fetch(`${API_BASE}/auto-contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets }),
  });
  if (!response.ok) throw new Error('Failed to auto-calculate contribution');
  const data = await response.json();
  return data.contribution;
}

export async function listPortfolios(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/portfolios`);
  if (!response.ok) throw new Error('Failed to list portfolios');
  return response.json();
}

export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  const response = await fetch(`${API_BASE}/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
  if (!response.ok) throw new Error('Failed to save portfolio');
}

export async function loadPortfolio(name: string): Promise<Portfolio> {
  const response = await fetch(`${API_BASE}/portfolios/${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error('Failed to load portfolio');
  return response.json();
}

export async function deletePortfolio(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/portfolios/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete portfolio');
}

export function exportToCsv(results: AssetResult[], contribution: number): string {
  const headers = ['Asset', 'Target %', 'Current Value', 'Current %', 'Buy/Sell', 'Final Value', 'Final %'];
  const rows = results.map(r => [
    r.name,
    `${r.target_pct}%`,
    `$${r.current_value.toFixed(2)}`,
    `${r.current_pct.toFixed(1)}%`,
    `$${r.buy_sell >= 0 ? '+' : ''}${r.buy_sell.toFixed(2)}`,
    `$${r.final_value.toFixed(2)}`,
    `${r.final_pct.toFixed(1)}%`,
  ]);
  
  const totalCurrent = results.reduce((sum, r) => sum + r.current_value, 0);
  const totalFinal = results.reduce((sum, r) => sum + r.final_value, 0);
  const totalTargetPct = results.reduce((sum, r) => sum + r.target_pct, 0);
  
  rows.push([]);
  rows.push(['Totals', `${totalTargetPct}%`, `$${totalCurrent.toFixed(2)}`, '', `$${contribution.toFixed(2)}`, `$${totalFinal.toFixed(2)}`, '']);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Fidelity CSV Import Types and Functions

export interface Position {
  account: string;
  symbol: string;
  description: string;
  current_value: number;
  mapped_asset: string | null;
}

export interface ParsedCSVResponse {
  accounts: string[];
  positions: Position[];
  mapping: Record<string, string>;
}

export interface AggregatedAsset {
  name: string;
  current_value: number;
}

export async function uploadFidelityCsv(file: File): Promise<ParsedCSVResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/import/fidelity`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    // Read body as text first, then try to parse as JSON
    const responseText = await response.text();
    let errorMessage = 'Failed to parse CSV';
    
    try {
      const errorBody = JSON.parse(responseText);
      // FastAPI returns errors as { detail: "message" }
      if (errorBody.detail) {
        errorMessage = errorBody.detail;
      }
    } catch {
      // Not JSON, use the text directly if available
      if (responseText) {
        errorMessage = responseText;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function getEtfMapping(): Promise<{ mappings: Record<string, string>; ignore: string[] }> {
  const response = await fetch(`${API_BASE}/import/mapping`);
  if (!response.ok) throw new Error('Failed to fetch ETF mapping');
  return response.json();
}

export async function aggregatePositions(
  positions: Position[],
  customMappings: Record<string, string> = {}
): Promise<AggregatedAsset[]> {
  const response = await fetch(`${API_BASE}/import/aggregate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions, custom_mappings: customMappings }),
  });
  
  if (!response.ok) throw new Error('Failed to aggregate positions');
  return response.json();
}
