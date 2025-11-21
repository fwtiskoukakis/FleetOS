# 🚀 **FleetOS Web Platform - Deployment Guide**

## 📋 **Quick Start:**

### **1. Setup Environment Variables**

Create `.env.local` in `fleetos-web/`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dpuyrpyxeukvxfqilmnw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXlycHl4ZXVrdnhmcWlsbW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzgzMDksImV4cCI6MjA3NzU1NDMwOX0.aj81KEEi6Cq-bIgK0bfbAI08cLBpo1RCCvRWG0mZ3IY

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### **2. Install & Run:**

```bash
cd fleetos-web
npm install
npm run dev
```

Open: **http://localhost:3001**

---

## 🌐 **Deploy to Production (Vercel):**

### **Step 1: Prepare for Deployment**

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Initial FleetOS web platform"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

### **Step 2: Deploy to Vercel**

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import GitHub Repository:**
   - Select your repository
   - Choose `fleetos-web` folder (or root if separate repo)

3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Root Directory: `fleetos-web` (if not root)
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://dpuyrpyxeukvxfqilmnw.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://fleetos.eu
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

### **Step 3: Setup Domain (fleetos.eu)**

1. **Add Domain in Vercel:**
   - Go to Project Settings → Domains
   - Add `fleetos.eu`
   - Add `www.fleetos.eu` (optional)

2. **Configure DNS:**
   - Go to your domain registrar
   - Add DNS records:
     ```
     Type: A
     Name: @
     Value: [Vercel IP]
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

   **OR use Vercel's automatic DNS:**
   - Use nameservers provided by Vercel
   - Update nameservers in domain registrar

3. **SSL Certificate:**
   - Vercel automatically provisions SSL
   - Wait 5-10 minutes for DNS propagation
   - Certificate will be auto-generated

### **Step 4: Verify Deployment**

1. **Test URLs:**
   - https://fleetos.eu (Landing page)
   - https://fleetos.eu/login (Login page)
   - https://fleetos.eu/dashboard (Admin dashboard - requires login)
   - https://fleetos.eu/booking/[company-slug] (Company booking page)

2. **Test Company Booking:**
   - Create organization in Supabase with slug
   - Visit: `https://fleetos.eu/booking/[slug]`
   - Should show company-specific booking page

---

## 📊 **Post-Deployment Checklist:**

### **Database Setup:**

- [ ] Run `online-booking-schema.sql` in Supabase SQL Editor
- [ ] Run `sample-data.sql` (optional)
- [ ] Create test organization with slug
- [ ] Add test cars with `organization_id`
- [ ] Set up `booking_design_settings` for organization

### **Environment Variables:**

- [ ] Verify all env vars are set in Vercel
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Add any additional env vars if needed

### **Testing:**

- [ ] Test landing page
- [ ] Test login/logout
- [ ] Test admin dashboard
- [ ] Test company booking page
- [ ] Test booking flow (if completed)

### **Monitoring:**

- [ ] Set up Vercel Analytics (optional)
- [ ] Set up error tracking (Sentry, optional)
- [ ] Monitor Supabase usage
- [ ] Check logs in Vercel dashboard

---

## 🔧 **Environment Variables:**

### **Required:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://fleetos.eu
```

### **Optional (For Future Features):**

```env
# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# SendGrid (for emails)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@fleetos.eu

# Viva Wallet (for payments)
VIVA_WALLET_API_KEY=...
```

---

## 🐛 **Troubleshooting:**

### **Build Errors:**

1. **Module not found:**
   ```bash
   cd fleetos-web
   npm install
   ```

2. **TypeScript errors:**
   ```bash
   npm run build
   ```
   Check for type errors and fix

3. **Environment variables missing:**
   - Ensure `.env.local` exists locally
   - Ensure env vars are set in Vercel dashboard

### **Runtime Errors:**

1. **Supabase connection failed:**
   - Check `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
   - Verify Supabase project is active

2. **Organization not found:**
   - Ensure organization exists in Supabase
   - Check `slug` field matches URL
   - Verify `is_active = true`

3. **Authentication not working:**
   - Check middleware is properly configured
   - Verify Supabase Auth is enabled
   - Check RLS policies allow access

---

## 📝 **Additional Notes:**

### **Multi-Tenant Setup:**

1. **Create Organization:**
   ```sql
   INSERT INTO organizations (
     company_name, slug, vat_number, 
     email_primary, phone_primary
   ) VALUES (
     'My Company', 'my-company', '123456789',
     'contact@mycompany.com', '+30 210 1234567'
   );
   ```

2. **Add Booking Settings:**
   ```sql
   INSERT INTO booking_design_settings (
     organization_id, company_name, company_name_el,
     primary_color, secondary_color
   ) VALUES (
     '[org-id]', 'My Company', 'Η Εταιρεία Μου',
     '#2563eb', '#10b981'
   );
   ```

3. **Access Booking Page:**
   - Visit: `https://fleetos.eu/booking/my-company`
   - Should show company-specific booking page

### **Custom Domain per Company:**

If you want subdomains:
- `company1.fleetos.eu` → `/booking/company1`
- `company2.fleetos.eu` → `/booking/company2`

Configure in Vercel:
1. Add subdomain DNS records
2. Update middleware to detect subdomain
3. Route to appropriate organization

---

## ✅ **Deployment Complete!**

Once deployed:
- ✅ Landing page accessible
- ✅ Admin login working
- ✅ Dashboard functional
- ✅ Company booking pages live
- ✅ Multi-tenant architecture operational

**Your FleetOS web platform is live!** 🎉

