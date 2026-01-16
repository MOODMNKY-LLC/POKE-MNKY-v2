# PokéAPI Documentation Site - Comprehensive Theming Guide

**Date**: January 15, 2026  
**Purpose**: Complete guide to all theming options and customization opportunities  
**Theme**: Pokémon-inspired design with Master Ball dark mode palette

---

## Overview

This guide provides a comprehensive breakdown of all theming opportunities in the PokéAPI documentation site. After exploring the codebase structure, we've identified 18 SCSS files across components and pages that can be customized to match the POKE MNKY app's design system.

---

## Architecture Overview

### Technology Stack

- **Framework**: React Static (static site generator)
- **Styling**: SCSS (Sass) with CSS Modules
- **Build**: Docker container with Node.js build process
- **Deployment**: Nginx serving static files

### File Structure

```
src/
├── constants.scss              # Color/system constants (PRIMARY THEME FILE)
├── global.scss                 # Global styles (SECONDARY THEME FILE)
├── App.js                      # Main app component
├── components/
│   ├── Header/
│   │   ├── Header.js
│   │   └── Header.module.scss  # Header theming
│   ├── Footer/
│   │   ├── Footer.js
│   │   └── Footer.module.scss  # Footer theming
│   ├── Alert/
│   │   └── Alert.module.scss   # Alert/notification theming
│   ├── DocsContainer/
│   │   └── DocsContainer.module.scss  # Main content container
│   ├── ApiExplorer/
│   │   ├── Input.module.scss   # API input forms
│   │   └── ClipboardButton.module.scss
│   ├── JsonViewer/
│   │   └── JsonViewer.module.scss  # JSON display
│   ├── Page/
│   │   └── Page.module.scss    # Page wrapper
│   ├── TableOfContents/
│   │   └── TableOfContents.module.scss
│   ├── BreadCrumbs/
│   │   ├── BreadCrumbs.module.scss
│   │   └── Crumb.module.scss
│   └── LinkButton/
│       └── LinkButton.module.scss
└── pages/
    ├── index.module.scss       # Homepage
    ├── about.module.scss        # About page
    └── docs/
        └── v2.module.scss      # API v2 docs page
```

---

## Color System

### Light Mode (Pokémon Red/Blue)

| Element | Color | Hex | OKLCH | Usage |
|---------|-------|-----|-------|-------|
| **Primary** | Pokémon Red | `#CC0000` | `oklch(0.548 0.217 27)` | Header, active states, primary actions |
| **Accent** | Pokémon Blue | `#3B4CCA` | `oklch(0.485 0.186 264)` | Links, buttons, interactive elements |
| **Background** | White | `#FFFFFF` | `oklch(1 0 0)` | Page background |
| **Text** | Dark Gray | `#1F2937` | `oklch(0.2 0.02 20)` | Body text |
| **Card** | White | `#FFFFFF` | `oklch(1 0 0)` | Card backgrounds |
| **Border** | Light Gray | `#E5E7EB` | `oklch(0.92 0.005 20)` | Borders, dividers |

**Primary Variants**:
- Lighter: `#E63946` (hover states)
- Darker: `#A00000` (active hover)
- Darkest: `#8B0000` (active states)

### Dark Mode (Master Ball: Gold/Black/White)

| Element | Color | Hex | OKLCH | Usage |
|---------|-------|-----|-------|-------|
| **Primary** | Pokémon Gold | `#B3A125` | `oklch(0.703 0.106 92)` | Header, primary actions |
| **Accent** | Pokémon Yellow | `#FFDE00` | `oklch(0.885 0.176 95)` | Links, highlights |
| **Background** | Deep Black | `#1A1A1A` | `oklch(0.12 0.01 80)` | Page background |
| **Text** | Bright White | `#F7F7F7` | `oklch(0.97 0.005 80)` | Body text |
| **Card** | Dark Gray | `#262626` | `oklch(0.16 0.015 80)` | Card backgrounds |
| **Border** | Medium Gray | `#454545` | `oklch(0.28 0.015 80)` | Borders, dividers |

**Primary Variants**:
- Lighter: `#C9B84A` (hover states)
- Darker: `#9A8A1F` (active hover)
- Darkest: `#7A6D1A` (active states)

