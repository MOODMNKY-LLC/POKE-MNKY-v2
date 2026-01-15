# MinIO Creative Use Cases - Deep Analysis

**Date:** January 13, 2026  
**Status:** 📊 Analysis Complete  
**Context:** Sprites moved to GitHub CDN, MinIO repurposed for better use cases

---

## Executive Summary

After moving sprite storage to GitHub CDN (simpler, zero maintenance), MinIO can be repurposed for **high-value, league-specific use cases** that require custom storage, backup, and media management. This analysis identifies creative use cases that leverage MinIO's S3-compatible object storage for features that GitHub CDN cannot provide.

---

## Current MinIO Usage (To Be Repurposed)

**Current State:**
- **Bucket**: `pokedex-sprites` 
- **Purpose**: Sprite storage (58,882 files)
- **Status**: ✅ Moving to GitHub CDN
- **Available Capacity**: ~500MB-1GB freed up

**Why Repurpose:**
- Sprites are static, public assets → GitHub CDN is perfect
- MinIO is better suited for dynamic, league-specific content
- Reduces maintenance overhead (no sprite sync needed)
- Frees MinIO for higher-value use cases

---

## Recommended Use Cases (Prioritized)

### 🏆 Tier 1: High-Value League Operations

#### 1. **Battle Replay Storage & Archive** ⭐⭐⭐⭐⭐

**Use Case:**
Store Showdown battle replays (.log files) for long-term archival, analysis, and sharing.

**Why MinIO:**
- Replays are league-specific (not public assets)
- Need versioning and organization by season/match
- Can grow large over time (unlimited storage)
- Enables replay analysis tools

**Implementation:**
```
Bucket: battle-replays
Structure:
  /season-5/
    /week-1/
      /match-{match_id}/
        replay.log
        metadata.json
    /week-2/
      ...
  /season-4/
    ...
```

**Benefits:**
- ✅ Permanent replay archive (no data loss)
- ✅ Enables replay analysis features
- ✅ Share replays via direct links
- ✅ Backup for Supabase replay references
- ✅ Can build replay viewer/analyzer tools

**Integration Points:**
- Integration Worker uploads replays after battle completion
- Next.js app displays replay links
- Discord bot can share replay URLs
- Future: Replay analysis dashboard

---

#### 2. **Team Export/Import Files** ⭐⭐⭐⭐⭐

**Use Case:**
Store team export files (.txt Showdown format) for backup, sharing, and version history.

**Why MinIO:**
- Teams are league-specific (not public)
- Need versioning (team changes over time)
- Enable team sharing between coaches
- Backup for Supabase team data

**Implementation:**
```
Bucket: team-exports
Structure:
  /teams/
    /{team_id}/
      /{timestamp}-{team_name}.txt
      /latest.txt (symlink to most recent)
  /shared/
    /{share_token}/
      team.txt
```

**Benefits:**
- ✅ Team version history
- ✅ Easy team sharing (generate share links)
- ✅ Backup for team data
- ✅ Import/export functionality
- ✅ Team comparison tools

**Integration Points:**
- Team builder exports to MinIO
- Team library imports from MinIO
- Share teams via Discord bot
- Team version history in UI

---

#### 3. **League Media Assets** ⭐⭐⭐⭐

**Use Case:**
Store custom league assets: team logos, coach avatars, custom badges, league banners, custom sprites.

**Why MinIO:**
- League-specific customizations
- Need organization and access control
- Enables branding features
- Custom sprite variants (shiny forms, etc.)

**Implementation:**
```
Bucket: league-media
Structure:
  /logos/
    /teams/
      {team_id}.png
    /league/
      logo.png
      banner.png
  /avatars/
    /coaches/
      {coach_id}.png
  /badges/
    /achievements/
      {badge_id}.png
  /custom-sprites/
    /pokemon/
      {pokemon_id}-custom.png
```

**Benefits:**
- ✅ Custom branding for league
- ✅ Team identity (logos)
- ✅ Achievement system (badges)
- ✅ Custom sprite variants
- ✅ Coach avatars/profile pics

**Integration Points:**
- Team pages display logos
- Profile pages show avatars
- Achievement system displays badges
- Custom sprite variants in team builder

---

### 🎯 Tier 2: Data Management & Analytics

#### 4. **Match Screenshots & Videos** ⭐⭐⭐⭐

**Use Case:**
Store screenshots/videos of key battle moments, match highlights, and coach-submitted evidence.

**Why MinIO:**
- Large file sizes (videos)
- League-specific content
- Need organization by match/season
- Enables highlight reels

**Implementation:**
```
Bucket: match-media
Structure:
  /screenshots/
    /season-5/
      /match-{match_id}/
        turn-{turn_number}.png
  /videos/
    /highlights/
      /week-{week_number}/
        highlight.mp4
  /evidence/
    /match-{match_id}/
      {coach_id}-evidence.{ext}
```

**Benefits:**
- ✅ Match evidence storage
- ✅ Highlight reels
- ✅ Battle analysis
- ✅ Content for social media
- ✅ Dispute resolution

---

#### 5. **Draft Pool & Analytics Exports** ⭐⭐⭐

**Use Case:**
Store draft pool exports, analytics reports, and data dumps for analysis and backup.

