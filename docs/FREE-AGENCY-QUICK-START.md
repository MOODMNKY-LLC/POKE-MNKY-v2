# Free Agency System - Quick Start Guide

> **Status**: ✅ Ready to Use  
> **Date**: 2026-01-16

---

## 🚀 Quick Start

### **For Coaches:**

1. **Navigate to Free Agency**
   - Go to `/dashboard/free-agency`
   - Or click "Free Agency" in sidebar under "My Team"

2. **Submit a Transaction**
   - Select transaction type (Replacement, Addition, Drop Only)
   - Choose Pokemon to add/drop
   - Review validation preview
   - Click "Submit Transaction"

3. **Browse Available Pokemon**
   - Switch to "Browse Available" tab
   - Filter by points, generation, or search
   - Use Pokemon names in transaction form

4. **View History**
   - Switch to "Transaction History" tab
   - See all your transactions and their status

---

## 📋 Transaction Types

### **1. Replacement**
- Drop one Pokemon, add another
- Roster size stays the same
- Point difference applied to budget

**Example:** Drop Pikachu (12pts), Add Slowking (15pts) = +3pts

### **2. Addition**
- Add Pokemon without dropping
- Roster size increases by 1
- Must have space (≤10 Pokemon)

**Example:** Add Charizard (18pts) = +18pts, roster size +1

### **3. Drop Only**
- Drop Pokemon without adding
- Roster size decreases by 1
- Must maintain minimum (≥8 Pokemon)

**Example:** Drop Bulbasaur (12pts) = -12pts, roster size -1

---

## ✅ Validation Rules

- **Budget**: Total points ≤ 120
- **Roster Size**: 8 ≤ size ≤ 10
- **Transaction Limit**: ≤ 10 transactions per season
- **Availability**: Added Pokemon must be available (not on any roster)
- **Ownership**: You must be coach of the team

---

## 🤖 Discord Bot Commands (Coming Soon)

```
/free-agency-submit type:replacement add:Slowking drop:Pikachu
/free-agency-status
/free-agency-available search:Charizard min_points:15
/free-agency-history
```

See `docs/FREE-AGENCY-DISCORD-INTEGRATION.md` for full implementation details.

---

## 🔧 Admin Functions

**Process Transaction:**
- POST `/api/free-agency/process`
- Requires admin role
- Processes approved transactions
- Updates team rosters and transaction counts

---

**Ready to use!** Navigate to `/dashboard/free-agency` to get started! 🎉
