import { Button, Flex } from "@chakra-ui/react"
import { useState } from "react"
import { Asset, AssetResult, exportToCsv } from "../api"
import { ImportModal } from "./ImportModal"

interface ExportButtonsProps {
  results: AssetResult[]
  contribution: number
  assets: Asset[]
  onImportPortfolio?: (assets: Asset[]) => void
}

export function ExportButtons({ results, contribution, assets, onImportPortfolio }: ExportButtonsProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const handleCsvDownload = () => {
    const csv = exportToCsv(results, contribution)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "portfolio_rebalance.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleTabDelimited = () => {
    const headers = ["Asset", "Target %", "Current Value", "Current %", "Buy/Sell", "Final Value", "Final %"]
    const rows = results.map((r) => [
      r.name,
      `${r.target_pct}%`,
      `$${r.current_value.toFixed(2)}`,
      `${r.current_pct.toFixed(1)}%`,
      `$${r.buy_sell >= 0 ? "+" : ""}${r.buy_sell.toFixed(2)}`,
      `$${r.final_value.toFixed(2)}`,
      `${r.final_pct.toFixed(1)}%`,
    ])
    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n")
    
    // Copy to clipboard
    navigator.clipboard.writeText(tsv).then(() => {
      alert("Copied to clipboard! Paste into your spreadsheet.")
    })
  }

  const handleImport = (importedAssets: Asset[]) => {
    if (onImportPortfolio) {
      onImportPortfolio(importedAssets)
    }
  }

  const existingAssetTypes = assets.map((a) => a.name)

  return (
    <>
      <Flex gap="4">
        <Button
          bg="brand.500"
          color="brand.50"
          _hover={{ bg: "brand.600" }}
          onClick={handleCsvDownload}
        >
          📥 Export to CSV
        </Button>
        <Button
          bg="brand.700"
          color="brand.50"
          _hover={{ bg: "brand.600" }}
          onClick={handleTabDelimited}
        >
          📋 Copy Tab-Delimited
        </Button>
        <Button
          bg="brand.orange"
          color="white"
          _hover={{ bg: "brand.700" }}
          onClick={() => setIsImportModalOpen(true)}
        >
          📤 Upload Portfolio
        </Button>
      </Flex>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        existingAssetTypes={existingAssetTypes}
      />
    </>
  )
}
