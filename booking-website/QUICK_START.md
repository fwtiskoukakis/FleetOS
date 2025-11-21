# ⚡ QUICK START - 3 Steps to Live Website

Get your booking website running in **10 minutes**!

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Supabase account
- ✅ Database schema deployed (from `../supabase/online-booking-schema.sql`)

---

## 🚀 Step 1: Install (2 minutes)

```bash
cd booking-website
npm install
```

---

## ⚙️ Step 2: Configure (3 minutes)

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
# Get from Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Get from Stripe → Developers → API keys (use test keys first)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Your local URL (change when deploying)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ▶️ Step 3: Run (1 minute)

```bash
npm run dev
```

**Open:** http://localhost:3000

🎉 **You're running!**

---

## 🧪 Test It (4 minutes)

### 1. Search for a Car (1 min)
- Select pickup/dropoff dates
- Choose location
- Click "Αναζήτηση Αυτοκινήτων"

### 2. Select a Car (1 min)
- Browse available cars
- Apply filters (transmission, seats)
- Click "Επιλογή" on any car

### 3. Complete Booking (2 min)
- Fill customer details
- Select insurance & extras
- Choose payment type
- Click "Συνέχεια στην Πληρωμή"

### 4. Test Payment
Use Stripe test card:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVC:** Any 3 digits
- **ZIP:** Any 5 digits

✅ **Success!** You'll see the confirmation page.

---

## 📊 Check Data

Open Supabase → Table Editor → `online_bookings`

You should see your test booking! 🎉

---

## 🌍 Deploy (Optional - 5 minutes)

### Vercel (Easiest):
```bash
npm install -g vercel
vercel
```

Follow prompts:
1. Connect to Git (optional)
2. Set root directory: `booking-website`
3. Add environment variables
4. Deploy! ✅

**Your site is live!** 🚀

---

## 🆘 Troubleshooting

### Can't see cars?
→ Add cars in FleetOS admin → Book Online → Cars

### Payment fails?
→ Using test Stripe keys? Use test card `4242 4242 4242 4242`

### Build errors?
→ Delete `node_modules` and `.next`, then `npm install`

### Wrong Node version?
→ Check with `node -v` (should be 18+)

---

## ✅ You're Done!

**3 simple steps, 10 minutes, fully functional booking website!**

### Next:
1. Customize colors in `tailwind.config.ts`
2. Add your logo
3. Deploy to production
4. Start taking bookings! 💰

---

**Need more help?** Check `README.md` or `DEPLOYMENT_GUIDE.md`

