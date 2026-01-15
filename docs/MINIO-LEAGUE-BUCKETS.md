# MinIO League Buckets - Documentation

**Date:** January 13, 2026  
**Status:** ✅ Production Ready  
**Last Updated:** January 13, 2026

---

## Overview

MinIO has been repurposed from sprite storage (now on GitHub CDN) to **high-value league-specific operations**. This document describes the bucket structure, use cases, access patterns, and integration points.

---

## Table of Contents

1. [Architecture Decision](#architecture-decision)
2. [Bucket Inventory](#bucket-inventory)
3. [Bucket Details](#bucket-details)
4. [Access Patterns](#access-patterns)
5. [Integration Points](#integration-points)
6. [Usage Examples](#usage-examples)
7. [Maintenance](#maintenance)

---

## Architecture Decision

### Why GitHub CDN for Sprites?

**Sprites** (58,882 files) were moved to GitHub CDN because:
- ✅ **Zero maintenance** - No sync scripts needed
- ✅ **Always up-to-date** - Automatically gets latest sprites
- ✅ **Free CDN** - GitHub's global distribution
- ✅ **Simpler codebase** - Removed MinIO dependency
- ✅ **Better performance** - CDN caching + browser caching

**URL Pattern:** `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

### Why MinIO for League Operations?

**MinIO** is now used for league-specific content because:
- ✅ **League-specific** - Content unique to your league (not public assets)
- ✅ **Dynamic** - Content changes over time (teams, replays, media)
- ✅ **High value** - Features that differentiate your platform
- ✅ **Scalable** - Can grow with league size
- ✅ **Customizable** - Full control over organization and access
- ✅ **Unlimited storage** - No GitHub repo limits
- ✅ **Access control** - Public/private buckets
- ✅ **Versioning** - Track changes over time

---

## Bucket Inventory

### Summary

| Bucket Name | Purpose | Access | Priority | Status |
|------------|---------|--------|----------|--------|
| `battle-replays` | Battle replay storage & archive | 🔒 Private | Tier 1 | ✅ Ready |
| `team-exports` | Team export/import files | 🔒 Private | Tier 1 | ✅ Ready |
| `league-media` | Logos, avatars, badges, custom sprites | 🌐 Public | Tier 2 | ✅ Ready |
| `match-media` | Screenshots, videos, evidence | 🔒 Private | Tier 2 | ✅ Ready |
| `data-exports` | Draft pools, analytics, backups | 🔒 Private | Tier 3 | ✅ Ready |
| `battle-analytics` | Statistics & replay analysis | 🔒 Private | Tier 3 | ✅ Ready |
| `supabase-backups` | Database backups | 🔒 Private | Tier 3 | ✅ Ready |
| `league-docs` | Rules, guides, documentation | 🌐 Public | Tier 3 | ✅ Ready |

**Total:** 8 buckets (2 public, 6 private)

---

## Bucket Details

### 1. `battle-replays` 🔒 Private

**Purpose:** Store Showdown battle replays (.log files) for long-term archival, analysis, and sharing.

**Structure:**
```
battle-replays/
├── season-5/
│   ├── week-1/
│   │   └── match-{match_id}/
│   │       ├── replay.log
│   │       └── metadata.json
│   └── week-2/
│       └── ...
└── season-4/
    └── ...
```

**Use Cases:**
- Permanent replay archive (no data loss)
- Replay analysis features
- Share replays via direct links
- Backup for Supabase replay references
- Replay viewer/analyzer tools

**Integration:**
- **Integration Worker**: Uploads replays after battle completion
- **Next.js App**: Displays replay links
- **Discord Bot**: Shares replay URLs

**Access:** Authenticated access only (private bucket)

---

### 2. `team-exports` 🔒 Private

**Purpose:** Store team export files (.txt Showdown format) for backup, sharing, and version history.

**Structure:**
```
team-exports/
├── teams/
│   └── {team_id}/
│       ├── {timestamp}-{team_name}.txt
│       └── latest.txt (most recent)
└── shared/
    └── {share_token}/
        └── team.txt
```

**Use Cases:**
- Team version history
- Easy team sharing (generate share links)
- Backup for team data
- Import/export functionality
- Team comparison tools

**Integration:**
- **Team Builder**: Exports teams to MinIO
- **Team Library**: Imports teams from MinIO
- **Discord Bot**: Shares teams via links
- **Next.js App**: Team version history UI

**Access:** Authenticated access only (private bucket)

---

### 3. `league-media` 🌐 Public

**Purpose:** Store custom league assets: team logos, coach avatars, custom badges, league banners, custom sprites.

**Structure:**
```
league-media/
├── logos/
│   ├── teams/
│   │   └── {team_id}.png
│   └── league/
│       ├── logo.png
│       └── banner.png
├── avatars/
│   └── coaches/
│       └── {coach_id}.png
├── badges/
│   └── achievements/
│       └── {badge_id}.png
└── custom-sprites/
    └── pokemon/
        └── {pokemon_id}-custom.png
```

**Use Cases:**
- Custom branding for league
- Team identity (logos)
- Achievement system (badges)
- Custom sprite variants
- Coach avatars/profile pics

**Integration:**
- **Team Pages**: Display logos
- **Profile Pages**: Show avatars
- **Achievement System**: Display badges
- **Team Builder**: Custom sprite variants

**Access:** Public read (logos/badges accessible via direct URLs)

**Public URLs:**
- Internal: `http://10.0.0.5:30090/league-media/logos/teams/{team_id}.png`
- External: `https://s3-api-data.moodmnky.com/league-media/logos/teams/{team_id}.png`

---

### 4. `match-media` 🔒 Private

**Purpose:** Store screenshots/videos of key battle moments, match highlights, and coach-submitted evidence.

**Structure:**
```
match-media/
├── screenshots/
│   └── season-5/
│       └── match-{match_id}/
│           └── turn-{turn_number}.png
├── videos/
│   └── highlights/
│       └── week-{week_number}/
│           └── highlight.mp4
└── evidence/
    └── match-{match_id}/
        └── {coach_id}-evidence.{ext}
```

**Use Cases:**
- Match evidence storage
- Highlight reels
- Battle analysis
- Content for social media
- Dispute resolution

**Integration:**
- **Integration Worker**: Uploads match media after battles
- **Next.js App**: Displays highlights and evidence
- **Discord Bot**: Shares highlight links
- **Coaches**: Upload evidence for disputes

**Access:** Authenticated access only (private bucket)

---

### 5. `data-exports` 🔒 Private

**Purpose:** Store draft pool exports, analytics reports, and data dumps for analysis and backup.

**Structure:**
```
data-exports/
├── draft-pools/
│   └── season-{season_number}/
│       ├── draft-pool.json
│       └── draft-order.csv
├── analytics/
│   └── season-{season_number}/
│       ├── weekly/
│       │   └── week-{week_number}-report.pdf
│       └── season-summary.pdf
└── backups/
    └── {date}/
        ├── teams-export.json
        └── matches-export.json
```

**Use Cases:**
- Historical data archives
- Analytics reports
- Data backup/restore
- External analysis tools
- League transparency

**Integration:**
- **Admin Panel**: Export draft pools
- **Analytics Dashboard**: Generate reports
- **Backup Scripts**: Automated data exports
- **Next.js App**: Download exports

**Access:** Authenticated access only (private bucket)

---

### 6. `battle-analytics` 🔒 Private

**Purpose:** Store parsed battle statistics, move usage data, and replay analysis results.

**Structure:**
```
battle-analytics/
├── statistics/
│   └── season-{season_number}/
│       ├── pokemon-usage.json
│       ├── move-usage.json
│       └── type-coverage.json
└── replay-analysis/
    └── match-{match_id}/
        ├── analysis.json
        └── key-turns.json
```

**Use Cases:**
- Advanced analytics
- Meta analysis (Pokémon usage)
- Replay insights
- Strategic analysis tools

**Integration:**
- **Integration Worker**: Generates analytics after battles
- **Analytics Dashboard**: Displays statistics
- **Next.js App**: Shows meta analysis
- **Replay Analyzer**: Stores analysis results

**Access:** Authenticated access only (private bucket)

---

### 7. `supabase-backups` 🔒 Private

**Purpose:** Automated backups of critical Supabase tables (teams, matches, standings) for disaster recovery.

**Structure:**
```
supabase-backups/
├── daily/
│   └── {date}/
│       ├── teams.json
│       ├── matches.json
│       └── standings.json
└── weekly/
    └── {date}/
        └── full-dump.sql.gz
```

**Use Cases:**
- Disaster recovery
- Data versioning
- Audit compliance
- Migration support

**Integration:**
- **Backup Scripts**: Automated daily/weekly backups
- **Admin Panel**: Manual backup triggers
- **Migration Tools**: Restore from backups

**Access:** Admin access only (private bucket)

---

### 8. `league-docs` 🌐 Public

**Purpose:** Store league rules PDFs, season guides, custom documentation, and training materials.

**Structure:**
```
league-docs/
├── rules/
│   ├── season-5-rules.pdf
│   └── draft-guide.pdf
└── guides/
    ├── team-building-guide.pdf
    └── battle-strategy.pdf
```

**Use Cases:**
- Centralized documentation
- Version control for docs
- Easy sharing
- Training resources

**Integration:**
- **Next.js App**: Display documentation
- **Discord Bot**: Share doc links
- **Admin Panel**: Upload/update docs

**Access:** Public read (documentation accessible via direct URLs)

**Public URLs:**
- Internal: `http://10.0.0.5:30090/league-docs/rules/season-5-rules.pdf`
- External: `https://s3-api-data.moodmnky.com/league-docs/rules/season-5-rules.pdf`

---

## Access Patterns

### Public Buckets

**`league-media`** and **`league-docs`** are configured for public read access:

- ✅ **Direct URL access** - Files accessible via browser
- ✅ **No authentication** - Public can view logos, badges, docs
- ✅ **CDN-ready** - Can be cached by Cloudflare/CDN
- ⚠️ **Write access** - Requires MinIO credentials (admin only)

**Example:**
```typescript
// Public URL - works in browser
const logoUrl = `https://s3-api-data.moodmnky.com/league-media/logos/teams/${teamId}.png`
```

### Private Buckets

All other buckets require authentication:

- 🔒 **Read access** - Requires MinIO credentials
- 🔒 **Write access** - Requires MinIO credentials
- 🔒 **Signed URLs** - Can generate temporary access URLs
- 🔒 **Service access** - Integration Worker, Discord Bot use service credentials

**Example:**
```typescript
// Private bucket - requires authentication
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT_EXTERNAL,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
})

// Generate signed URL for temporary access
const url = await getSignedUrl(s3Client, new GetObjectCommand({
  Bucket: "battle-replays",
  Key: "season-5/week-1/match-123/replay.log",
}), { expiresIn: 3600 }) // 1 hour
```

---

## Integration Points

### Integration Worker

**Uploads to:**
- `battle-replays` - After battle completion
- `match-media` - Screenshots/videos from battles
- `battle-analytics` - Generated statistics

**Example:**
```typescript
// Upload replay after battle
await s3Client.send(new PutObjectCommand({
  Bucket: "battle-replays",
  Key: `season-5/week-1/match-${matchId}/replay.log`,
  Body: replayContent,
  ContentType: "text/plain",
}))
```

### Next.js App

**Reads from:**
- `league-media` - Display logos, avatars, badges (public)
- `league-docs` - Display documentation (public)
- `battle-replays` - Show replay links (authenticated)
- `team-exports` - Download team files (authenticated)

**Writes to:**
- `team-exports` - Export teams from team builder
- `league-media` - Upload logos/avatars (admin)

**Example:**
```typescript
// Display team logo (public bucket)
<Image 
  src={`https://s3-api-data.moodmnky.com/league-media/logos/teams/${teamId}.png`}
  alt="Team Logo"
/>

// Download team export (authenticated)
const teamUrl = await generateSignedUrl("team-exports", `teams/${teamId}/latest.txt`)
```

### Discord Bot

**Reads from:**
- `battle-replays` - Share replay URLs
- `league-docs` - Share documentation links
- `team-exports` - Share team files

**Writes to:**
- `match-media` - Upload evidence screenshots
- `team-exports` - Store shared teams

**Example:**
```typescript
// Share replay link
const replayUrl = await generateSignedUrl(
  "battle-replays",
  `season-5/week-1/match-${matchId}/replay.log`,
  { expiresIn: 86400 } // 24 hours
)
await channel.send(`Replay: ${replayUrl}`)
```

### Team Builder

**Reads from:**
- `team-exports` - Import existing teams
- `league-media/custom-sprites` - Custom sprite variants

**Writes to:**
- `team-exports` - Export teams with versioning

**Example:**
```typescript
// Export team with versioning
const timestamp = new Date().toISOString()
const teamName = team.name.replace(/[^a-z0-9]/gi, "-")
await s3Client.send(new PutObjectCommand({
  Bucket: "team-exports",
  Key: `teams/${teamId}/${timestamp}-${teamName}.txt`,
  Body: teamExport,
  ContentType: "text/plain",
}))

// Also update latest.txt
await s3Client.send(new PutObjectCommand({
  Bucket: "team-exports",
  Key: `teams/${teamId}/latest.txt`,
  Body: teamExport,
  ContentType: "text/plain",
}))
```

---

## Usage Examples

### Upload Battle Replay

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT_EXTERNAL,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
})

async function uploadReplay(matchId: number, season: number, week: number, replayContent: string) {
  const key = `season-${season}/week-${week}/match-${matchId}/replay.log`
  
  await s3Client.send(new PutObjectCommand({
    Bucket: "battle-replays",
    Key: key,
    Body: replayContent,
    ContentType: "text/plain",
    Metadata: {
      matchId: matchId.toString(),
      season: season.toString(),
      week: week.toString(),
      uploadedAt: new Date().toISOString(),
    },
  }))
  
  return key
}
```

### Generate Public Media URL

```typescript
function getLeagueMediaUrl(path: string, internal: boolean = false): string {
  const baseUrl = internal 
    ? process.env.MINIO_ENDPOINT_INTERNAL || "http://10.0.0.5:30090"
    : process.env.MINIO_ENDPOINT_EXTERNAL || "https://s3-api-data.moodmnky.com"
  
  return `${baseUrl}/league-media/${path}`
}

// Usage
const logoUrl = getLeagueMediaUrl(`logos/teams/${teamId}.png`)
const badgeUrl = getLeagueMediaUrl(`badges/achievements/${badgeId}.png`)
```

### Generate Signed URL for Private Content

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"

async function getTeamExportUrl(teamId: number, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: "team-exports",
    Key: `teams/${teamId}/latest.txt`,
  })
  
  return await getSignedUrl(s3Client, command, { expiresIn })
}
```

### List Replays for Season

```typescript
import { ListObjectsV2Command } from "@aws-sdk/client-s3"

async function listSeasonReplays(season: number): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: "battle-replays",
    Prefix: `season-${season}/`,
  })
  
  const response = await s3Client.send(command)
  return response.Contents?.map(obj => obj.Key || "") || []
}
```

---

## Environment Variables

No new environment variables needed - existing MinIO credentials work for all buckets:

```env
# MinIO Configuration
MINIO_ENDPOINT_INTERNAL=http://10.0.0.5:30090
MINIO_ENDPOINT_EXTERNAL=https://s3-api-data.moodmnky.com
MINIO_ACCESS_KEY=jp3O2FaYMWDsK03OeMPQ
MINIO_SECRET_KEY=n9MtRoKbBtPqUFdGRxD8FbsICQdOQabzq1RemJgf
MINIO_REGION=us-east-1
```

**Bucket-specific URLs can be constructed:**
```typescript
const bucketUrl = `${MINIO_ENDPOINT_EXTERNAL}/${bucketName}/${path}`
```

---

## Setup Script

The setup script (`scripts/setup-minio-league-buckets.ts`) can be used to:
- Create buckets
- Configure policies
- Set up folder structures
- Verify configuration

**Usage:**
```bash
# Dry run (test without making changes)
pnpm tsx scripts/setup-minio-league-buckets.ts --dry-run

