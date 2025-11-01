# 🚀 Complete Supabase Setup Instructions

## 📋 What You'll Need

1. A Supabase account (free: https://supabase.com)
2. 10-15 minutes
3. Your Supabase project credentials

---

## **STEP 1: Get Your Supabase Credentials** (2 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Click **Settings** (gear icon) → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

**You'll need these in Step 3!**

---

## **STEP 2: Run Database Schema** (3 minutes)

1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the **ENTIRE** contents of `supabase/COMPLETE_SETUP.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press F5)
6. Wait for the success message: "✅ Supabase setup completed successfully!"

**You should see tables created:**
- `users`
- `cars`
- `contracts`
- `damage_points`
- `contract_photos`
- `notifications`

**And storage buckets:**
- `contract-photos`
- `signatures`
- `car-photos`

---

## **STEP 3: Configure Your App** (2 minutes)

1. Create a `.env` file in your project root:
   ```bash
   # In your terminal, run:
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. Save the file

---

## **STEP 4: Verify Setup** (3 minutes)

### Option A: Test in Supabase Dashboard

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `test@example.com`
   - Password: `Test123!`
4. Click **Create User**
5. Go to **Table Editor** → **users**
6. You should see your test user!

### Option B: Test in Your App

1. Start your Expo app:
   ```bash
   npm start
   ```
2. Try to sign in with your test credentials
3. Create a test contract

---

## **STEP 5: Create Your First Admin User** (1 minute)

You need to create an admin user to use the app:

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter your email and password
4. **Important:** Note the user ID (UUID)
5. Go to **Table Editor** → **users**
6. Add your user details:
   - `id`: The UUID from step 4
   - `name`: Your full name
   - `email`: Your email

---

## ✅ **You're Done!**

Your app is now connected to your own Supabase database!

---

## 🔍 **Verify Everything Works**

### Checklist:

- [ ] SQL schema ran successfully
- [ ] All tables are visible in **Table Editor**
- [ ] Storage buckets are created in **Storage**
- [ ] `.env` file is created with correct credentials
- [ ] Test user can sign in
- [ ] Test user appears in `users` table
- [ ] Can create a test contract

---

## 🆘 **Troubleshooting**

### "Invalid API key"
- Check `.env` file has correct `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Make sure you copied the **anon public** key (not the service_role key)
- Restart Expo: `npm start`

### "Table does not exist"
- Run `supabase/COMPLETE_SETUP.sql` again
- Check SQL Editor for any errors

### "RLS policy violation"
- Make sure you're signed in to Supabase Auth
- Check that your user exists in both `auth.users` AND `public.users`

### "Storage upload failed"
- Verify storage buckets are created
- Check storage policies are created in SQL Editor
- Make sure you're uploading to correct bucket

---

## 📁 **Important Files**

- **`supabase/COMPLETE_SETUP.sql`** - Main setup script (RUN THIS FIRST)
- **`supabase/storage-setup.sql`** - Additional storage setup (if needed)
- **`utils/supabase.ts`** - Supabase client configuration
- **`.env`** - Your credentials (DO NOT COMMIT THIS)

---

## 🎯 **Next Steps**

1. **Add your vehicles:** Go to Supabase → **Table Editor** → **cars** and add your rental cars
2. **Build your app:** Run `eas build --platform android --profile preview`
3. **Install on your phone:** Download and install the APK
4. **Start managing rentals:** Create your first contract!

---

## 💰 **Cost Tracking**

**Current Setup:**
- ✅ **$0/month** - Free tier covers small businesses
- 🎯 **Perfect for:** Up to 50-100 rentals/month

**When to upgrade:**
- 📊 **$25/month** - If you exceed 500MB database storage
- 📈 **$599/month** - If you need team features (multi-location)

---

**Need help?** Check the other documentation files in this project:
- `supabase/README.md` - Full API reference
- `SUPABASE_SETUP.md` - Detailed setup guide
- `ANDROID_BUILD_GUIDE.md` - How to build your app

