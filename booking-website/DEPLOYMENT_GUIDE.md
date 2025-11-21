# 🚀 Deployment Guide - Car Rental Booking Website

Complete step-by-step guide to deploy your booking website to production.

## 📋 Pre-Deployment Checklist

- [ ] Database schema deployed to Supabase
- [ ] Environment variables configured
- [ ] Stripe/payment provider configured
- [ ] Domain name purchased (optional)
- [ ] SSL certificate (usually automatic with hosting)
- [ ] Email provider setup
- [ ] Test all features locally

## 🌐 Option 1: Vercel (Recommended) - 5 Minutes

**Why Vercel?**
- Built for Next.js (same company)
- Automatic deployments from GitHub
- Free SSL certificates
- Global CDN
- Serverless functions
- Free tier available

### Steps:

1. **Push to GitHub** (if not already):
   ```bash
   cd booking-website
   git init
   git add .
   git commit -m "Initial booking website"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to https://vercel.com
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     - **Root Directory:** `booking-website`
     - **Framework Preset:** Next.js (auto-detected)
     - **Build Command:** `npm run build` (default)
     - **Output Directory:** `.next` (default)

3. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your site is live! 🎉

5. **Custom Domain (Optional):**
   - Go to Project Settings → Domains
   - Add your domain
   - Follow DNS configuration instructions

### Auto-Deployments:
Every git push to `main` will automatically deploy!

---

## 🌊 Option 2: Netlify - 5 Minutes

**Why Netlify?**
- Easy setup
- Great for static sites
- Free tier
- Built-in forms
- Edge functions

### Steps:

1. **Push to GitHub** (same as Vercel)

2. **Deploy to Netlify:**
   - Go to https://netlify.com
   - Click "Add new site" → "Import existing project"
   - Connect to GitHub
   - Select repository

3. **Build Settings:**
   - **Base directory:** `booking-website`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

4. **Environment Variables:**
   Site settings → Environment variables → Add (same as Vercel)

5. **Deploy:**
   - Click "Deploy site"
   - Live in 2-3 minutes! 🎉

---

## ☁️ Option 3: AWS Amplify - 10 Minutes

**Why AWS Amplify?**
- Part of AWS ecosystem
- Good for enterprise
- Custom caching rules
- Advanced monitoring

### Steps:

1. **AWS Console:**
   - Go to AWS Amplify console
   - Click "New app" → "Host web app"
   - Connect to GitHub

2. **Build Settings:**
   ```yaml
   version: 1
   applications:
     - appRoot: booking-website
       frontend:
         phases:
           preBuild:
             commands:
               - npm ci
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: .next
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
   ```

3. **Environment Variables:**
   App settings → Environment variables (same as above)

4. **Deploy!**

---

## 🐳 Option 4: Docker (Self-Hosted)

**Why Docker?**
- Full control
- Deploy anywhere
- Consistent environments
- Good for VPS (DigitalOcean, Linode, etc.)

### Dockerfile:

Create `booking-website/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

### Build & Run:
```bash
# Build image
docker build -t car-rental-booking .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  car-rental-booking
```

### Deploy to DigitalOcean App Platform:
1. Push Docker image to Docker Hub or registry
2. Create new app in DigitalOcean
3. Point to container registry
4. Add environment variables
5. Deploy!

---

## 🔐 Post-Deployment Security

### 1. Enable HTTPS (Usually automatic with hosting)

### 2. Set up Stripe Webhooks:
```
Production webhook URL:
https://yourdomain.com/api/webhooks/stripe

Events to subscribe:
- payment_intent.succeeded
- payment_intent.payment_failed
- checkout.session.completed
```

### 3. Update Supabase CORS:
In Supabase dashboard:
- Settings → API
- Add your domain to allowed origins

### 4. Rate Limiting (Recommended):
Install middleware:
```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to `middleware.ts`:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function middleware(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}
```

### 5. Content Security Policy:
Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 📊 Monitoring & Analytics

### Google Analytics:
```bash
npm install @next/third-parties
```

Add to `app/layout.tsx`:
```typescript
import { GoogleAnalytics } from '@next/third-parties/google'

<GoogleAnalytics gaId="G-XXXXXXXXXX" />
```

### Vercel Analytics (if using Vercel):
```bash
npm install @vercel/analytics
```

```typescript
import { Analytics } from '@vercel/analytics/react'

<Analytics />
```

### Uptime Monitoring:
- UptimeRobot (free): https://uptimerobot.com
- Pingdom
- StatusCake

---

## 🧪 Testing Before Going Live

### 1. Test Payment Flow:
- Use Stripe test cards
- Test full payment
- Test 30% deposit
- Test payment failure

### 2. Test All Forms:
- Search form validation
- Booking form validation
- Email format validation
- Phone number validation

### 3. Cross-Browser Testing:
- Chrome
- Firefox
- Safari
- Edge
- Mobile browsers

### 4. Performance Testing:
- PageSpeed Insights: https://pagespeed.web.dev
- GTmetrix: https://gtmetrix.com
- Target: > 90 score

### 5. Mobile Testing:
- Test on real devices
- Check responsive design
- Test touch interactions
- Check loading speed on 3G/4G

---

## 🔄 CI/CD Pipeline (Advanced)

### GitHub Actions (Auto-deploy on push):

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'booking-website/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./booking-website
        run: npm ci
        
      - name: Run tests
        working-directory: ./booking-website
        run: npm test
        
      - name: Build
        working-directory: ./booking-website
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./booking-website
```

---

## 🆘 Troubleshooting

### Build Fails:
```bash
# Check Node version
node -v  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Environment Variables Not Working:
- Must start with `NEXT_PUBLIC_` for client-side
- Restart dev server after changing
- Check for typos
- Verify in Vercel/Netlify dashboard

### 500 Errors:
- Check server logs in hosting dashboard
- Verify database connection
- Check API route implementations
- Verify all env vars are set

### Slow Performance:
- Enable caching headers
- Optimize images
- Use Next.js Image component
- Enable CDN
- Minimize bundle size

---

## ✅ Launch Checklist

Before announcing to customers:

- [ ] All features tested
- [ ] Payment processing working
- [ ] Email notifications sending
- [ ] Mobile responsive
- [ ] Fast loading (< 3s)
- [ ] SEO optimized
- [ ] Analytics installed
- [ ] Error monitoring setup
- [ ] Backup strategy in place
- [ ] Customer support ready
- [ ] Terms & conditions page
- [ ] Privacy policy page
- [ ] FAQ page (optional)

---

## 🎉 You're Live!

Congratulations! Your booking website is now live and accepting bookings 24/7!

### Next Steps:
1. Monitor first bookings closely
2. Gather customer feedback
3. Iterate and improve
4. Add analytics tracking
5. Set up automated backups

---

**Need help?** Check README.md or main project documentation.

