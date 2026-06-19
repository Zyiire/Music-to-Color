export function toCSSVars(palette: string[]): string {
    return palette.map((hex, i) =>
        `  --color-palette-${i + 1}: ${hex};`
      ).join('\n')
}

export function toTailwind(palette: string[]): string {
    const colors = palette.reduce((acc, hex, i) => ({
      ...acc, [`palette-${i + 1}`]: hex
    }), {})
    return JSON.stringify({ theme: { extend: { colors } } }, null, 2)
  }
  
  export function toDesignTokens(palette: string[]): string {
    const tokens = palette.reduce((acc, hex, i) => ({
      ...acc,
      [`palette-${i + 1}`]: { $value: hex, $type: 'color' }
    }), {})
    return JSON.stringify(tokens, null, 2)
  }