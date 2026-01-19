# Environment Variable Setup - Vector Store ID

**Date**: January 18, 2026  
**Vector Store ID**: `vs_696dca10ada081919c5fe9b2d0a1047e`  
**Source**: OpenAI Storage Dashboard

---

## ✅ Code Integration Complete

The code has been updated to use the vector store ID. You just need to add it to your environment variables.

---

## 🔧 Local Development Setup

### Add to `.env.local`

**File**: `.env.local` (in project root, gitignored)

**Add this line**:
```bash
OPENAI_VECTOR_STORE_ID=vs_696dca10ada081919c5fe9b2d0a1047e
```

**Full section** (if you have other OpenAI vars):
```bash
# -----------------------------------------------------------------------------
# OpenAI Configuration
# -----------------------------------------------------------------------------
OPENAI_API_KEY=sk-...
OPENAI_VECTOR_STORE_ID=vs_696dca10ada081919c5fe9b2d0a1047e
```

---

## 🚀 Production Setup (Vercel)

### Add via Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Project: `poke-mnky-v2`
   - Settings → Environment Variables

2. **Add Variable**:
   - **Name**: `OPENAI_VECTOR_STORE_ID`
   - **Value**: `vs_696dca10ada081919c5fe9b2d0a1047e`
   - **Environment**: Production, Preview, Development (select all)

3. **Save** and redeploy

### Add via Vercel CLI

```bash
vercel env add OPENAI_VECTOR_STORE_ID production
# Enter: vs_696dca10ada081919c5fe9b2d0a1047e

vercel env add OPENAI_VECTOR_STORE_ID preview
# Enter: vs_696dca10ada081919c5fe9b2d0a1047e

vercel env add OPENAI_VECTOR_STORE_ID development
# Enter: vs_696dca10ada081919c5fe9b2d0a1047e
```

---

## ✅ Verification

### Check if Variable is Set

**Local**:
```bash
# Check .env.local
cat .env.local | grep OPENAI_VECTOR_STORE_ID
# Should show: OPENAI_VECTOR_STORE_ID=vs_696dca10ada081919c5fe9b2d0a1047e
```

**Production**:
```bash
# Check Vercel environment variables
vercel env ls
# Should show OPENAI_VECTOR_STORE_ID in the list
```

### Test in Code

**Console Logs** (when using Responses API):
```
[General Assistant] Using Responses API: {
  ...
  vectorStoreId: 'configured'  // ✅ Should show 'configured' if set
}
```

If not set, will show:
```
vectorStoreId: 'not configured'  // ⚠️ Need to add env var
```

---

## 📋 What This Enables

### File Search with Vector Store

When `OPENAI_VECTOR_STORE_ID` is configured:

- ✅ **Semantic Search** - Search documents by meaning, not just keywords
- ✅ **Persistent Storage** - Documents stored in vector store, no need to re-upload
- ✅ **Multi-Document** - Search across all documents in the vector store
- ✅ **Better Results** - More accurate and relevant search results

### How It Works

1. User asks question about documents
2. Assistant uses `file_search` tool
3. Tool searches vector store (`vs_696dca10ada081919c5fe9b2d0a1047e`)
4. Returns relevant document excerpts
5. Assistant includes excerpts in response

---

## 🔗 Related Documentation

- [Vector Store Integration](./VECTOR-STORE-INTEGRATION.md) - Full integration details
- [Responses API Implementation](./RESPONSES-API-IMPLEMENTATION.md) - Responses API setup
- [Public Chat API Analysis](./PUBLIC-CHAT-API-ANALYSIS.md) - Public user capabilities

---

## ⚠️ Important Notes

### Vector Store Management

**View Vector Store**:
- OpenAI Dashboard: https://platform.openai.com/storage
- Vector Store ID: `vs_696dca10ada081919c5fe9b2d0a1047e`

**Add Documents**:
1. Go to OpenAI Storage Dashboard
2. Select vector store
3. Upload files or add from file storage
4. Documents are automatically indexed

### Cost Considerations

- Vector Store storage costs apply
- File search API calls have costs
- Monitor usage in OpenAI dashboard

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **READY TO ADD** - Code is integrated, just add env var
