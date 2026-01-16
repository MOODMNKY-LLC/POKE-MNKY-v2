# PokéAPI Documentation Site - Theming Guide

**Date**: January 15, 2026  
**Purpose**: Instructions for theming the PokéAPI documentation site to match the POKE MNKY app design  
**Status**: Reference Guide

---

## Overview

The PokéAPI documentation site (`pokeapi-docs`) runs as a Docker container on the server and can be themed to match the POKE MNKY app's design system. This guide provides step-by-step instructions for accessing and customizing the documentation site's appearance.

---

## Server Access

### SSH Connection

To access the server and modify the documentation site:

```bash
ssh moodmnky@10.3.0.119
# Password: MOODMNKY88
```

### Navigate to Documentation Source

```bash
cd /home/moodmnky/POKE-MNKY/tools/pokeapi-docs
```

---

## File Structure

The documentation site source files are located at:

```
/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/
├── src/
│   ├── App.js                    # Main app component
│   ├── global.scss               # Global styles (PRIMARY THEME FILE)
│   ├── constants.scss            # Color/theme constants (COLOR DEFINITIONS)
│   └── components/
│       ├── Header/
│       │   └── Header.js         # Header component (branding)
│       └── Footer/
│           └── Footer.js         # Footer component (branding)
```

---

## App Design System Reference

### Color Palette

**Light Theme**:
- **Primary (Pokémon Red)**: `#CC0000` → `oklch(0.548 0.217 27)`
- **Accent (Pokémon Blue)**: `#3B4CCA` → `oklch(0.485 0.186 264)`
- **Background**: `oklch(0.99 0.005 20)` (Pure white)
- **Foreground**: `oklch(0.2 0.02 20)` (Deep charcoal)
- **Muted**: `oklch(0.97 0.005 20)` (Light gray)

**Dark Theme**:
- **Primary (Pokémon Gold)**: `#B3A125` → `oklch(0.703 0.106 92)`
- **Accent (Pokémon Yellow)**: `#FFDE00` → `oklch(0.885 0.176 95)`
- **Background**: `oklch(0.12 0.01 80)` (Deep black)
- **Foreground**: `oklch(0.97 0.005 80)` (Bright text)
- **Card**: `oklch(0.16 0.015 80)` (Dark gray)

### Typography

- **Primary Font**: Fredoka (rounded, friendly)
- **Marker Font**: Permanent Marker (for headings/branding)
- **Mono Font**: Geist Mono (for code)

### Border Radius

- **Default**: `0.75rem` (12px)

---

## Theming Steps

### 1. Edit Color Constants

Edit `src/constants.scss` to update color variables:

```scss
// Example: Update primary color to match app
$primary-color: #CC0000; // Pokémon Red
$accent-color: #3B4CCA;  // Pokémon Blue
$background-light: #FFFFFF;
$background-dark: #1a1a1a;
```

### 2. Update Global Styles

Edit `src/global.scss` to apply theme colors:

```scss
// Example: Apply primary color to links
a {
  color: $primary-color;
  
  &:hover {
    color: darken($primary-color, 10%);
  }
}

// Example: Apply background colors
body {
  background-color: $background-light;
  
  &.dark-mode {
    background-color: $background-dark;
  }
}
```

### 3. Update Header/Footer Branding

Edit `src/components/Header/Header.js` and `src/components/Footer/Footer.js` to match app branding:

- Update logo references
- Match header/footer styling
- Apply app color scheme

### 4. Rebuild Container

After making changes, rebuild and restart the Docker container:

```bash
# Navigate to Docker Compose directory
cd /home/moodmnky/POKE-MNKY

# Rebuild the documentation container
docker compose build pokeapi-docs

# Restart the container
docker compose up -d pokeapi-docs
```

### 5. Verify Changes

Check that the documentation site reflects your changes:

```bash
# View container logs to ensure it started correctly
docker compose logs pokeapi-docs

# Test the site (from your local machine)
curl https://pokeapi-docs.moodmnky.com
```

