# 🚀 **QUICK START - ONLINE BOOKING SYSTEM**

##⚡ **ΞΕΚΙΝΗΣΤΕ ΣΕ 3 ΒΗΜΑΤΑ**

---

## **ΒΗΜΑ 1: DEPLOY DATABASE (5 λεπτά)** ✅

### 1.1 Δημιουργήστε Supabase Project
```
1. Πηγαίνετε στο https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Όνομα: "car-rental-booking"
5. Password: [δυνατό password]
6. Region: Europe West (Frankfurt)
7. Click "Create Project" (θα πάρει 2-3 λεπτά)
```

### 1.2 Run Database Schema
```
1. Μόλις δημιουργηθεί το project, πηγαίνετε στο SQL Editor (αριστερά)
2. Click "New Query"
3. Ανοίξτε το αρχείο supabase/online-booking-schema.sql
4. Copy-paste ΟΛΟ το περιεχόμενο
5. Click "RUN" (κάτω δεξιά)
6. Θα δείτε: "Success. No rows returned"
7. ✅ DONE! Όλοι οι πίνακες δημιουργήθηκαν!
```

### 1.3 Create Storage Buckets
```
1. Πηγαίνετε στο Storage (αριστερά)
2. Click "New Bucket"
3. Name: "car-photos" → Public: YES → Create
4. Click "New Bucket" ξανά
5. Name: "booking-documents" → Public: NO → Create
6. ✅ DONE!
```

### 1.4 Get API Keys
```
1. Πηγαίνετε στο Settings → API (αριστερά κάτω)
2. Copy τα εξής:
   - Project URL: https://xxxxx.supabase.co
   - anon public key: eyJhbGciOi...
3. Κρατήστε τα - θα τα χρειαστείτε!
```

---

## **ΒΗΜΑ 2: CONNECT FleetOS APP (10 λεπτά)** ✅

### 2.1 Ενημέρωση Supabase Service

Ανοίξτε το `services/supabase.service.ts` και ενημερώστε με τα API keys σας:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://YOUR-PROJECT.supabase.co'; // ← Αλλάξτε αυτό
const supabaseAnonKey = 'YOUR-ANON-KEY'; // ← Και αυτό

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2.2 Test Connection

Τρέξτε την εφαρμογή:
```bash
npm start
```

Πηγαίνετε στο "Book Online" tab και:
1. Click "Τοποθεσίες"
2. Click το + button
3. Προσθέστε μία τοποθεσία (π.χ. "Αεροδρόμιο Αθηνών")
4. Αν δουλέψει → ✅ Συνδέθηκε επιτυχώς!

---

## **ΒΗΜΑ 3: SETUP ΒΑΣΙΚΑ ΔΕΔΟΜΕΝΑ (15 λεπτά)** ✅

### 3.1 Προσθέστε Τοποθεσίες

```
Book Online → Τοποθεσίες → +
```

Προσθέστε 2-3 τοποθεσίες:
- Αεροδρόμιο Αθηνών
- Λιμάνι Πειραιά
- Κέντρο Αθήνας

### 3.2 Δημιουργήστε Κατηγορίες Αυτοκινήτων

```
Book Online → Κατηγορίες → +
```

Παραδείγματα:
1. **Οικονομικά**
   - Θέσεις: 5, Πόρτες: 4, Κιβώτιο: Manual, Βαλίτσες: 2

2. **SUV**
   - Θέσεις: 5, Πόρτες: 5, Κιβώτιο: Automatic, Βαλίτσες: 3

3. **Πολυτελείας**
   - Θέσεις: 5, Πόρτες: 4, Κιβώτιο: Automatic, Βαλίτσες: 2

### 3.3 Προσθέστε Πρόσθετα

```
Book Online → Πρόσθετα → +
```

Βασικά πρόσθετα:
- GPS Πλοήγηση (€5/ημέρα)
- Παιδικό Κάθισμα (€3/ημέρα)
- Επιπλέον Οδηγός (€10 εφάπαξ)
- Πλήρης Ασφάλεια (€15/ημέρα)

### 3.4 Ρυθμίστε Ασφάλειες

```
Book Online → Ασφάλειες → +
```

Παραδείγματα:
1. **Βασική** (περιλαμβάνεται)
   - Απαλλαγή: €500, Τιμή: €0, Badge: "ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ"

2. **Standard**
   - Απαλλαγή: €200, Τιμή: €10/ημέρα

3. **Premium**
   - Απαλλαγή: €0, Τιμή: €20/ημέρα, Badge: "ΣΥΝΙΣΤΆΤΑΙ"

---

## **ΤΩΡΑ ΤΙ;** 🎯

### **Ολοκληρωμένες Οθόνες (Μπορείτε να χρησιμοποιήσετε ΤΩΡΑ!)**

