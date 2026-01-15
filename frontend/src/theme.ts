import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#fffcf2" },   // Cream
          100: { value: "#f5f0e3" },
          200: { value: "#e6dfd0" },
          300: { value: "#ccc5b9" },  // Warm gray
          400: { value: "#8a8580" },
          500: { value: "#eb5e28" },  // Orange (primary)
          600: { value: "#d14f1e" },
          700: { value: "#403d39" },  // Charcoal
          800: { value: "#333028" },
          900: { value: "#252422" },  // Near black
          950: { value: "#1a1917" },
        },
      },
      fonts: {
        heading: { value: "'DM Sans', sans-serif" },
        body: { value: "'DM Sans', sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "{colors.brand.50}" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.300}" },
          subtle: { value: "{colors.brand.50}" },
          emphasized: { value: "{colors.brand.600}" },
          focusRing: { value: "{colors.brand.500}" },
        },
        bg: {
          DEFAULT: { value: "{colors.brand.50}" },
          muted: { value: "{colors.brand.300}" },
          subtle: { value: "{colors.brand.100}" },
          canvas: { value: "{colors.brand.50}" },
        },
        fg: {
          DEFAULT: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.400}" },
          subtle: { value: "{colors.brand.300}" },
        },
        border: {
          DEFAULT: { value: "{colors.brand.300}" },
          muted: { value: "{colors.brand.200}" },
        },
      },
    },
  },
  globalCss: {
    body: {
      bg: "brand.50",
      color: "brand.700",
    },
  },
})

export const system = createSystem(defaultConfig, config)
