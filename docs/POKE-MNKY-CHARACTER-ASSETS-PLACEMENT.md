# POKE MNKY Character Assets - Placement Plan

**Date**: January 17, 2026  
**Status**: Asset Integration Plan  
**Purpose**: Integrate POKE MNKY virtual assistant character assets throughout the application

---

## Asset Overview

You have **6 total assets** for the POKE MNKY character:

### App Icon Style (4 files)
- **Light mode, Red/Blue palette** - PNG
- **Dark mode, Red/Blue palette** - PNG  
- **Light mode, Gold/Black palette** - PNG
- **Dark mode, Gold/Black palette** - PNG

### Avatar Style (2 files - no background)
- **Light mode, Red/Blue palette** - PNG
- **Dark mode, Red/Blue palette** - PNG
- **Light mode, Gold/Black palette** - PNG
- **Dark mode, Gold/Black palette** - PNG

### SVG Versions (2 files)
- Same as PNGs but SVG format (better for scaling)

---

## 📁 Where to Drop Your Files

**Please drop all 6 files in this location:**

```
temp/poke-mnky-assets/
```

**File naming convention** (please name them as follows):
- `icon-light-red-blue.png`
- `icon-dark-red-blue.png`
- `icon-light-gold-black.png`
- `icon-dark-gold-black.png`
- `avatar-light-red-blue.png`
- `avatar-dark-red-blue.png`
- `avatar-light-gold-black.png`
- `avatar-dark-gold-black.png`
- `icon-light-red-blue.svg`
- `icon-dark-gold-black.svg`

*(If your files have different names, that's fine - I'll rename them when organizing)*

---

## 🎯 Final Asset Organization

After you drop the files, I'll organize them into:

```
public/
└── poke-mnky/
    ├── icons/              # App icon style (for favicons, app icons)
    │   ├── light-red-blue.png
    │   ├── dark-red-blue.png
    │   ├── light-gold-black.png
    │   ├── dark-gold-black.png
    │   ├── light-red-blue.svg
    │   └── dark-gold-black.svg
    └── avatars/            # Avatar style (no bg, for UI components)
        ├── light-red-blue.png
        ├── dark-red-blue.png
        ├── light-gold-black.png
        └── dark-gold-black.png
```

---

## 🎨 Color Palette Strategy

### Red/Blue Palette (Primary)
- **Use for**: Main app icons, favicons, AI assistant, general UI
- **Reason**: Matches Pokémon theme (Pokéball colors), vibrant and energetic
- **Files**: `*-red-blue.*`

### Gold/Black Palette (Premium)
- **Use for**: Admin features, premium content, special occasions, commissioner features
- **Reason**: More sophisticated, matches league prestige theme
- **Files**: `*-gold-black.*`

---

## ⚠️ Important: Brand vs Character

**League Brand (Keep Existing)**:
- `league-logo.svg`, `league-logo.png` - Average at Best Battle League logo
- `favicon-*.png` - League-branded favicons
- These represent the **league identity** and should remain unchanged

**POKE MNKY Character (New Addition)**:
- Virtual assistant persona
- Used alongside league branding, not as replacement
- Represents the AI assistant helping users
- Appears in AI contexts, help, guidance

**They work together**: League logo = brand identity, POKE MNKY = helpful assistant

---

## 📍 Integration Locations

### 1. **AI Chat Interface** ⭐⭐⭐⭐⭐
**Priority**: Highest  
**Files**: `avatars/light-red-blue.png`, `avatars/dark-red-blue.png`

**Locations**:
- `app/pokedex/page.tsx` - AI Pokémon Assistant section
- `components/draft/draft-chat.tsx` - Draft assistant chat
- Future AI agent interfaces

**Implementation**:
```tsx
// Add character avatar next to AI assistant title
// League logo stays in header, character appears in AI chat
<div className="flex items-center gap-2">
  <img 
    src="/poke-mnky/avatars/light-red-blue.png"
    alt="POKE MNKY Assistant"
    className="h-8 w-8 dark:hidden"
  />
  <img 
    src="/poke-mnky/avatars/dark-red-blue.png"
    alt="POKE MNKY Assistant"
    className="h-8 w-8 hidden dark:block"
  />
  <CardTitle>AI Pokémon Assistant</CardTitle>
</div>
```

---

### 2. **Loading States** ⭐⭐⭐⭐
**Priority**: High  
**Files**: `avatars/light-red-blue.png`, `avatars/dark-red-blue.png`