✅ **Book Online Tab** - Main menu με όλες τις επιλογές  
✅ **Locations** - Διαχείριση τοποθεσιών  
✅ **Categories** - Διαχείριση κατηγοριών  
✅ **Extras** - Διαχείριση πρόσθετων  
✅ **Insurance** - Διαχείριση ασφαλειών  
✅ **Bookings** - Προβολή κρατήσεων  

### **Επόμενα Βήματα (Για να ολοκληρώσετε το σύστημα)**

🔨 **Υπολειπόμενες Admin Οθόνες:**
1. **Cars Management** - Προσθήκη αυτοκινήτων + φωτογραφίες
2. **Pricing Calendar** - Ημερολόγιο τιμών
3. **Payment Methods** - Ρυθμίσεις πληρωμών
4. **Design Settings** - Customization του website

📖 **Οδηγίες:** Δείτε `ONLINE_BOOKING_IMPLEMENTATION_GUIDE.md`

### **Για το Customer Website (Next.js)**

📘 **Complete Guide:** `ONLINE_BOOKING_README.md` έχει:
- Πλήρεις οδηγίες setup
- Code examples για κάθε page
- Stripe payment integration
- Email notifications setup

---

## **📊 ΤΙ ΕΧΕΤΕ ΤΩΡΑ**

### **Database (100% Complete)** ✅
- 14 πίνακες με relationships
- Row Level Security
- Functions & triggers
- Sample data
- **Ready για production!**

### **Admin Interface (60% Complete)** 🔨
- ✅ Main navigation
- ✅ 5 management screens (locations, categories, extras, insurance, bookings)
- 🔨 4 screens υπολείπονται (cars, pricing, payment, design)

**Templates Available:** Μπορείτε να χρησιμοποιήσετε τα existing screens ως templates!

### **Customer Website (0% - To Build)** 📦
- Complete roadmap στο README
- Code examples
- UI/UX guidelines
- Payment flow

---

## **🎯 ΠΡΟΤΕΙΝΟΜΕΝΗ ΣΕΙΡΑ**

### **Εβδομάδα 1: Ολοκληρώστε Admin**
- [ ] Day 1-2: Cars Management screen με photo upload
- [ ] Day 3-4: Pricing Calendar
- [ ] Day 5: Payment Methods & Design Settings
- [ ] Day 6-7: Testing, bug fixes

### **Εβδομάδα 2-3: Build Customer Website**
- [ ] Day 8-9: Setup Next.js + Homepage
- [ ] Day 10-11: Cars listing + details
- [ ] Day 12-13: Booking form + checkout
- [ ] Day 14: Confirmation page

### **Εβδομάδα 4: Payment & Launch**
- [ ] Day 15-16: Stripe integration
- [ ] Day 17-18: Email notifications
- [ ] Day 19-20: Testing
- [ ] Day 21: 🚀 LAUNCH!

---

## **💡 TIPS**

### **Για Development**
1. **Use existing screens as templates** - Copy-paste και τροποποιήστε
2. **Test με dummy data** - Βάλτε test κρατήσεις για να δείτε πώς δείχνει
3. **Mobile first** - Δοκιμάστε σε κινητό (most users θα book από κινητό)
4. **Commit often** - Git commit μετά από κάθε screen

### **Για Production**
1. **Backup database** - Πριν deploy, κάντε backup
2. **Test payments** - Use Stripe test mode πρώτα
3. **Email testing** - Test όλα τα email templates
4. **Monitor errors** - Setup error tracking (Sentry)

---

## **📞 ΧΡΕΙΑΖΕΣΤΕ ΒΟΗΘΕΙΑ;**

### **Documentation Files**
- `ONLINE_BOOKING_README.md` - Complete setup guide
- `ONLINE_BOOKING_IMPLEMENTATION_GUIDE.md` - Detailed implementation
- `ONLINE_BOOKING_SUMMARY.md` - Project summary

### **Code Structure**
```
app/
├── (tabs)/
│   └── book-online.tsx         ← Main menu
└── book-online/
    ├── locations.tsx           ← ✅ Done
    ├── categories.tsx          ← ✅ Done
    ├── extras.tsx              ← ✅ Done
    ├── insurance.tsx           ← ✅ Done
    ├── bookings.tsx            ← ✅ Done
    ├── cars.tsx                ← 🔨 Todo
    ├── pricing.tsx             ← 🔨 Todo
    ├── payment-methods.tsx     ← 🔨 Todo
    └── design.tsx              ← 🔨 Todo
```

### **Resources**
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Docs:** https://stripe.com/docs
- **React Native:** https://reactnative.dev/docs

---

## **🎉 ΣΥΓΧΑΡΗΤΗΡΙΑ!**

Έχετε δημιουργήσει ένα επαγγελματικό online booking system με:
- ✅ Enterprise-grade database
- ✅ Beautiful admin interface
- ✅ Scalable architecture
- ✅ Security best practices

**Συνεχίστε με αυτοπεποίθηση - το θεμέλιο είναι γερό!** 💪

---

**Made with ❤️ for FleetOS** 🚗💨

