import {
  Box,
  Button,
  CloseButton,
  createListCollection,
  Dialog,
  Flex,
  Heading,
  Portal,
  Select,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useCallback, useMemo, useState } from "react"
import {
  AggregatedAsset,
  Asset,
  Position,
  aggregatePositions,
  uploadFidelityCsv,
} from "../api"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (assets: Asset[]) => void
  existingAssetTypes: string[]
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  existingAssetTypes,
}: ImportModalProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter positions by selected account
  const filteredPositions = useMemo(() => {
    if (!selectedAccount) return positions
    return positions.filter((p) => p.account === selectedAccount)
  }, [positions, selectedAccount])

  // Separate mapped and unmapped positions
  const { mappedPositions, unmappedPositions } = useMemo(() => {
    const mapped: Position[] = []
    const unmapped: Position[] = []
    
    for (const pos of filteredPositions) {
      if (pos.mapped_asset || customMappings[pos.symbol]) {
        mapped.push(pos)
      } else {
        unmapped.push(pos)
      }
    }
    
    return { mappedPositions: mapped, unmappedPositions: unmapped }
  }, [filteredPositions, customMappings])

  // All available asset types (from existing portfolio + common types)
  const assetTypeOptions = useMemo(() => {
    const types = new Set(existingAssetTypes)
    // Add common types
    ;[
      "Domestic Equity",
      "Foreign Developed Equity",
      "Emerging Markets Equity",
      "Real Estate",
      "U.S Treasury Bonds",
      "US TIPS Bonds",
      "Total Bond",
    ].forEach((t) => types.add(t))
    return Array.from(types).sort()
  }, [existingAssetTypes])

  // Create collections for Select components
  const accountsCollection = useMemo(
    () => createListCollection({
      items: accounts.map((a) => ({ label: a, value: a })),
    }),
    [accounts]
  )

  const assetTypesCollection = useMemo(
    () => createListCollection({
      items: assetTypeOptions.map((t) => ({ label: t, value: t })),
    }),
    [assetTypeOptions]
  )

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await uploadFidelityCsv(file)
      setPositions(result.positions)
      setAccounts(result.accounts)
      setSelectedAccount(result.accounts[0] || "")
      setCustomMappings({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".csv")) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handleCustomMapping = useCallback((symbol: string, assetType: string) => {
    setCustomMappings((prev) => ({
      ...prev,
      [symbol]: assetType,
    }))
  }, [])

  const handleImport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const aggregated: AggregatedAsset[] = await aggregatePositions(
        filteredPositions,
        customMappings
      )
      
      // Convert to Asset format with 0 target_pct (user will set these)
      const assets: Asset[] = aggregated.map((a) => ({
        name: a.name,
        target_pct: 0,
        current_value: a.current_value,
        allow_sell: false,
      }))
      
      onImport(assets)
      onClose()
      
      // Reset state
      setPositions([])
      setAccounts([])
      setSelectedAccount("")
      setCustomMappings({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import")
    } finally {
      setIsLoading(false)
    }
  }, [filteredPositions, customMappings, onImport, onClose])

  const handleClose = useCallback(() => {
    onClose()
    setPositions([])
    setAccounts([])
    setSelectedAccount("")
    setCustomMappings({})
    setError(null)
  }, [onClose])

  const canImport = filteredPositions.length > 0 && unmappedPositions.length === 0

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="800px" maxH="90vh" overflow="auto">
            <Dialog.Header>
              <Dialog.Title>Import Fidelity Portfolio</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
            <Dialog.Body pb="6">
              {/* File Upload Dropzone */}
              {positions.length === 0 ? (
                <Box
                  border="2px dashed"
                  borderColor="brand.300"
                  borderRadius="lg"
                  p="8"
                  textAlign="center"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  bg="brand.50"
                  cursor="pointer"
                  _hover={{ borderColor: "brand.orange", bg: "white" }}
                  onClick={() => document.getElementById("csv-file-input")?.click()}
                >
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleFileInputChange}
                  />
                  <Text fontSize="3xl" mb="2">
                    📤
                  </Text>
                  <Text fontWeight="medium" color="brand.700">
                    {isLoading ? "Parsing..." : "Drop Fidelity CSV here or click to browse"}
                  </Text>
                  <Text fontSize="sm" color="brand.400" mt="1">
                    Export from Fidelity: Positions → Download
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap="6">
                  {/* Account Selector */}
                  {accounts.length > 1 && (
                    <Box>
                      <Text fontWeight="medium" mb="2" color="brand.700">
                        Select Account
                      </Text>
                      <Select.Root
                        collection={accountsCollection}
                        value={[selectedAccount]}
                        onValueChange={(e) => setSelectedAccount(e.value[0])}
                      >
                        <Select.HiddenSelect />
                        <Select.Control>
                          <Select.Trigger>
                            <Select.ValueText placeholder="Select account" />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {accountsCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                  <Select.ItemIndicator />
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>
                  )}

                  {/* Mapped Positions */}
                  {mappedPositions.length > 0 && (
                    <Box>
                      <Heading size="sm" color="brand.900" mb="3">
                        Mapped Positions ({mappedPositions.length})
                      </Heading>
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                            <Table.ColumnHeader>Description</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">Value</Table.ColumnHeader>
                            <Table.ColumnHeader>Asset Type</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {mappedPositions.map((pos) => (
                            <Table.Row key={`${pos.account}-${pos.symbol}`}>
                              <Table.Cell fontWeight="medium">{pos.symbol}</Table.Cell>
                              <Table.Cell fontSize="sm" color="brand.400">
                                {pos.description.slice(0, 30)}
                                {pos.description.length > 30 ? "..." : ""}
                              </Table.Cell>
                              <Table.Cell textAlign="right">
                                ${pos.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Table.Cell>
                              <Table.Cell color="green.600" fontWeight="medium">
                                {customMappings[pos.symbol] || pos.mapped_asset}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                  )}

                  {/* Unmapped Positions */}
                  {unmappedPositions.length > 0 && (
                    <Box>
                      <Heading size="sm" color="red.600" mb="3">
                        Unmapped Positions ({unmappedPositions.length}) - Assign categories below
                      </Heading>
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                            <Table.ColumnHeader>Description</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">Value</Table.ColumnHeader>
                            <Table.ColumnHeader>Assign To</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {unmappedPositions.map((pos) => (
                            <Table.Row key={`${pos.account}-${pos.symbol}`}>
                              <Table.Cell fontWeight="medium">{pos.symbol}</Table.Cell>
                              <Table.Cell fontSize="sm" color="brand.400">
                                {pos.description.slice(0, 30)}
                                {pos.description.length > 30 ? "..." : ""}
                              </Table.Cell>
                              <Table.Cell textAlign="right">
                                ${pos.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Table.Cell>
                              <Table.Cell>
                                <Select.Root
                                  collection={assetTypesCollection}
                                  size="sm"
                                  value={customMappings[pos.symbol] ? [customMappings[pos.symbol]] : []}
                                  onValueChange={(e) => handleCustomMapping(pos.symbol, e.value[0])}
                                >
                                  <Select.HiddenSelect />
                                  <Select.Control>
                                    <Select.Trigger>
                                      <Select.ValueText placeholder="Select type..." />
                                    </Select.Trigger>
                                    <Select.IndicatorGroup>
                                      <Select.Indicator />
                                    </Select.IndicatorGroup>
                                  </Select.Control>
                                  <Portal>
                                    <Select.Positioner>
                                      <Select.Content>
                                        {assetTypesCollection.items.map((item) => (
                                          <Select.Item key={item.value} item={item}>
                                            {item.label}
                                            <Select.ItemIndicator />
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Positioner>
                                  </Portal>
                                </Select.Root>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                  )}

                  {/* Summary */}
                  <Box bg="brand.50" p="4" borderRadius="md">
                    <Text fontSize="sm" color="brand.700">
                      <strong>Total:</strong> $
                      {filteredPositions
                        .reduce((sum, p) => sum + p.current_value, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {" • "}
                      <strong>{filteredPositions.length}</strong> positions
                      {unmappedPositions.length > 0 && (
                        <Text as="span" color="red.600">
                          {" • "}{unmappedPositions.length} need assignment
                        </Text>
                      )}
                    </Text>
                  </Box>
                </VStack>
              )}

              {error && (
                <Text color="red.600" mt="4">
                  {error}
                </Text>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Flex gap="3">
                {positions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPositions([])
                      setAccounts([])
                      setSelectedAccount("")
                      setCustomMappings({})
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                {positions.length > 0 && (
                  <Button
                    bg="brand.orange"
                    color="white"
                    _hover={{ bg: "brand.700" }}
                    onClick={handleImport}
                    disabled={!canImport || isLoading}
                  >
                    {isLoading ? "Importing..." : "Import Portfolio"}
                  </Button>
                )}
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
