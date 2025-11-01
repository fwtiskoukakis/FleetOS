# ⚡ Quick Start: Connect Your Supabase in 5 Minutes

## **Get Your Credentials** (1 min)

1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL**
   - **anon/public** key

---

## **Setup Database** (2 mins)

1. In Supabase Dashboard: **SQL Editor** → **New Query**
2. Copy ALL of `supabase/COMPLETE_SETUP.sql`
3. Paste and click **Run** ✅

---

## **Create .env File** (1 min)

1. Create `.env` in project root:
   ```bash
   # Windows
   type nul > .env
   
   # Mac/Linux  
   touch .env
   ```

2. Add your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

---

## **Test It** (1 min)

```bash
npm start
```

Sign in and create a test contract! 🎉

---

## **Full Instructions**

See `SETUP_INSTRUCTIONS.md` for detailed guide.

