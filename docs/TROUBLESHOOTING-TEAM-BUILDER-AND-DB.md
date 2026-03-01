# Troubleshooting: Team Builder and Database

## Team builder teams not saving

If saving a team from the Team Builder shows "Failed to save team" or teams don’t appear in My Teams:

1. **Check the toast message**  
   The app now surfaces the API error. Look for messages like:
   - "Failed to create coach record. Please contact support." → coach row could not be created (e.g. DB/RLS).
   - "No Pokemon found in team" → team text could not be parsed (parser/Koffing).
   - Any other message → use it to narrow down the failure.

2. **Self-signed certificate (local or custom Supabase)**  
   If the Next.js server talks to Supabase over SSL with a self-signed cert, the server-side request can fail with a TLS error and the client may see a generic failure. For **local development only**, you can allow insecure TLS when starting the app:

   ```bash
   # Windows (PowerShell)
   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dev

   # Unix/macOS
   NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm dev
   ```

   Do not use this in production. Prefer a valid certificate or a proper CA for production.

3. **Coach record**  
   The first time you save a team, the API ensures a row exists in `public.coaches` for your user. If that insert fails (e.g. missing table, RLS, or unique constraint), you’ll get "Failed to create coach record." Ensure migrations for `coaches` and `showdown_teams` are applied.

## Stock teams seed: self-signed certificate

When running `npm run db:seed:showdown:ts` (or `pnpm exec tsx scripts/seed-stock-teams.ts`), if you see:

```text
Seed failed: Error: self-signed certificate in certificate chain
  code: 'SELF_SIGNED_CERT_IN_CHAIN'
```

- By default, the seed script **allows** self-signed certificates when `NODE_ENV` is not `production`.
- If you run with `NODE_ENV=production`, allow self-signed certs for that run only:

  ```bash
  PGSSL_REJECT_UNAUTHORIZED=false npm run db:seed:showdown:ts
  ```

- Use only for development or trusted databases. See [docs/STOCK-TEAMS.md](STOCK-TEAMS.md) for full seed options.
