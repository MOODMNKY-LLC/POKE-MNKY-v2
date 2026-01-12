# Parser Testing Action Plan

## 🎯 Current Status

### ✅ Completed Tests
- **Teams Parser**: ✅ Working (20 records in 24s)

### ⚠️ Issues Identified
- **Rules Parser**: Timing out (>60s) - needs further optimization

### ⏳ Pending Tests
- **Draft Parser**: Optimized, needs verification
- **Master Data Parser**: Optimized, needs testing
- **Team Page Parser**: Optimized, needs testing

---

## 🚀 Immediate Actions

### 1. Optimize Rules Parser Further ⚡ HIGH PRIORITY
**Current Issue**: OpenAI call taking >60 seconds

**Actions**:
```typescript
// Reduce JSON payload from 100 to 50 rows
${JSON.stringify(cellData.slice(0, 50), null, 2)}

// Consider splitting into sections
// Use faster model for simpler tasks
```

**Files to Update**:
- `lib/google-sheets-parsers/rules-parser.ts`

**Expected Outcome**: Parser completes in <60s

---

### 2. Test Draft Parser ⚡ HIGH PRIORITY
**Goal**: Verify getRows() optimization fixes scope issues

**Test Command**:
```bash
npx tsx scripts/test-parsers-safe.ts [spreadsheet_id] "Draft Board" "draft"
```

**Expected Outcome**: Parser completes without scope errors

**If Fails**:
- Check if sheet has headers
- Handle grid detection differently
- Use smaller chunks

---

### 3. Test Master Data Parser ⚡ MEDIUM PRIORITY
**Goal**: Verify complex parsing works

**Test Command**:
```bash
npx tsx scripts/test-parsers-safe.ts [spreadsheet_id] "Master Data Sheet" "master_data"
```

**Expected Outcome**: Parser detects tables and processes data

**If Fails**:
- Process tables sequentially
- Skip empty tables
- Limit initial analysis

---

### 4. Test Team Page Parser ⚡ MEDIUM PRIORITY
**Goal**: Verify section detection works

**Test Command**:
```bash
# Find a team page sheet first
npx tsx scripts/test-parsers-safe.ts [spreadsheet_id] "[Team Name]" "team_page"
```

**Expected Outcome**: Parser detects sections and processes data

**If Fails**:
- Optimize image extraction
- Handle different formats
- Cache section detection

---

## 📋 Testing Checklist

### Phase 1: Critical Fixes
- [ ] Optimize Rules parser payload (50 rows)
- [ ] Test Rules parser again
- [ ] Test Draft parser
- [ ] Fix any scope issues

### Phase 2: Complete Testing
- [ ] Test Master Data parser
- [ ] Test Team Page parser
- [ ] Document all results
- [ ] Create test report

### Phase 3: Enhancements
- [ ] Implement Generic parser
- [ ] Add retry logic
- [ ] Create comprehensive test suite
- [ ] Performance optimization

---

## 🔧 Quick Fixes to Apply

### Rules Parser Optimization
```typescript
// In rules-parser.ts, line ~188
Sheet data (showing first 50 rows for analysis):
${JSON.stringify(cellData.slice(0, 50), null, 2)}
```

### Test Script Timeout
```typescript
// Already updated to 90s ✅
```

---

## 📊 Expected Results

### After Optimizations
| Parser | Expected Duration | Expected Success |
|--------|------------------|------------------|
| Teams | <30s | ✅ 100% |
| Rules | <60s | ⚠️ 80% |
| Draft | <30s | ⚠️ 90% |
| Master Data | <60s | ⚠️ 85% |
| Team Page | <45s | ⚠️ 85% |

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Rules parser completes in <60s
- ✅ Draft parser works without scope errors
- ✅ All parsers tested
- ✅ >80% success rate

### Phase 2 Complete When:
- ✅ Generic parser implemented
- ✅ Retry logic added
- ✅ Test suite created
- ✅ Documentation complete

---

**Status**: Ready to proceed with optimizations and testing! 🚀