# Live setup (creates buckets)
pnpm tsx scripts/setup-minio-league-buckets.ts
```

---

## Maintenance

### Adding New Folders

To add new folders to existing buckets, use the MinIO client or AWS SDK:

```typescript
// Create new folder structure
await s3Client.send(new PutObjectCommand({
  Bucket: "battle-replays",
  Key: "season-6/.gitkeep",
  Body: "",
}))
```

### Changing Bucket Policies

Use the setup script or MinIO console to update bucket policies:

```bash
# Using mc CLI
mc anonymous set download local/league-media  # Public read
mc anonymous set none local/battle-replays    # Private
```

### Monitoring Usage

Check bucket sizes and object counts via MinIO console or API:

```typescript
import { ListObjectsV2Command } from "@aws-sdk/client-s3"

async function getBucketStats(bucketName: string) {
  const command = new ListObjectsV2Command({ Bucket: bucketName })
  const response = await s3Client.send(command)
  
  return {
    objectCount: response.KeyCount || 0,
    totalSize: response.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0,
  }
}
```

---

## Best Practices

### File Naming

- Use consistent naming conventions: `{season}-{week}-{match_id}-{type}.{ext}`
- Include timestamps for versioned files: `{timestamp}-{name}.{ext}`
- Use lowercase, hyphens for separators: `team-logo.png` not `Team Logo.png`

### Organization

- Group by season/week for time-based content
- Group by team/coach for user-specific content
- Group by category for media assets

### Access Control

- Use public buckets only for content that should be publicly accessible
- Use signed URLs for temporary access to private content
- Implement proper authentication checks before generating URLs

### Performance

- Use CDN caching for public buckets (Cloudflare)
- Implement lazy loading for large media files
- Compress large files before upload (videos, exports)

---

## Troubleshooting

### Bucket Not Found

**Error:** `NoSuchBucket`

**Solution:**
```bash
# Verify bucket exists
pnpm tsx scripts/setup-minio-league-buckets.ts --dry-run

