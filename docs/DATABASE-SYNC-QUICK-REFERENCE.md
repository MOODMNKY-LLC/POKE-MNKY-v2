# Database Sync - Quick Reference

**Quick commands for syncing production and local databases**

---

## 🚀 Quick Commands

### Before Server Agent Works

```bash
pnpm db:sync:pre
# OR
pnpm tsx scripts/sync-db-pre-server.ts
```

**What it does**:
- Pulls current production schema
- Applies migrations locally
- Ensures local is up-to-date

---

### After Server Agent Completes

```bash
pnpm db:sync:post
# OR
pnpm tsx scripts/sync-db-post-server.ts
```

**What it does**:
- Pulls server agent's changes
- Applies all migrations locally
- Pushes everything to production

---

### Check Sync Status Anytime

```bash
pnpm db:sync:safe
# OR
pnpm db:diff
```

**What it does**:
- Shows differences between local and production
- Safe to run (read-only)

---

## 📝 Manual Commands

```bash
# Pull from production
pnpm db:pull
# OR
supabase db pull

# Apply migrations locally
pnpm db:migrate
# OR
supabase migration up

# Push to production
pnpm db:push
# OR
supabase db push

# Check differences
pnpm db:diff
# OR
supabase db diff
```

---

## ⚠️ Important Notes

1. **Always run pre-sync before server agent**
2. **Always run post-sync after server agent**
3. **Review migrations before pushing**
4. **Test locally first**

---

## 📚 Full Documentation

See `docs/DATABASE-SYNC-WORKFLOW.md` for complete guide.

---

**Last Updated**: January 17, 2026
