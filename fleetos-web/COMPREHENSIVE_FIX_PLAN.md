# Comprehensive Fix Plan: Make Web App Match Mobile App Exactly

## Status: IN PROGRESS

This is a **very large task** requiring multiple iterations. I've created this document to track all differences and fixes needed.

## ✅ Already Fixed
- Dashboard stats calculation (active rentals, monthly revenue, customer count)
- Fleet loading logic (organization_id based filtering)
- **Fuel level scale** - Changing from 0-100% to 0-8 scale (IN PROGRESS)

## 🔄 Currently Fixing
1. **Fuel Level (0-8 scale)** - In Progress
   - [x] Contract creation page
   - [ ] Contract edit page
   - [ ] Contract details page
   - [ ] Contract service (save/load)
   - [ ] Dashboard display

## 📋 Critical Fixes Needed (Priority Order)

### Priority 1: Contract Creation/Editing (HIGH)
1. **Fuel Level** - Change from 0-100% to 0-8 scale ✅ (in progress)
2. **Signature Capture** - Add signature pad component
3. **Damage Points** - Add car diagram with damage marking
4. **Photo Upload** - Add photo capture/upload functionality
5. **Contract Templates** - Add template selector (can be lower priority)

### Priority 2: Contract Details/Display (MEDIUM)
1. Display fuel level correctly (0-8 scale)
2. Display signature in contract details
3. Display damage points with car diagram
4. Display photos in gallery viewer
5. Show AADE status (if applicable)
6. Add phone call button

### Priority 3: List Pages (MEDIUM)
1. **Contracts List** - Add AADE status, phone call button
2. **Fleet List** - Add grid views, sorting, availability checking
3. **Customers List** - Add VIP/blacklist badges, filters, edit functionality

### Priority 4: Missing Features (MEDIUM)
1. Customer edit functionality (modal/form)
2. Customer details/history page
3. Car details improvements (stats, damage history)

### Priority 5: Missing Pages (LOW - can be added later)
1. Settings/Profile page
2. Analytics page
3. Calendar page
4. Maintenance page
5. Damages page

## Implementation Strategy

Since this is too large to do all at once, I'll work in iterations:

**Iteration 1** (Current):
- Fix fuel level scale (0-8) across all pages
- Verify all existing fields match

**Iteration 2**:
- Add signature capture component
- Add damage points component  
- Add photo upload component

**Iteration 3**:
- Improve contract details page
- Improve list pages (filters, badges, buttons)

**Iteration 4+**:
- Add missing pages
- Polish and final matching

## Notes

- The mobile app uses **0-8 scale** for fuel (8 = full tank)
- The mobile app has **signature capture** with SVG path storage
- The mobile app has **damage points** with car diagram (front/rear/left/right views)
- The mobile app has **photo upload** with Supabase storage
- All dates/times should use **Greek locale** formatting

