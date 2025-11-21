# Mobile App vs Web App - Complete Comparison Checklist

## ✅ Already Matching
- Dashboard stats calculation (active rentals, monthly revenue, customer count)
- Fleet loading logic (organization_id based filtering)

## ❌ Missing/Critical Differences

### 1. Contract Creation (new-contract.tsx vs rentals/new/page.tsx)
**Mobile App Has:**
- [ ] Fuel level tracking (0-8 scale, not 0-100%)
- [ ] Signature capture with SignaturePad component
- [ ] Damage points tracking with CarDiagram component (front/rear/left/right views)
- [ ] Photo upload functionality (capture/upload from gallery)
- [ ] Contract templates selector
- [ ] All fields: taxId, driverLicenseNumber, address
- [ ] Insurance cost tracking
- [ ] Deposit amount tracking
- [ ] Observations field
- [ ] Customer auto-creation from renter info

**Web App Has:**
- ✅ Basic renter info (missing some fields)
- ✅ Rental period (dates, times, locations)
- ✅ Car selection
- ✅ Basic car condition (but fuel is 0-100%, should be 0-8)
- ❌ No signature capture
- ❌ No damage points
- ❌ No photo upload
- ❌ No contract templates
- ❌ Missing some fields

### 2. Contract Details (contract-details.tsx vs rentals/[id]/page.tsx)
**Mobile App Has:**
- [ ] Full contract details display
- [ ] Photo gallery viewer
- [ ] Signature display
- [ ] Damage points display with car diagram
- [ ] Edit contract button
- [ ] Renew contract functionality
- [ ] PDF generation
- [ ] AADE submission status and actions
- [ ] Contract photos management
- [ ] Fuel level display (0-8 scale)

**Web App:**
- [ ] Need to check what exists

### 3. Contract List (contracts.tsx vs rentals/page.tsx)
**Mobile App Has:**
- [ ] Filters: all, active, upcoming, completed
- [ ] Search by name or license plate
- [ ] Contract cards with status badges
- [ ] Phone call button
- [ ] Actual status calculation (based on dates/times)
- [ ] AADE status display

**Web App Has:**
- ✅ Basic filters (all, active, completed, pending)
- ✅ Search functionality
- ✅ Status calculation
- ❌ Missing AADE status display
- ❌ Missing phone call button

### 4. Cars/Fleet (cars.tsx vs fleet/page.tsx)
**Mobile App Has:**
- [ ] Grid/list view toggle (grid3, grid4, grid5, list)
- [ ] Sort options (urgent, kteo_due, insurance_due, tires_due, service_due)
- [ ] Availability checking (filter by pickup/dropoff dates)
- [ ] Status filter (all, available, rented, maintenance)
- [ ] Vehicle cards with status indicators
- [ ] Maintenance urgency indicators
- [ ] Delete vehicle functionality

**Web App Has:**
- ✅ Basic list view
- ✅ Search functionality
- ❌ No grid view options
- ❌ No sort options
- ❌ No availability checking
- ❌ Missing status filter
- ❌ Missing maintenance indicators

### 5. Car Details (car-details.tsx vs fleet/[id]/page.tsx)
**Mobile App Has:**
- [ ] Full car information display
- [ ] Stats (total contracts, revenue, damages)
- [ ] Damage history display
- [ ] Contracts list for this car
- [ ] Edit button
- [ ] Delete button

**Web App:**
- [ ] Need to check

### 6. Customers (customer-database.tsx vs customers/page.tsx)
**Mobile App Has:**
- [ ] Customer cards with avatar
- [ ] VIP status badge
- [ ] Blacklist status badge
- [ ] Customer rating display
- [ ] Filters (all, vip, blacklisted, expired)
- [ ] Edit customer modal
- [ ] Delete customer functionality
- [ ] Customer details modal with history
- [ ] Stats display (total customers, VIP, blacklisted)

**Web App Has:**
- ✅ Basic customer list
- ✅ Search functionality
- ❌ Missing VIP/blacklist status
- ❌ Missing customer rating
- ❌ Missing filters
- ❌ Missing edit functionality
- ❌ Missing customer details/history

### 7. Dashboard (index.tsx vs dashboard/page.tsx)
**Already Fixed:**
- ✅ Stats calculation
- ✅ Fleet availability
- ✅ Maintenance alerts
- ✅ Activity events (today/week)
- ✅ Contracts list

**Need to verify:**
- [ ] All UI elements match exactly
- [ ] Filter buttons match
- [ ] Contract cards match
- [ ] Status badges match

### 8. Missing Pages Entirely
- [ ] Settings/Profile page
- [ ] Analytics page
- [ ] Calendar page
- [ ] Maintenance page
- [ ] Damages page
- [ ] Financial Management page
- [ ] Team Management page

### 9. Other Details
- [ ] Fuel level display format (0-8 not 0-100%)
- [ ] Signature capture and storage
- [ ] Photo upload and management
- [ ] Damage points marking and display
- [ ] AADE integration
- [ ] PDF generation
- [ ] Contract templates
- [ ] Notifications
- [ ] Date/time formatting (Greek locale)
- [ ] Currency formatting

## Priority Order:
1. **HIGH**: Fix fuel level (0-8 scale) in contract creation
2. **HIGH**: Add missing fields in contract creation (taxId, driverLicenseNumber, address, insurance, deposit)
3. **HIGH**: Add signature capture to contract creation
4. **HIGH**: Add damage points to contract creation
5. **HIGH**: Add photo upload to contract creation
6. **MEDIUM**: Improve contract details page
7. **MEDIUM**: Improve contract list page (AADE status, phone button)
8. **MEDIUM**: Improve fleet page (grid views, sorting, availability)
9. **MEDIUM**: Improve customers page (VIP, blacklist, edit)
10. **LOW**: Add missing pages (Settings, Analytics, Calendar, etc.)

