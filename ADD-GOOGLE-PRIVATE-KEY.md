# Add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to Vercel

> **Status**: Manual Step Required

---

## Variable to Add

**Name**: `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

**Value**: Copy from `.env.local` (the entire value including `***REMOVED***`
   - Ends with: `-----END PRIVATE KEY-----`
   - Includes all `\n` characters (they represent newlines)
5. **Environments**: Select all (Production, Preview, Development)
6. Click **"Save"**

### Option 2: Vercel CLI

**Note**: The private key contains newlines, so CLI is trickier. Dashboard is recommended.

If using CLI:

1. Copy the private key value from `.env.local`
2. Save it to a temporary file (e.g., `temp-key.txt`)
3. Run:
   ```bash
   cat temp-key.txt | vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production
   cat temp-key.txt | vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY preview
   cat temp-key.txt | vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY development
   ```
4. Delete the temporary file: `rm temp-key.txt`

---

## Value Location

In `.env.local`, find:
```
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Copy the entire value between the quotes (including the `\n` characters).

---

## Why This Variable?

Your code supports both:
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (preferred, new)
- `GOOGLE_PRIVATE_KEY` (legacy, backward compatible)

Currently, `GOOGLE_PRIVATE_KEY` is in Vercel, but adding `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` ensures compatibility with newer code patterns.

---

## Verification

After adding, verify:

```bash
vercel env ls | Select-String -Pattern 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'
```

Should show the variable in all environments.

---

**Recommendation**: Use Vercel Dashboard (Option 1) - it's easier for multi-line values like private keys.
