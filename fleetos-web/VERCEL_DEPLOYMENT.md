# 🚀 **Vercel Deployment Guide**

## ✅ **Code Pushed to GitHub!**

Your code is now at: `https://github.com/fwtiskoukakis/FleetOS.git`

---

## 📋 **Deploy to Vercel (Quick Steps):**

### **Step 1: Import Project in Vercel**

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click **"Add New Project"** or **"Import Project"**

2. **Import from GitHub:**
   - Select your repository: **FleetOS**
   - Click **"Import"**

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `fleetos-web` ⚠️ **IMPORTANT!**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

### **Step 2: Add Environment Variables**

Click **"Environment Variables"** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://dpuyrpyxeukvxfqilmnw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXlycHl4ZXVrdnhmcWlsbW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzgzMDksImV4cCI6MjA3NzU1NDMwOX0.aj81KEEi6Cq-bIgK0bfbAI08cLBpo1RCCvRWG0mZ3IY
NEXT_PUBLIC_APP_URL=https://fleetos.eu
```

**Important:** Make sure to add these to **Production**, **Preview**, and **Development** environments!

### **Step 3: Deploy!**

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL like: `https://fleetos-xyz.vercel.app`

### **Step 4: Add Custom Domain (fleetos.eu)**

1. **In Vercel Project:**
   - Go to **Settings** → **Domains**
   - Click **"Add Domain"**
   - Enter: `fleetos.eu`
   - Click **"Add"**

2. **Configure DNS:**
   - Vercel will show DNS instructions
   - Go to your domain registrar
   - Add the DNS records provided by Vercel
   
   **OR use Vercel's nameservers:**
   - Use nameservers provided by Vercel
   - Update nameservers in your domain registrar

3. **SSL Certificate:**
   - Vercel automatically provisions SSL
   - Wait 5-10 minutes for DNS propagation
   - Certificate will be auto-generated

---

## ✅ **After Deployment:**

### **Test Your URLs:**

1. **Landing Page:**
   ```
   https://fleetos.eu
   ```

2. **Login:**
   ```
   https://fleetos.eu/login
   ```

3. **Dashboard:**
   ```
   https://fleetos.eu/dashboard
   ```

4. **Company Booking:**
   ```
   https://fleetos.eu/booking/[company-slug]
   ```
   (Replace `[company-slug]` with your organization's slug)

---

## 🔧 **Troubleshooting:**

### **Build Errors:**

**Error: "Cannot find module"**
- Make sure **Root Directory** is set to `fleetos-web`
- Check that `package.json` exists in `fleetos-web/`

**Error: "Environment variables missing"**
- Verify all env vars are added in Vercel
- Make sure they're set for all environments (Production, Preview, Development)

**Error: "Module not found"**
- Vercel should run `npm install` automatically
- Check build logs for missing dependencies

### **Runtime Errors:**

**Supabase connection failed:**
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Verify Supabase project is active

**Organization not found:**
- Ensure organization exists in Supabase
- Check `slug` field matches URL
- Verify `is_active = true`

---

## 📊 **Vercel Project Settings:**

### **Recommended Settings:**

- **Build Command:** `cd fleetos-web && npm run build`
- **Output Directory:** `fleetos-web/.next`
- **Install Command:** `cd fleetos-web && npm install`
- **Root Directory:** `fleetos-web`

**OR use Root Directory:**

- **Root Directory:** `fleetos-web`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

---

## 🎯 **Quick Checklist:**

- [ ] Import project from GitHub in Vercel
- [ ] Set Root Directory to `fleetos-web`
- [ ] Add environment variables
- [ ] Deploy project
- [ ] Add custom domain `fleetos.eu`
- [ ] Configure DNS
- [ ] Test all URLs
- [ ] Verify SSL certificate

---

## 🎉 **You're Done!**

Once deployed:
- ✅ Landing page accessible at `https://fleetos.eu`
- ✅ Admin login working
- ✅ Dashboard functional
- ✅ Company booking pages live
- ✅ Multi-tenant architecture operational

**Your FleetOS web platform is now live!** 🚀

---

## 📝 **Next Steps:**

1. **Test the deployment**
2. **Create test organization** in Supabase
3. **Test company booking page**
4. **Add more companies** as needed
5. **Monitor logs** in Vercel dashboard

**Need help?** Check Vercel logs for any errors!

