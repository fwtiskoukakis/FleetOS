# ✅ Today Activity Fix

## Problem

A pickup scheduled for today was showing in the Week view but not in the Today view.

## Root Cause

The `getContractsByDateRange` function uses database queries that filter by both:
1. `pickup_date >= startDate`
2. `dropoff_date <= endDate`

This means for the "Today" query, it was only returning contracts where **both** the pickup AND dropoff dates fall within today's date range. This would miss:
- Contracts starting today but ending later in the week/month
- Contracts that started earlier but are ending today

For the Week view, it was using a broader date range, so it would catch pickups happening today even if the dropoff was later.

## Solution

Changed from using `getContractsByDateRange` with a narrow date filter to using `getAllContracts()` and then filtering in-memory using `isSameDay`.

### Before:
```typescript
const todayContracts = await SupabaseContractService.getContractsByDateRange(todayStart, todayEnd);
todayContracts.forEach(contract => {
  if (isSameDay(pickupDate, today)) { ... }
});
```

### After:
```typescript
const allContracts = await SupabaseContractService.getAllContracts();
allContracts.forEach(contract => {
  if (isSameDay(pickupDate, today)) { ... }
});
```

### Additional Fix:
Ensured `today` is normalized to start of day for consistent date comparisons:
```typescript
const today = startOfDay(new Date()); // Ensure we're comparing dates only
```

## Benefits

✅ **Accurate**: Shows all pickups/dropoffs happening today regardless of when they end/started  
✅ **Efficient**: Single query for both Today and Week views  
✅ **Consistent**: Same logic for both views, just different date filters  
✅ **Future-proof**: Will work correctly even with long-term rentals

## Performance

Since we're now loading all contracts:
- Added benefit: Reusing `allContracts` for both Today and Week calculations
- Single database query instead of two
- Minimal memory impact: Only storing events, not full contracts

---

*Fixed: January 2025*

