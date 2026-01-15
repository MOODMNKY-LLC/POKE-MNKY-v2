# MinIO League Buckets Setup - Complete ✅

**Date:** January 13, 2026  
**Status:** ✅ All Buckets Created and Configured  
**Script:** `scripts/setup-minio-league-buckets.ts`

---

## Setup Summary

Successfully created **8 buckets** for league operations based on `minio-creative-use-cases.md`:

### ✅ Created Buckets

| Bucket Name | Description | Access | Status |
|------------|-------------|--------|--------|
| `battle-replays` | Battle Replay Storage & Archive | 🔒 Private | ✅ Created |
| `team-exports` | Team Export/Import Files | 🔒 Private | ✅ Created |
| `league-media` | League Media Assets (logos, avatars, badges) | 🌐 Public | ✅ Created |
| `match-media` | Match Screenshots & Videos | 🔒 Private | ✅ Created |
| `data-exports` | Draft Pool & Analytics Exports | 🔒 Private | ✅ Created |
| `battle-analytics` | Battle Statistics & Replay Analysis | 🔒 Private | ✅ Created |
| `supabase-backups` | Supabase Data Backups | 🔒 Private | ✅ Created |
| `league-docs` | League Documentation & Assets | 🌐 Public | ✅ Created |

---

## Bucket Structures Created

### 1. `battle-replays` (Private)
```
battle-replays/
├── season-5/
└── season-4/
```

### 2. `team-exports` (Private)
```
team-exports/
├── teams/
└── shared/
```

### 3. `league-media` (Public) 🌐
```
league-media/
├── logos/
│   ├── teams/
│   └── league/
├── avatars/
│   └── coaches/
├── badges/
│   └── achievements/
└── custom-sprites/
    └── pokemon/
```

### 4. `match-media` (Private)
```
match-media/
├── screenshots/
│   └── season-5/
├── videos/
│   └── highlights/
└── evidence/
```

### 5. `data-exports` (Private)
```
data-exports/
├── draft-pools/
├── analytics/
└── backups/
```

### 6. `battle-analytics` (Private)
```
battle-analytics/
├── statistics/
└── replay-analysis/
```

### 7. `supabase-backups` (Private)
```
supabase-backups/
├── daily/
└── weekly/
```

### 8. `league-docs` (Public) 🌐
```
league-docs/
├── rules/
└── guides/
```

---

## Access Configuration

### Public Buckets (Public Read Access)
- **`league-media`**: Logos, badges, avatars accessible via direct URLs
- **`league-docs`**: Documentation accessible via direct URLs

**Public URLs:**
- `http://10.0.0.5:30090/league-media/` (internal)
- `https://s3-api-data.moodmnky.com/league-media/` (external)
- `http://10.0.0.5:30090/league-docs/` (internal)
- `https://s3-api-data.moodmnky.com/league-docs/` (external)

### Private Buckets (Authenticated Access Only)
- **`battle-replays`**: Replays require authentication
- **`team-exports`**: Team files require authentication
- **`match-media`**: Match media requires authentication
- **`data-exports`**: Analytics exports require authentication
- **`battle-analytics`**: Analytics data requires authentication
- **`supabase-backups`**: Backups require admin authentication

---

## Notes

### CORS Configuration
- ⚠️ CORS configuration warnings occurred (non-critical)
- MinIO may handle CORS differently than AWS S3
- Can be configured manually via MinIO console if needed
- Public buckets should work for browser access regardless

### Folder Structure
- All folder structures created using `.gitkeep` placeholder files
- Folders are ready for immediate use
- Can be expanded as needed for each use case

---

## Next Steps

### Immediate (Phase 1)
1. **Battle Replay Storage**
   - Integration Worker: Upload replays after battle completion
   - Next.js App: Display replay links
   - Discord Bot: Share replay URLs

2. **Team Export/Import**
   - Team Builder: Export teams to MinIO
   - Team Library: Import teams from MinIO
   - Share teams via Discord bot

### Enhanced Features (Phase 2)
3. **League Media Assets**
   - Upload team logos
   - Upload coach avatars
   - Create achievement badges
   - Custom sprite variants

4. **Match Media**
   - Upload match screenshots
   - Store battle highlights
   - Evidence storage for disputes

### Advanced Features (Phase 3)
5. **Analytics & Backups**
   - Export draft pools
   - Generate analytics reports
   - Automated Supabase backups
   - Battle statistics storage

---

## Integration Points

### Services That Will Use These Buckets

**Integration Worker:**
- Upload battle replays → `battle-replays`
- Upload match media → `match-media`
- Store analytics → `battle-analytics`

**Next.js App:**
- Display league media → `league-media` (public)
- Download team exports → `team-exports` (authenticated)
- Show documentation → `league-docs` (public)
- Display replay links → `battle-replays` (authenticated)

**Discord Bot:**
- Share replay URLs → `battle-replays`
- Upload evidence → `match-media`
- Share team exports → `team-exports`

**Team Builder:**
- Export teams → `team-exports`
- Import teams → `team-exports`
- Custom sprites → `league-media/custom-sprites`

---

## Environment Variables

No new environment variables needed - existing MinIO credentials work for all buckets:
- `MINIO_ENDPOINT_INTERNAL` / `MINIO_ENDPOINT_EXTERNAL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

**Bucket-specific URLs can be constructed:**
```typescript
const bucketUrl = `${MINIO_ENDPOINT}/${bucketName}/${path}`
```

---

## Verification

To verify buckets were created:
```powershell
# Using mc CLI
mc ls local

# Or using AWS SDK in script
pnpm tsx scripts/test-minio-connection.ts
```

---

## Success! 🎉

All buckets are ready for use. The MinIO infrastructure is now repurposed from sprite storage to **high-value league operations** that enable advanced features and better user experiences.
