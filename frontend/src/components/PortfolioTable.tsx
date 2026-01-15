import { Box, Button, Flex, Input, Table } from "@chakra-ui/react"
import { Asset, AssetResult } from "../api"

interface PortfolioTableProps {
  assets: Asset[]
  results: AssetResult[]
  onAssetUpdate: (index: number, updates: Partial<Asset>) => void
  onAddAsset: () => void
  onRemoveAsset: (index: number) => void
}

export function PortfolioTable({
  assets,
  results,
  onAssetUpdate,
  onAddAsset,
  onRemoveAsset,
}: PortfolioTableProps) {
  const getResult = (index: number): AssetResult | undefined => {
    return results[index]
  }

  return (
    <Box>
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="brand.300"
        overflow="hidden"
      >
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row bg="brand.200">
              <Table.ColumnHeader color="brand.900" fontWeight="semibold">Asset</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="center">Target %</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="right">Current Value</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="center">Current %</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="center">Allow Sell</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="right">Buy/Sell</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="right">Final Value</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" textAlign="center">Final %</Table.ColumnHeader>
              <Table.ColumnHeader color="brand.900" fontWeight="semibold" w="50px"></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {assets.map((asset, index) => {
              const result = getResult(index)
              const buySell = result?.buy_sell ?? 0

              return (
                <Table.Row key={index} _hover={{ bg: "brand.100" }}>
                  <Table.Cell>
                    <Input
                      size="sm"
                      value={asset.name}
                      onChange={(e) => onAssetUpdate(index, { name: e.target.value })}
                      bg="transparent"
                      border="none"
                      _focus={{ bg: "brand.50", borderColor: "brand.500" }}
                      fontWeight="medium"
                      color="brand.900"
                    />
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Box
                      as="select"
                      value={asset.target_pct}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        onAssetUpdate(index, { target_pct: parseInt(e.target.value) })
                      }
                      bg="transparent"
                      border="1px solid"
                      borderColor="brand.300"
                      borderRadius="md"
                      px="2"
                      py="1"
                      fontSize="sm"
                      color="brand.900"
                    >
                      {Array.from({ length: 101 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}%
                        </option>
                      ))}
                    </Box>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Input
                      size="sm"
                      type="number"
                      value={asset.current_value}
                      onChange={(e) =>
                        onAssetUpdate(index, { current_value: parseFloat(e.target.value) || 0 })
                      }
                      bg="transparent"
                      border="1px solid"
                      borderColor="brand.300"
                      textAlign="right"
                      w="100px"
                      _focus={{ bg: "brand.50", borderColor: "brand.500" }}
                      color="brand.900"
                    />
                  </Table.Cell>
                  <Table.Cell textAlign="center" color="brand.700">
                    {result?.current_pct.toFixed(1) ?? "0.0"}%
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <input
                      type="checkbox"
                      checked={asset.allow_sell}
                      onChange={(e) => onAssetUpdate(index, { allow_sell: e.target.checked })}
                      style={{ width: "18px", height: "18px", accentColor: "#eb5e28" }}
                    />
                  </Table.Cell>
                  <Table.Cell
                    textAlign="right"
                    fontWeight="bold"
                    fontFamily="mono"
                    color={buySell > 0 ? "green.600" : buySell < 0 ? "red.600" : "brand.700"}
                  >
                    {buySell >= 0 ? "+" : ""}${buySell.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono" color="brand.900">
                    ${(result?.final_value ?? 0).toFixed(2)}
                  </Table.Cell>
                  <Table.Cell textAlign="center" color="brand.700">
                    {result?.final_pct.toFixed(1) ?? "0.0"}%
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="red.500"
                      _hover={{ bg: "red.50" }}
                      onClick={() => onRemoveAsset(index)}
                    >
                      ✕
                    </Button>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
      <Flex mt="4">
        <Button
          size="sm"
          bg="brand.500"
          color="brand.50"
          _hover={{ bg: "brand.600" }}
          onClick={onAddAsset}
        >
          + Add Asset
        </Button>
      </Flex>
    </Box>
  )
}
