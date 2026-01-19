# Vector Store Workflow - Responses API Integration

**Date**: January 18, 2026  
**Vector Store ID**: `vs_696dca10ada081919c5fe9b2d0a1047e`  
**Status**: ✅ **CONFIGURED**

---

## 📋 Overview

This document describes the complete workflow for using Vector Stores with Responses API's `file_search` tool, following OpenAI's recommended approach.

---

## 🔄 Complete Workflow

### Step 1: Create a Vector Store ✅ **DONE**

**Status**: Vector store already created  
**Vector Store ID**: `vs_696dca10ada081919c5fe9b2d0a1047e`

**How to Create** (for reference):
1. Go to OpenAI Storage Dashboard: https://platform.openai.com/storage
2. Click "Create Vector Store"
3. Name your vector store (e.g., "POKE MNKY Documentation")
4. Copy the vector store ID

**Current Configuration**:
- Vector Store ID stored in `OPENAI_VECTOR_STORE_ID` environment variable
- Already integrated into Responses API implementation

---

### Step 2: Upload Files and Attach to Vector Store

**This is the standard flow for file search.**

#### 2a. Upload Files via Files API

**Using OpenAI SDK**:
```typescript
import { getOpenAI } from '@/lib/openai-client'

const openai = getOpenAI()

// Upload a file
const file = await openai.files.create({
  file: fs.createReadStream('path/to/document.pdf'),
  purpose: 'assistants', // Required for vector stores
})

console.log('File uploaded:', file.id) // e.g., "file-abc123"
```

**Using cURL**:
```bash
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "file=@document.pdf" \
  -F "purpose=assistants"
```

**Response**:
```json
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 12345,
  "created_at": 1234567890,
  "filename": "document.pdf",
  "purpose": "assistants"
}
```

#### 2b. Attach File to Vector Store

**Using OpenAI SDK**:
```typescript
const openai = getOpenAI()
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID

// Attach file to vector store
const vectorStoreFile = await openai.beta.vectorStores.files.create(
  vectorStoreId!,
  {
    file_id: file.id,
  }
)

console.log('File attached to vector store:', vectorStoreFile.id)
```

**Using cURL**:
```bash
curl https://api.openai.com/v1/vector_stores/vs_696dca10ada081919c5fe9b2d0a1047e/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "file-abc123"
  }'
```

**Response**:
```json
{
  "id": "vsfile-xyz789",
  "object": "vector_store.file",
  "created_at": 1234567890,
  "vector_store_id": "vs_696dca10ada081919c5fe9b2d0a1047e",
  "status": "completed",
  "file_id": "file-abc123"
}
```

#### 2c. Wait for Processing

Files are processed asynchronously. Check status:

```typescript
// Check file status
const status = await openai.beta.vectorStores.files.retrieve(
  vectorStoreId!,
  vectorStoreFile.id
)

console.log('File status:', status.status) // "completed" when ready
```

**Status Values**:
- `in_progress` - File is being processed
- `completed` - File is ready for search
- `failed` - Processing failed

---

### Step 3: Call Responses API with file_search

**Current Implementation** (`app/api/ai/assistant/route.ts`):

```typescript
// File search - use vector store if configured
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
if (vectorStoreId) {
  tools.push({
    type: "file_search",
    require_approval: "never",
    vector_store_ids: [vectorStoreId], // ✅ Points to vector store
  })
}
```

**How It Works**:
1. User asks question about documents
2. Responses API receives request with `file_search` tool
3. Tool searches vector store (`vs_696dca10ada081919c5fe9b2d0a1047e`)
4. Returns relevant document excerpts
5. Assistant includes excerpts in response

---

## 🛠️ Helper Functions

### Upload and Attach File to Vector Store

**Location**: `lib/openai-client.ts` (add this)

