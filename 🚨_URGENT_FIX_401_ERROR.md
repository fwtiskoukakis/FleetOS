# 🚨 **URGENT: FIX 401 ERROR**

## ❌ **The Problem:**

```
401 Unauthorized
Error creating booking
```

This means the **database tables don't exist yet**!

---

## ✅ **THE SOLUTION (2 Steps):**

### **Step 1: Create Database Tables** ⭐ **REQUIRED!**

1. Open **Supabase Dashboard** → SQL Editor
2. Open file: `supabase/online-booking-schema.sql`
3. **Copy ALL** content (Ctrl+A, Ctrl+C)
4. **Paste in SQL Editor**
5. Click **RUN** ▶️
6. Wait for success (no errors)

**This creates:**
- ✅ All 14 tables
- ✅ RLS policies (including anonymous access!)
- ✅ Triggers for booking numbers
- ✅ Functions

### **Step 2: Test Booking Again** ✅

1. **Refresh website** (Ctrl+F5)
2. **Search for dates**
3. **Select a car**
4. **Fill booking form**
5. **Click "Continue to Payment"**
6. **IT WILL WORK!** 🎉

---

## 📋 **What You Should Have Run (In Order):**

```
1️⃣ online-booking-schema.sql  ← YOU NEED THIS! (Creates tables)
2️⃣ sample-data.sql            ← You ran this ✅
3️⃣ add-sample-cars.sql        ← You ran this ✅
```

**You skipped #1!** That's why you get 401 error!

---

## 🔍 **How to Verify Tables Exist:**

Run this in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('online_bookings', 'booking_extras', 'payment_transactions');
```

**Expected Result:**
```
online_bookings
booking_extras
payment_transactions
```

**If empty** → Tables don't exist → Run schema SQL!

---

## ⚡ **QUICK ACTION:**

### **→ RUN `online-booking-schema.sql` NOW! ←**

This is the **ONLY** way to fix the 401 error!

1. Supabase Dashboard
2. SQL Editor
3. Paste `online-booking-schema.sql`
4. RUN
5. Refresh website
6. Test booking
7. ✅ FIXED!

---

## 🎯 **After Running Schema:**

The 401 error will disappear because:
- ✅ Tables will exist
- ✅ RLS policies will allow anonymous bookings
- ✅ Triggers will generate booking numbers
- ✅ Everything will work!

---

## 🚀 **DO IT NOW:**

1. Open `supabase/online-booking-schema.sql`
2. Copy content
3. Run in Supabase SQL Editor
4. Test booking again
5. **SUCCESS!** 🎉

---

**This is the ONLY step you're missing!** 

**The schema creates all the necessary tables and policies!**

**Run it now and the 401 error will disappear!** ✅

