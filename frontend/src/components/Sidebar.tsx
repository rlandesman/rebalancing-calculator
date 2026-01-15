import { Box, Button, Flex, Heading, Input, Text, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import {
  Asset,
  Preset,
  autoContribute,
  deletePortfolio,
  listPortfolios,
  loadPortfolio,
  savePortfolio,
} from "../api"

interface SidebarProps {
  presets: Preset[]
  selectedPreset: string
  contribution: number
  assets: Asset[]
  onPresetChange: (preset: string) => void
  onContributionChange: (value: number) => void
  onLoadPortfolio: (data: { assets: Asset[]; contribution: number }) => void
}

export function Sidebar({
  presets,
  selectedPreset,
  contribution,
  assets,
  onPresetChange,
  onContributionChange,
  onLoadPortfolio,
}: SidebarProps) {
  const [savedPortfolios, setSavedPortfolios] = useState<string[]>([])
  const [saveName, setSaveName] = useState("")
  const [selectedSaved, setSelectedSaved] = useState("")

  useEffect(() => {
    loadSavedList()
  }, [])

  const loadSavedList = async () => {
    const list = await listPortfolios()
    setSavedPortfolios(list)
  }

  const handleAutoCalculate = async () => {
    const amount = await autoContribute(assets)
    onContributionChange(amount)
  }

  const handleSave = async () => {
    if (!saveName.trim()) return
    await savePortfolio({
      name: saveName,
      assets,
      contribution,
    })
    setSaveName("")
    loadSavedList()
  }

  const handleLoad = async () => {
    if (!selectedSaved) return
    const data = await loadPortfolio(selectedSaved)
    onLoadPortfolio({ assets: data.assets, contribution: data.contribution })
  }

  const handleDelete = async () => {
    if (!selectedSaved) return
    await deletePortfolio(selectedSaved)
    setSelectedSaved("")
    loadSavedList()
  }

  return (
    <Box
      w="280px"
      bg="brand.900"
      color="brand.50"
      p="6"
      minH="100vh"
      flexShrink={0}
    >
      <Heading size="lg" mb="8" display="flex" alignItems="center" gap="2">
        📊 Rebalancer
      </Heading>

      {/* Preset Selector */}
      <Box mb="8">
        <Text fontWeight="semibold" mb="2" fontSize="sm" textTransform="uppercase" letterSpacing="wide">
          Portfolio Selection
        </Text>
        <Box
          as="select"
          w="full"
          p="2"
          bg="brand.800"
          border="1px solid"
          borderColor="brand.700"
          borderRadius="md"
          color="brand.50"
          value={selectedPreset}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPresetChange(e.target.value)}
          css={{
            "& option": {
              background: "#252422",
              color: "#fffcf2",
            },
          }}
        >
          <option value="Custom">Custom</option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Box>
      </Box>

      {/* Contribution */}
      <Box mb="8">
        <Text fontWeight="semibold" mb="2" fontSize="sm" textTransform="uppercase" letterSpacing="wide">
          Contribution Amount
        </Text>
        <Input
          type="number"
          value={contribution === 0 ? "" : contribution}
          placeholder="0"
          onChange={(e) => onContributionChange(parseFloat(e.target.value) || 0)}
          bg="brand.800"
          border="1px solid"
          borderColor="brand.700"
          mb="3"
          _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #eb5e28" }}
        />
        <Button
          w="full"
          bg="brand.500"
          color="brand.50"
          _hover={{ bg: "brand.600" }}
          onClick={handleAutoCalculate}
        >
          🎯 Auto Calculate
        </Button>
      </Box>

      {/* Save/Load */}
      <Box>
        <Text fontWeight="semibold" mb="2" fontSize="sm" textTransform="uppercase" letterSpacing="wide">
          Save / Load
        </Text>
        <VStack gap="2" align="stretch">
          <Flex gap="2">
            <Input
              placeholder="Portfolio name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              bg="brand.800"
              border="1px solid"
              borderColor="brand.700"
              size="sm"
              _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #eb5e28" }}
            />
            <Button
              size="sm"
              bg="brand.500"
              color="brand.50"
              _hover={{ bg: "brand.600" }}
              onClick={handleSave}
              flexShrink={0}
            >
              💾
            </Button>
          </Flex>

          {savedPortfolios.length > 0 && (
            <>
              <Box
                as="select"
                w="full"
                p="2"
                bg="brand.800"
                border="1px solid"
                borderColor="brand.700"
                borderRadius="md"
                fontSize="sm"
                value={selectedSaved}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSaved(e.target.value)}
                css={{
                  "& option": {
                    background: "#252422",
                    color: "#fffcf2",
                  },
                }}
              >
                <option value="">Select portfolio...</option>
                {savedPortfolios.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Box>
              <Flex gap="2">
                <Button
                  size="sm"
                  flex="1"
                  bg="brand.700"
                  color="brand.50"
                  _hover={{ bg: "brand.600" }}
                  onClick={handleLoad}
                  disabled={!selectedSaved}
                >
                  📂 Load
                </Button>
                <Button
                  size="sm"
                  flex="1"
                  bg="brand.700"
                  color="brand.50"
                  _hover={{ bg: "red.600" }}
                  onClick={handleDelete}
                  disabled={!selectedSaved}
                >
                  🗑️ Delete
                </Button>
              </Flex>
            </>
          )}
        </VStack>
      </Box>
    </Box>
  )
}