```typescript
/**
 * Upload a file and attach it to the vector store
 * 
 * @param filePath - Path to file to upload
 * @param vectorStoreId - Vector store ID (defaults to env var)
 * @returns File ID and vector store file ID
 */
export async function uploadFileToVectorStore(
  filePath: string,
  vectorStoreId?: string
): Promise<{
  fileId: string
  vectorStoreFileId: string
  status: string
}> {
  const openaiClient = getOpenAIClient()
  const fs = await import('fs')
  
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  if (!vsId) {
    throw new Error('Vector store ID not configured. Set OPENAI_VECTOR_STORE_ID environment variable.')
  }

  // Step 1: Upload file
  const file = await openaiClient.files.create({
    file: fs.createReadStream(filePath),
    purpose: 'assistants',
  })

  console.log('[Vector Store] File uploaded:', file.id)

  // Step 2: Attach to vector store
  const vectorStoreFile = await openaiClient.beta.vectorStores.files.create(
    vsId,
    {
      file_id: file.id,
    }
  )

  console.log('[Vector Store] File attached:', vectorStoreFile.id)

  return {
    fileId: file.id,
    vectorStoreFileId: vectorStoreFile.id,
    status: vectorStoreFile.status,
  }
}

/**
 * Check vector store file status
 */
export async function checkVectorStoreFileStatus(
  vectorStoreFileId: string,
  vectorStoreId?: string
): Promise<{
  status: string
  fileId: string
}> {
  const openaiClient = getOpenAIClient()
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  
  if (!vsId) {
    throw new Error('Vector store ID not configured')
  }

  const status = await openaiClient.beta.vectorStores.files.retrieve(
    vsId,
    vectorStoreFileId
  )

  return {
    status: status.status,
    fileId: status.file_id,
  }
}

/**
 * List all files in vector store
 */
export async function listVectorStoreFiles(
  vectorStoreId?: string
): Promise<Array<{
  id: string
  fileId: string
  status: string
  createdAt: number
}>> {
  const openaiClient = getOpenAIClient()
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  
  if (!vsId) {
    throw new Error('Vector store ID not configured')
  }

  const files = await openaiClient.beta.vectorStores.files.list(vsId)

  return files.data.map(file => ({
    id: file.id,
    fileId: file.file_id,
    status: file.status,
    createdAt: file.created_at,
  }))
}
```

---

## 📝 Usage Examples

### Upload a Document

```typescript
import { uploadFileToVectorStore } from '@/lib/openai-client'

// Upload and attach to vector store
const result = await uploadFileToVectorStore('./docs/league-rules.pdf')

console.log('File ID:', result.fileId)
console.log('Vector Store File ID:', result.vectorStoreFileId)
console.log('Status:', result.status) // "in_progress" or "completed"
```

### Check Processing Status

```typescript
import { checkVectorStoreFileStatus } from '@/lib/openai-client'

const status = await checkVectorStoreFileStatus('vsfile-xyz789')

if (status.status === 'completed') {
  console.log('File is ready for search!')
} else {
  console.log('File is still processing...')
}
```

### List All Files in Vector Store

```typescript
import { listVectorStoreFiles } from '@/lib/openai-client'

const files = await listVectorStoreFiles()

console.log(`Vector store contains ${files.length} files:`)
files.forEach(file => {
  console.log(`- ${file.fileId} (${file.status})`)
})
```

### Use in Chat

Once files are uploaded and processed, users can ask:

- "What do the league rules say about [topic]?"
- "Search the documentation for [information]"
- "What's in the uploaded files about [subject]?"

The `file_search` tool will automatically search the vector store and return relevant excerpts.

---

## 🔍 Monitoring

### Check Vector Store Status

**OpenAI Dashboard**:
- Go to: https://platform.openai.com/storage
- Select vector store: `vs_696dca10ada081919c5fe9b2d0a1047e`
- View files, status, and usage

### API Monitoring

**List Files**:
```bash
curl https://api.openai.com/v1/vector_stores/vs_696dca10ada081919c5fe9b2d0a1047e/files \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Check File Status**:
```bash
curl https://api.openai.com/v1/vector_stores/vs_696dca10ada081919c5fe9b2d0a1047e/files/vsfile-xyz789 \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## ⚠️ Important Notes

### File Processing

- **Asynchronous**: Files are processed asynchronously
- **Wait for Completion**: Check status before expecting search results
- **Status Values**: `in_progress` → `completed` → ready for search

### File Types Supported

- PDF files
- Text files (.txt, .md)
- Code files (.js, .ts, .py, etc.)
- Documents (.docx, etc.)

### Best Practices

1. **Upload Once**: Upload files once, reuse in multiple conversations
2. **Check Status**: Always check file status before using
3. **Organize**: Use descriptive filenames for easier management
4. **Monitor**: Regularly check vector store for outdated files

---

## 🚀 Next Steps

### Phase 1: Setup ✅ **COMPLETE**
- [x] Vector store created
- [x] Vector store ID configured
- [x] Responses API integration complete

### Phase 2: File Management ⏳ **PENDING**
- [ ] Create helper functions for upload/attach
- [ ] Create admin UI for file management
- [ ] Add file upload endpoint
- [ ] Add file status checking

### Phase 3: Documentation ⏳ **PENDING**
- [ ] Document which files are in vector store
- [ ] Create upload guide for admins
- [ ] Document file naming conventions

---

## 📚 Related Documentation

- [Vector Store Integration](./VECTOR-STORE-INTEGRATION.md) - Integration details
- [Environment Variable Setup](./ENV-VECTOR-STORE-SETUP.md) - Env var configuration
- [Responses API Implementation](./RESPONSES-API-IMPLEMENTATION.md) - Responses API setup

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **WORKFLOW DOCUMENTED** - Ready for File Upload Implementation