---

## Theming Opportunities by Component

### 1. Constants (`constants.scss`) ⭐ PRIMARY

**Purpose**: Central color and system variable definitions

**Current Variables**:
- `$brand-color` - Primary brand color
- `$brand-color-lighter/darker/darkest` - Color variants
- `$link-color` - Link color
- `$button-color` - Button color
- `$border-color` - Border color
- `$page-max-width` - Layout width
- `$site-header-height` - Header height

**Theming Options**:
- ✅ Add dark mode color variables
- ✅ Define color palettes for light/dark themes
- ✅ Add spacing/sizing constants
- ✅ Typography scale variables

**Impact**: Changes here affect ALL components (highest priority)

---

### 2. Global Styles (`global.scss`) ⭐ SECONDARY

**Purpose**: Base element styles, typography, global layout

**Current Styles**:
- Body typography and colors
- Link styles
- Table styles
- Code block styles (`kbd`, `.code`, `pre`)
- Heading styles

**Theming Options**:
- ✅ Typography system (font families, sizes, weights)
- ✅ Dark mode base styles
- ✅ Global transitions/animations
- ✅ Scrollbar styling
- ✅ Selection colors

**Impact**: Affects all pages and components

---

### 3. Header (`Header.module.scss`)

**Purpose**: Site header and navigation

**Current Styles**:
- Header background (Pokémon Red)
- Navigation links
- Active/hover states
- Mobile responsive navigation

**Theming Options**:
- ✅ Header background color (light/dark)
- ✅ Navigation link colors
- ✅ Logo styling
- ✅ Mobile menu appearance
- ✅ Sticky header behavior
- ✅ Shadow/depth effects

**Dark Mode**: Header switches to Pokémon Gold (`#B3A125`)

---

### 4. Footer (`Footer.module.scss`)

**Purpose**: Site footer

**Current Styles**:
- Footer background (`#fbfbfb`)
- Border top (brand color)
- Grid layout
- Responsive columns

**Theming Options**:
- ✅ Footer background (light/dark)
- ✅ Footer text colors
- ✅ Link colors
- ✅ Border styling
- ✅ Grid spacing

**Dark Mode**: Footer background switches to dark card color

---

### 5. Alert (`Alert.module.scss`)

**Purpose**: Alert/notification banners

**Current Styles**:
- Info alerts (brand color variants)
- Success alerts (green)
- Important alerts (sticky, brand color)

**Theming Options**:
- ✅ Alert background colors
- ✅ Alert text colors
- ✅ Alert border styles
- ✅ Dismiss button styling
- ✅ Alert variants (info, success, warning, error)

**Dark Mode**: Alert backgrounds adapt to dark theme

---

### 6. DocsContainer (`DocsContainer.module.scss`)

**Purpose**: Main documentation container with sidebar navigation

**Current Styles**:
- Container layout (flex)
- Sidebar navigation (sticky)
- Content area
- Table of contents
- Breadcrumbs (mobile)

**Theming Options**:
- ✅ Container background
- ✅ Sidebar background
- ✅ Sidebar link colors
- ✅ Content area styling
- ✅ Table of contents styling
- ✅ Breadcrumb styling

**Dark Mode**: Sidebar and content backgrounds switch to dark

---

### 7. ApiExplorer (`Input.module.scss`, `ClipboardButton.module.scss`)

**Purpose**: API endpoint explorer and input forms

**Current Styles**:
- Input fields
- Buttons
- Clipboard buttons
- Form styling

**Theming Options**:
- ✅ Input field backgrounds/borders
- ✅ Button colors (primary, secondary)
- ✅ Focus states
- ✅ Disabled states
- ✅ Clipboard button styling

**Dark Mode**: Inputs and buttons adapt to dark theme

---

### 8. JsonViewer (`JsonViewer.module.scss`)

**Purpose**: JSON response display

**Current Styles**:
- JSON syntax highlighting
- Code block styling
- Copy buttons

**Theming Options**:
- ✅ JSON syntax colors
- ✅ Background colors
- ✅ Border styling
- ✅ Copy button appearance

