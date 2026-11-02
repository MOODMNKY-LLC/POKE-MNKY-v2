/**
 * Hex equivalents of `--background` in app/globals.css (`:root` and `.dark`).
 * Browser chrome (theme-color meta, manifest colors) cannot read OKLCH custom properties.
 */
export const PWA_THEME_COLORS = {
  light: '#fffafa',
  dark: '#070503',
} as const