**Why MinIO:**
- Large CSV/JSON exports
- Historical data archives
- Analytics reports (PDFs)
- Data backup/restore

**Implementation:**
```
Bucket: data-exports
Structure:
  /draft-pools/
    /season-{season_number}/
      draft-pool.json
      draft-order.csv
  /analytics/
    /season-{season_number}/
      /weekly/
        week-{week_number}-report.pdf
      /season-summary.pdf
  /backups/
    /{date}/
      teams-export.json
      matches-export.json
```

**Benefits:**
- ✅ Historical data archives
- ✅ Analytics reports
- ✅ Data backup/restore
- ✅ External analysis tools
- ✅ League transparency

---

#### 6. **Battle Statistics & Replay Analysis** ⭐⭐⭐

**Use Case:**
Store parsed battle statistics, move usage data, and replay analysis results.

**Why MinIO:**
- Generated analysis files
- Large JSON datasets
- Historical statistics
- Enables advanced analytics

**Implementation:**
```
Bucket: battle-analytics
Structure:
  /statistics/
    /season-{season_number}/
      /pokemon-usage.json
      /move-usage.json
      /type-coverage.json
  /replay-analysis/
    /match-{match_id}/
      analysis.json
      key-turns.json
```

**Benefits:**
- ✅ Advanced analytics
- ✅ Meta analysis (Pokémon usage)
- ✅ Replay insights
- ✅ Strategic analysis tools

---

### 🔧 Tier 3: Infrastructure & Operations

#### 7. **Supabase Data Backups** ⭐⭐⭐

**Use Case:**
Automated backups of critical Supabase tables (teams, matches, standings) for disaster recovery.

**Why MinIO:**
- Large backup files
- Versioned backups
- Disaster recovery
- Compliance/audit trail

**Implementation:**
```
Bucket: supabase-backups
Structure:
  /daily/
    /{date}/
      teams.json
      matches.json
      standings.json
  /weekly/
    /{date}/
      full-dump.sql.gz
```

**Benefits:**
- ✅ Disaster recovery
- ✅ Data versioning
- ✅ Audit compliance
- ✅ Migration support

---

#### 8. **League Documentation & Assets** ⭐⭐

**Use Case:**
Store league rules PDFs, season guides, custom documentation, and training materials.

**Why MinIO:**
- PDF documents
- Custom guides
- Training materials
- Rule updates

**Implementation:**
```
Bucket: league-docs
Structure:
  /rules/
    season-5-rules.pdf
    draft-guide.pdf
  /guides/
    team-building-guide.pdf
    battle-strategy.pdf
```

**Benefits:**
- ✅ Centralized documentation
- ✅ Version control for docs
- ✅ Easy sharing
- ✅ Training resources

---

## Recommended Implementation Priority

### Phase 1: Immediate Value (Week 1)
1. **Battle Replay Storage** - High value, easy integration
2. **Team Export/Import** - Enhances team builder features

### Phase 2: Enhanced Features (Week 2-3)
3. **League Media Assets** - Custom branding and identity
4. **Match Screenshots/Videos** - Content and evidence

### Phase 3: Advanced Features (Month 2+)
5. **Analytics Exports** - Data analysis tools
6. **Battle Statistics** - Advanced analytics
7. **Supabase Backups** - Infrastructure reliability
8. **Documentation Storage** - League resources

---

## Technical Implementation Notes

### Bucket Structure
```
poke-mnky-storage/
├── battle-replays/      (Primary use case)
├── team-exports/        (High value)
├── league-media/        (Branding)
├── match-media/         (Content)
├── data-exports/        (Analytics)
├── battle-analytics/   (Advanced features)
├── supabase-backups/   (Infrastructure)
└── league-docs/        (Resources)
```

### Access Patterns
- **Public Read**: League media (logos, badges)
- **Authenticated Read**: Team exports, match media
- **Admin Write**: All buckets
- **Service Write**: Integration worker, Discord bot

### Integration Points
- **Integration Worker**: Upload replays, match media
- **Next.js App**: Display media, download exports
- **Discord Bot**: Share links, upload evidence
- **Team Builder**: Export/import teams

---

## Benefits Summary

**Why These Use Cases Are Better Than Sprites:**

1. **League-Specific**: Content unique to your league (not public assets)
2. **Dynamic**: Content changes over time (teams, replays, media)
3. **High Value**: Features that differentiate your platform
4. **Scalable**: Can grow with league size
5. **Customizable**: Full control over organization and access

**MinIO Advantages:**
- ✅ Unlimited storage (vs GitHub repo limits)
- ✅ Custom organization (vs flat GitHub structure)
- ✅ Access control (public/private buckets)
- ✅ Versioning support
- ✅ S3-compatible (works with existing tools)
- ✅ Self-hosted (full control)

---

## Conclusion

**MinIO is perfect for league-specific, dynamic content** that requires:
- Custom organization
- Access control
- Versioning
- Large file storage
- Backup/archive capabilities

**Sprites belong on GitHub CDN** (static, public, zero maintenance).

**MinIO belongs with league operations** (dynamic, custom, high-value features).

This repurposing transforms MinIO from a sprite storage solution into a **core league infrastructure component** that enables advanced features and better user experiences.