**Dark Mode**: JSON viewer uses dark code block styling

---

### 9. Page (`Page.module.scss`)

**Purpose**: Page wrapper component

**Current Styles**:
- Page layout
- Content spacing

**Theming Options**:
- ✅ Page background
- ✅ Content padding/margins
- ✅ Max width constraints

---

### 10. TableOfContents (`TableOfContents.module.scss`)

**Purpose**: Documentation table of contents

**Current Styles**:
- TOC list styling
- Active item highlighting
- Nested items

**Theming Options**:
- ✅ Link colors
- ✅ Active state styling
- ✅ Hover states
- ✅ Nested item indentation/styling

**Dark Mode**: TOC links use accent color (Yellow)

---

### 11. BreadCrumbs (`BreadCrumbs.module.scss`, `Crumb.module.scss`)

**Purpose**: Breadcrumb navigation

**Current Styles**:
- Breadcrumb container
- Individual crumb styling
- Separator styling

**Theming Options**:
- ✅ Breadcrumb colors
- ✅ Separator styling
- ✅ Active/last item styling
- ✅ Hover states

---

### 12. LinkButton (`LinkButton.module.scss`)

**Purpose**: Button-style links

**Current Styles**:
- Button appearance
- Link behavior

**Theming Options**:
- ✅ Button colors (primary, secondary)
- ✅ Hover states
- ✅ Active states
- ✅ Size variants

---

### 13. Homepage (`index.module.scss`)

**Purpose**: Landing page styling

**Current Styles**:
- Banner section (`$banner-color: #263238`)
- CTA section (`$cta-color: #ebf5f0`)
- Logo container
- Hero text

**Theming Options**:
- ✅ Banner background (could use brand color)
- ✅ Banner text colors
- ✅ CTA section colors
- ✅ Hero text styling
- ✅ Logo presentation

**Dark Mode**: Banner and CTA adapt to dark theme

---

### 14. About Page (`about.module.scss`)

**Purpose**: About page styling

**Current Styles**:
- Page-specific styles

**Theming Options**:
- ✅ Content section styling
- ✅ Text colors
- ✅ Link colors

---

### 15. API v2 Docs (`v2.module.scss`)

**Purpose**: API documentation page styling

**Current Styles**:
- Documentation-specific styles

**Theming Options**:
- ✅ Code example styling
- ✅ Endpoint display
- ✅ Parameter tables
- ✅ Response examples

---

## Dark Mode Implementation

### Current Status

✅ **Implemented**: Dark mode support via `prefers-color-scheme` media query  
✅ **Implemented**: Class-based dark mode (`body.dark-mode`) for manual toggle  
✅ **Colors**: Master Ball palette (Gold/Black/White)

### Implementation Approach

1. **Media Query**: `@media (prefers-color-scheme: dark)` - Automatic based on system preference
2. **Class-Based**: `body.dark-mode` - Manual toggle support (if JavaScript toggle added)
3. **Color Variables**: Dark mode variants in `constants.scss`

### Components with Dark Mode Support

- ✅ Global styles (`global.scss`)
- ✅ Header (`Header.module.scss`)
- ⚠️ Footer (needs dark mode)
- ⚠️ Alert (needs dark mode)
- ⚠️ DocsContainer (needs dark mode)
- ⚠️ ApiExplorer (needs dark mode)
- ⚠️ JsonViewer (needs dark mode)
- ⚠️ Other components (need dark mode)

---

## Typography System

### Font Families

**Primary Font**: Fredoka (Pokémon-inspired rounded)
- Fallback: `ui-rounded`, `SF Pro Rounded`, `system-ui`

**Monospace Font**: Geist Mono (for code)
- Fallback: `SF Mono`, `Monaco`, `Cascadia Code`, `Roboto Mono`

**Current**: Site uses Lato (from Google Fonts in `App.js`)

**Theming Options**:
- ✅ Update `App.js` to load Fredoka instead of Lato
- ✅ Update `global.scss` font-family
- ✅ Define typography scale (sizes, weights, line-heights)

---

## Spacing & Layout

### Current Constants