**Locations**:
- `app/loading.tsx` - Root loading component
- `components/splash-screen.tsx` - Splash screen

**Implementation**:
- Add character alongside existing league logo
- Character appears as "assistant" during loading
- League logo remains primary brand element
- Use avatar style (no background works better)

---

### 3. **Empty States** ⭐⭐⭐⭐
**Priority**: High  
**Files**: `avatars/light-red-blue.png`, `avatars/dark-red-blue.png`

**Locations**:
- Create `components/ui/empty-state.tsx` component
- Use in pages with no data (teams, matches, etc.)

**Implementation**:
```tsx
// components/ui/empty-state.tsx
export function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <img 
        src="/poke-mnky/avatars/light-red-blue.png"
        alt="POKE MNKY"
        className="h-24 w-24 dark:hidden mb-4"
      />
      <img 
        src="/poke-mnky/avatars/dark-red-blue.png"
        alt="POKE MNKY"
        className="h-24 w-24 hidden dark:block mb-4"
      />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
```

---

### 5. **Help/Support Tooltips** ⭐⭐⭐
**Priority**: Medium  
**Files**: `avatars/light-red-blue.png`, `avatars/dark-red-blue.png`

**Locations**:
- Help modals
- Tooltip components
- Onboarding flows

**Implementation**:
- Small avatar (16x16 or 24x24) next to help icons
- Character can "guide" users through features

---

### 5. **Onboarding/Welcome** ⭐⭐⭐
**Priority**: Medium  
**Files**: `avatars/light-red-blue.png`, `avatars/dark-red-blue.png`

**Locations**:
- First-time user welcome screen
- Feature introduction modals
- Tutorial flows

**Implementation**:
- Larger avatar (64x64 or 96x96)
- Character welcomes new users
- Guides through key features

---

### 7. **Admin/Premium Features** ⭐⭐
**Priority**: Low  
**Files**: `avatars/light-gold-black.png`, `avatars/dark-gold-black.png`

**Locations**:
- Admin dashboard
- Commissioner features
- Premium content areas

**Implementation**:
- Use gold/black palette to indicate premium/admin features
- Differentiates from regular user experience

---

## 🚀 Implementation Steps

1. **Drop Files** → Place all 6 files in `temp/poke-mnky-assets/`
2. **Review Assets** → I'll examine the files to understand dimensions and quality
3. **Organize** → Copy to `public/poke-mnky/` with proper structure
4. **Keep League Branding** → Existing league logos/icons remain unchanged
5. **Integrate AI Chat** → Add character avatar to AI assistant interfaces
6. **Update Loading States** → Add character alongside league logo
7. **Create Empty State** → Build empty state component with character
8. **Test** → Verify all integrations work in light/dark mode

---

## 🎨 UI/UX Considerations

### Character Personality
- **Friendly & Helpful**: Character should feel approachable and helpful
- **Pokémon-Themed**: Should fit Pokémon aesthetic
- **Professional**: Still maintains league professionalism

### Usage Guidelines
- **Don't Overuse**: Character should enhance, not distract
- **Context-Appropriate**: Use in AI/help contexts, not everywhere
- **Consistent Sizing**: Maintain consistent sizes across uses
- **Accessibility**: Always include alt text

### Responsive Design
- **Mobile**: Smaller avatars (24x24 or 32x32)
- **Desktop**: Larger avatars (48x48 or 64x64)
- **Touch Targets**: Ensure adequate size for mobile interaction

---

## 📊 Priority Matrix

| Location | Priority | Impact | Effort | Status |
|----------|----------|--------|--------|--------|
| AI Chat Interface | ⭐⭐⭐⭐⭐ | High | Low | Pending |
| Loading States | ⭐⭐⭐⭐ | Medium | Low | Pending |
| Empty States | ⭐⭐⭐⭐ | Medium | Medium | Pending |
| Help/Support | ⭐⭐⭐ | Low | Low | Pending |
| Onboarding | ⭐⭐⭐ | Low | Medium | Pending |
| Admin Features | ⭐⭐ | Low | Low | Pending |

**Note**: League branding (favicons, logos) remains unchanged - character is additive

---

## ✅ Next Steps

1. **You**: Drop all 6 files in `temp/poke-mnky-assets/`
2. **Me**: Review files and organize into `public/poke-mnky/`
3. **Me**: Implement integrations starting with highest priority
4. **You**: Review and provide feedback
5. **Iterate**: Refine based on usage and feedback

---

**Ready to proceed once files are dropped!** 🎨
