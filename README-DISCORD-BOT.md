# Discord Bot - Quick Reference

## 🚀 Quick Start (Local Development)

```bash
# 1. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 2. Run bot with hot-reload
pnpm run discord-bot:dev
```

That's it! The bot will start and automatically restart when you make code changes.

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm run discord-bot` | Run bot once |
| `pnpm run discord-bot:dev` | Run bot with hot-reload (recommended for dev) |

## 🔧 Development vs Production

### Local Development
- Use `pnpm run discord-bot:dev` for hot-reload
- Edit code in `lib/discord-bot.ts` and see changes instantly
- Test commands in your Discord server
- Debug easily with console logs

### Production (Coolify)
- Deploy using `Dockerfile.discord-bot`
- Use `docker-compose.discord-bot.yml` for Coolify
- See `COOLIFY-DEPLOYMENT.md` for details

## 📚 Documentation

- **LOCAL-DEVELOPMENT.md** - Complete local dev guide
- **COOLIFY-DEPLOYMENT.md** - Production deployment guide
- **SCRIPTS-GUIDE.md** - All scripts explained

## ⚡ Tips

1. **Run Next.js and Bot Together:**
   ```bash
   # Terminal 1
   pnpm dev
   
   # Terminal 2
   pnpm run discord-bot:dev
   ```

2. **Test Commands:**
   - `/standings` - View standings
   - `/pokemon name:Pikachu` - Look up Pokemon
   - `/matchups week:1` - View matchups

3. **Debug:**
   - Check console output
   - Review Supabase logs
   - Verify Discord bot permissions
