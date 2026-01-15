import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react"
import { useCallback, useEffect, useState } from "react"
import {
  Asset,
  AssetResult,
  Preset,
  calculate,
  getPresets,
} from "./api"
import { AllocationChart } from "./components/AllocationChart"
import { ExportButtons } from "./components/ExportButtons"
import { PortfolioTable } from "./components/PortfolioTable"
import { Sidebar } from "./components/Sidebar"

function App() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [assets, setAssets] = useState<Asset[]>([])
  const [contribution, setContribution] = useState<number>(0)
  const [results, setResults] = useState<AssetResult[]>([])
  const [totals, setTotals] = useState({
    current: 0,
    final: 0,
    targetPct: 0,
  })

  // Load presets on mount
  useEffect(() => {
    getPresets().then((data) => {
      setPresets(data)
      if (data.length > 0) {
        applyPreset(data[0])
        setSelectedPreset(data[0].name)
      }
    })
  }, [])

  // Calculate results when assets or contribution changes
  useEffect(() => {
    if (assets.length === 0) return
    
    calculate(assets, contribution).then((data) => {
      setResults(data.assets)
      setTotals({
        current: data.total_current,
        final: data.total_final,
        targetPct: data.total_target_pct,
      })
    })
  }, [assets, contribution])

  const applyPreset = useCallback((preset: Preset) => {
    setAssets(
      preset.assets.map((a) => ({
        name: a.name,
        target_pct: a.target_pct,
        current_value: 0,
        allow_sell: false,
      }))
    )
    setSelectedPreset(preset.name)
  }, [])

  const handlePresetChange = useCallback(
    (presetName: string) => {
      const preset = presets.find((p) => p.name === presetName)
      if (preset) {
        applyPreset(preset)
      }
    },
    [presets, applyPreset]
  )

  const handleAssetUpdate = useCallback((index: number, updates: Partial<Asset>) => {
    setAssets((prev) => {
      const newAssets = [...prev]
      newAssets[index] = { ...newAssets[index], ...updates }
      return newAssets
    })
    setSelectedPreset("Custom")
  }, [])

  const handleAddAsset = useCallback(() => {
    setAssets((prev) => [
      ...prev,
      { name: "New Asset", target_pct: 0, current_value: 0, allow_sell: false },
    ])
    setSelectedPreset("Custom")
  }, [])

  const handleRemoveAsset = useCallback((index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index))
    setSelectedPreset("Custom")
  }, [])

  const handleLoadPortfolio = useCallback((data: { assets: Asset[]; contribution: number }) => {
    setAssets(data.assets)
    setContribution(data.contribution)
    setSelectedPreset("Custom")
  }, [])

  const handleImportPortfolio = useCallback((importedAssets: Asset[]) => {
    setAssets((currentAssets) => {
      // Build lookup of imported values by asset name
      const importedMap = new Map(importedAssets.map(a => [a.name, a.current_value]))
      
      // Update existing assets with imported values
      const updatedAssets = currentAssets.map(asset => ({
        ...asset,
        current_value: importedMap.get(asset.name) ?? asset.current_value
      }))
      
      // Add any new asset types from import that don't exist
      const existingNames = new Set(currentAssets.map(a => a.name))
      const newAssets = importedAssets
        .filter(a => !existingNames.has(a.name))
        .map(a => ({ ...a, target_pct: 0 }))
      
      return [...updatedAssets, ...newAssets]
    })
  }, [])

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Sidebar
        presets={presets}
        selectedPreset={selectedPreset}
        contribution={contribution}
        assets={assets}
        onPresetChange={handlePresetChange}
        onContributionChange={setContribution}
        onLoadPortfolio={handleLoadPortfolio}
      />

      {/* Main content */}
      <Box flex="1" p="8" bg="brand.50">
        <Heading size="2xl" color="brand.900" mb="2">
          Portfolio Rebalancing Calculator
        </Heading>
        <Text color="brand.700" mb="8">
          Calculate how to rebalance your investments to match your target allocation.
        </Text>

        <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap="8" mb="8">
          {/* Pie Chart */}
          <Box>
            <Heading size="md" color="brand.900" mb="4">
              Target Allocation
            </Heading>
            <AllocationChart assets={assets} />
          </Box>

          {/* Assets Table */}
          <Box>
            <Heading size="md" color="brand.900" mb="4">
              Assets
            </Heading>
            <PortfolioTable
              assets={assets}
              results={results}
              onAssetUpdate={handleAssetUpdate}
              onAddAsset={handleAddAsset}
              onRemoveAsset={handleRemoveAsset}
            />
          </Box>
        </Grid>

        {/* Totals */}
        <Grid templateColumns="repeat(4, 1fr)" gap="4" mb="8">
          <Box bg="white" p="4" borderRadius="lg" borderWidth="1px" borderColor="brand.300">
            <Text fontSize="sm" color="brand.400">Total Target %</Text>
            <Text fontSize="2xl" fontWeight="bold" color="brand.900">
              {totals.targetPct}%
            </Text>
          </Box>
          <Box bg="white" p="4" borderRadius="lg" borderWidth="1px" borderColor="brand.300">
            <Text fontSize="sm" color="brand.400">Total Current</Text>
            <Text fontSize="2xl" fontWeight="bold" color="brand.900">
              ${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </Box>
          <Box bg="white" p="4" borderRadius="lg" borderWidth="1px" borderColor="brand.300">
            <Text fontSize="sm" color="brand.400">Contribution</Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={contribution >= 0 ? "green.600" : "red.600"}
            >
              {contribution >= 0 ? "+" : ""}${contribution.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </Box>
          <Box bg="white" p="4" borderRadius="lg" borderWidth="1px" borderColor="brand.300">
            <Text fontSize="sm" color="brand.400">Total Final</Text>
            <Text fontSize="2xl" fontWeight="bold" color="brand.900">
              ${totals.final.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </Box>
        </Grid>

        {/* Export */}
        <ExportButtons
          results={results}
          contribution={contribution}
          assets={assets}
          onImportPortfolio={handleImportPortfolio}
        />
      </Box>
    </Flex>
  )
}

export default App
