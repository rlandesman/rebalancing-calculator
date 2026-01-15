import { Box, Flex, Text } from "@chakra-ui/react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Asset } from "../api"

interface AllocationChartProps {
  assets: Asset[]
}

const COLORS = [
  "#eb5e28",  // Orange (primary)
  "#403d39",  // Charcoal
  "#ccc5b9",  // Warm gray
  "#7d7a75",  // Medium gray
  "#5c5955",  // Dark gray
  "#9e5a3c",  // Muted orange
  "#b8860b",  // Dark goldenrod
  "#8b7355",  // Tan
]

export function AllocationChart({ assets }: AllocationChartProps) {
  const data = assets
    .filter((a) => a.target_pct > 0)
    .map((a, i) => ({
      name: a.name,
      value: a.target_pct,
      color: COLORS[i % COLORS.length],
    }))

  if (data.length === 0) {
    return (
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="brand.300"
        p="8"
        textAlign="center"
        color="brand.400"
      >
        No allocation data
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="brand.300"
      p="4"
    >
      <Box h="200px">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="#fffcf2"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Target"]}
              contentStyle={{
                backgroundColor: "#252422",
                border: "none",
                borderRadius: "8px",
                color: "#fffcf2",
              }}
              itemStyle={{ color: "#fffcf2" }}
              labelStyle={{ color: "#fffcf2" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      {/* Legend */}
      <Flex flexWrap="wrap" gap="2" mt="3" justifyContent="center">
        {data.map((entry, index) => (
          <Flex key={index} alignItems="center" gap="1" fontSize="xs">
            <Box
              w="10px"
              h="10px"
              borderRadius="sm"
              bg={entry.color}
              flexShrink={0}
            />
            <Text color="brand.700" whiteSpace="nowrap">
              {entry.name} ({entry.value}%)
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}