# Or check via mc CLI
mc ls local
```

### Access Denied

**Error:** `AccessDenied` or `403 Forbidden`

**Solution:**
- Verify MinIO credentials are correct
- Check bucket policy (public vs private)
- Ensure service has write permissions for private buckets

### CORS Issues

**Error:** CORS errors in browser

**Solution:**
- CORS is configured globally in MinIO
- Public buckets should work without CORS issues
- For private buckets, use signed URLs instead of direct access

---

## Related Documentation

- [Sprite Source Evaluation](../temp/sprite-source-evaluation.md) - Why sprites moved to GitHub CDN
- [MinIO Creative Use Cases](../temp/minio-creative-use-cases.md) - Detailed use case analysis
- [MinIO Buckets Setup Complete](../temp/minio-buckets-setup-complete.md) - Setup verification
- [POKE MNKY Ecosystem Analysis](./POKE-MNKY-ECOSYSTEM-ANALYSIS.md) - Overall ecosystem documentation

---

## Changelog

### 2026-01-13
- ✅ Created 8 league operation buckets
- ✅ Migrated sprites to GitHub CDN
- ✅ Configured bucket policies (public/private)
- ✅ Created folder structures
- ✅ Documented integration points

---

**Last Updated:** January 13, 2026  
**Maintained By:** POKE MNKY (app) team