- `$page-max-width: 72rem` (1152px)
- `$site-header-height: 3.125rem` (50px)
- `$short-height: 25rem` (400px) - Mobile breakpoint

### Theming Options

- ✅ Define spacing scale (margins, padding)
- ✅ Define breakpoints
- ✅ Define border radius scale
- ✅ Define z-index scale

---

## Component-Specific Theming Priorities

### High Priority (Core Experience)

1. **Constants** - Color system foundation
2. **Global Styles** - Base typography and elements
3. **Header** - First visual impression
4. **DocsContainer** - Main content area
5. **Footer** - Site completion

### Medium Priority (Enhanced Experience)

6. **Alert** - User notifications
7. **TableOfContents** - Navigation aid
8. **ApiExplorer** - Interactive features
9. **JsonViewer** - Code display

### Low Priority (Polish)

10. **BreadCrumbs** - Navigation aid
11. **LinkButton** - Button styling
12. **Page** - Page wrapper
13. **Homepage** - Landing page
14. **About** - About page
15. **API v2 Docs** - Documentation pages

---

## Implementation Checklist

### Phase 1: Core Theming ✅

- [x] Update `constants.scss` with Pokémon colors
- [x] Update `global.scss` with Fredoka font and base styles
- [x] Update `Header.module.scss` with Pokémon Red header
- [x] Rebuild and deploy

### Phase 2: Dark Mode (Current)

- [x] Add dark mode variables to `constants.scss`
- [x] Add dark mode styles to `global.scss`
- [x] Add dark mode styles to `Header.module.scss`
- [ ] Add dark mode to `Footer.module.scss`
- [ ] Add dark mode to `DocsContainer.module.scss`
- [ ] Add dark mode to `Alert.module.scss`
- [ ] Add dark mode to remaining components

### Phase 3: Enhanced Theming

- [ ] Update `App.js` to load Fredoka font
- [ ] Add dark mode to all components
- [ ] Add theme toggle button (JavaScript)
- [ ] Refine component-specific styles
- [ ] Add animations/transitions
- [ ] Optimize for accessibility

---

## Quick Reference: Color Conversions

### Light Mode

| App Variable | Hex | SCSS Variable |
|--------------|-----|---------------|
| `--primary` | `#CC0000` | `$brand-color` |
| `--accent` | `#3B4CCA` | `$link-color` |
| `--background` | `#FFFFFF` | `$background-color` |
| `--foreground` | `#1F2937` | `$text-color` |

### Dark Mode

| App Variable | Hex | SCSS Variable |
|--------------|-----|---------------|
| `--primary` | `#B3A125` | `$brand-color-dark` |
| `--accent` | `#FFDE00` | `$link-color-dark` |
| `--background` | `#1A1A1A` | `$background-color-dark` |
| `--foreground` | `#F7F7F7` | `$text-color-dark` |

---

## Server Access & File Locations

### SSH Access

```bash
ssh moodmnky@10.3.0.119
# Password: MOODMNKY88
```

### File Locations

```
/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/
├── constants.scss
├── global.scss
├── components/
│   └── [component-name]/
│       └── [Component].module.scss
└── pages/
    └── [page-name].module.scss
```

### Rebuild Process

```bash
cd /home/moodmnky/POKE-MNKY
docker compose build pokeapi-docs
docker compose up -d pokeapi-docs
```

---

## Best Practices

1. **Always update `constants.scss` first** - Single source of truth
2. **Test both light and dark modes** - Ensure contrast and readability
3. **Use CSS variables where possible** - Easier to maintain
4. **Maintain accessibility** - WCAG contrast ratios
5. **Test responsive** - Mobile and desktop views
6. **Document changes** - Update this guide when adding new theming

---

## Future Enhancements

### Potential Additions

1. **Theme Toggle Button** - Manual dark/light mode switch
2. **Custom Branding** - League logo in header
3. **Animation System** - Smooth transitions
4. **Accessibility Improvements** - Focus states, ARIA labels
5. **Print Styles** - Optimized for printing
6. **High Contrast Mode** - Enhanced accessibility

---

**Last Updated**: January 15, 2026  
**Maintained By**: POKE MNKY (app) agent  
**Status**: Comprehensive Guide Complete
