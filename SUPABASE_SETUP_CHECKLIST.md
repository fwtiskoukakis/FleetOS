# ✅ Supabase Setup Checklist

## **Complete These Steps:**

### **Phase 1: Get Credentials** (2 min)
- [ ] Open Supabase Dashboard: https://supabase.com/dashboard
- [ ] Select your project
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL**
- [ ] Copy **anon/public** key

---

### **Phase 2: Setup Database** (3 min)
- [ ] Open **SQL Editor** in Supabase
- [ ] Click **New Query**
- [ ] Copy ALL contents of `supabase/COMPLETE_SETUP.sql`
- [ ] Paste into SQL Editor
- [ ] Click **Run**
- [ ] Verify success message appears
- [ ] Check **Table Editor** shows 6 tables:
  - [ ] users
  - [ ] cars
  - [ ] contracts
  - [ ] damage_points
  - [ ] contract_photos
  - [ ] notifications

---

### **Phase 3: Verify Storage** (1 min)
- [ ] Check **Storage** section in Supabase
- [ ] Verify 3 buckets exist:
  - [ ] contract-photos (public)
  - [ ] signatures (private)
  - [ ] car-photos (public)

---

### **Phase 4: Configure App** (2 min)
- [ ] Create `.env` file in project root
- [ ] Add `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Add `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Save file
- [ ] Restart Expo (`npm start`)

---

### **Phase 5: Create Test User** (2 min)
- [ ] Go to **Authentication** → **Users**
- [ ] Click **Add User** → **Create new user**
- [ ] Enter email and password
- [ ] Save the user
- [ ] Note the UUID
- [ ] Add user to `public.users` table:
  - [ ] id (UUID from auth.users)
  - [ ] name
  - [ ] email

---

### **Phase 6: Test Connection** (2 min)
- [ ] Start app: `npm start`
- [ ] Try to sign in with test user
- [ ] Create a test contract
- [ ] Verify contract appears in Supabase

---

## **🎉 All Done!**

Your app is now fully configured with Supabase!

---

## **Next Steps:**

1. [ ] Add your rental cars to the `cars` table
2. [ ] Create a production build
3. [ ] Install on your phone
4. [ ] Start managing rentals!

---

## **Need Help?**

- See `SETUP_INSTRUCTIONS.md` for detailed guide
- See `QUICK_START_SUPABASE.md` for quick reference
- Check Supabase console for errors

---

**Cost:** $0/month (free tier) ✅