---

## Key Files for Theming

### `src/constants.scss`

This file contains all color, spacing, and typography constants. Update these values to match the app's design system.

**Key Variables to Update**:
- Primary colors
- Accent colors
- Background colors (light/dark)
- Text colors
- Border colors
- Spacing values
- Typography settings

### `src/global.scss`

This file contains global styles that apply across the entire documentation site. Update this to:
- Apply color variables from `constants.scss`
- Set global typography
- Define base element styles
- Configure dark mode styles

### `src/components/Header/Header.js`

Update this file to:
- Match app header styling
- Update logo/branding
- Apply app color scheme
- Match navigation styling

### `src/components/Footer/Footer.js`

Update this file to:
- Match app footer styling
- Update branding/links
- Apply app color scheme

---

## Testing Theming Changes

### Local Testing

1. Make changes to source files
2. Rebuild container: `docker compose build pokeapi-docs`
3. Restart container: `docker compose up -d pokeapi-docs`
4. View logs: `docker compose logs -f pokeapi-docs`
5. Test locally: `http://10.3.0.119:8090` (if port exposed) or `https://pokeapi-docs.moodmnky.com`

### Production Verification

1. Verify site loads: `curl https://pokeapi-docs.moodmnky.com`
2. Check iframe integration in app: Visit `/docs/api` route
3. Test dark mode: Toggle theme in app and verify docs site adapts (if dark mode supported)
4. Verify responsive design: Test on mobile devices

---

## Common Theming Tasks

### Match App Primary Color

```scss
// In constants.scss
$primary-color: #CC0000; // Pokémon Red

// In global.scss
.primary {
  color: $primary-color;
}

a {
  color: $primary-color;
}
```

### Match App Typography

```scss
// In global.scss
body {
  font-family: 'Fredoka', ui-rounded, system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: 'Permanent Marker', cursive;
}
```

### Match App Border Radius

```scss
// In constants.scss
$border-radius: 0.75rem;

// In global.scss
.card, .button {
  border-radius: $border-radius;
}
```

---

## Troubleshooting

### Changes Not Appearing

1. **Verify rebuild**: Ensure `docker compose build` completed successfully
2. **Check container restart**: Verify `docker compose up -d` restarted the container
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check logs**: `docker compose logs pokeapi-docs` for errors

### Container Won't Start

1. **Check syntax**: Verify SCSS/JS syntax is correct
2. **View logs**: `docker compose logs pokeapi-docs` for error messages
3. **Verify file paths**: Ensure file paths in edits are correct
4. **Check permissions**: Ensure files are readable

### Styling Conflicts

1. **Check CSS specificity**: Ensure your styles override defaults
2. **Verify variable names**: Ensure variable names match between files
3. **Check import order**: Ensure `constants.scss` is imported before `global.scss`

---

## Best Practices

1. **Backup Before Changes**: Copy files before editing
2. **Test Incrementally**: Make small changes and test frequently
3. **Use Variables**: Always use variables from `constants.scss` instead of hardcoded values
4. **Match App Patterns**: Follow the same design patterns used in the Next.js app
5. **Document Changes**: Note what was changed and why

---

## Integration with App

The themed documentation site is integrated into the Next.js app via:

- **Route**: `/docs/api` (embedded iframe)
- **Navigation**: Resources dropdown in header
- **Environment Variable**: `NEXT_PUBLIC_POKEAPI_DOCS_URL`

When theming, ensure the documentation site:
- Matches app color scheme
- Supports dark mode (if app supports it)
- Is responsive and mobile-friendly
- Maintains readability and accessibility

---

## Additional Resources

- **App Design System**: See `app/globals.css` for complete color definitions
- **Component Library**: See `components/` for UI component patterns
- **Integration Guide**: See `docs/POKEAPI-DOCS-INTEGRATION.md` for integration details

---

**Last Updated**: January 15, 2026  
**Maintained By**: POKE MNKY (app) agent
