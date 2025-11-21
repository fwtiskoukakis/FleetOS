# 🚗 Car Rental Booking Website

A modern, beautiful, and fast Next.js-based customer booking website for your FleetOS car rental system.

## ✨ Features

### Customer Experience
- 🎨 **Beautiful Modern UI** - Gradient hero, smooth animations, professional design
- ⚡ **Lightning Fast** - Built with Next.js 14 for optimal performance
- 📱 **Fully Responsive** - Perfect on mobile, tablet, and desktop
- 🔍 **Smart Search** - Intuitive date, time, and location selection
- 🚗 **Car Browsing** - Filterable car listings with detailed specs
- 💳 **Flexible Payments** - Stripe, Viva Wallet, bank transfer, pay on arrival
- ✅ **Instant Confirmation** - Immediate booking confirmation with email
- 🔒 **Secure** - SSL encryption, PCI-compliant payment processing

### Admin Integration
- 🔗 **Seamless Integration** - Connects directly to your FleetOS admin system
- 📊 **Real-time Data** - All data synced with Supabase database
- 🎛️ **Full Control** - Manage everything from FleetOS admin interface

## 🏗️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe (+ Viva Wallet ready)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Date Handling:** date-fns

## 📁 Project Structure

```
booking-website/
├── app/
│   ├── page.tsx                    # Homepage with search
│   ├── cars/page.tsx               # Car listing with filters
│   ├── booking/page.tsx            # Booking form & checkout
│   ├── payment/page.tsx            # Payment methods
│   ├── confirmation/page.tsx       # Booking confirmation
│   ├── api/
│   │   └── create-payment-intent/  # Stripe API route
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── lib/
│   ├── supabase.ts                 # Supabase client & types
│   ├── stripe.ts                   # Stripe client
│   ├── utils.ts                    # Utility functions
│   └── email.ts                    # Email notifications
├── components/                     # Reusable components (future)
├── public/                         # Static assets
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Stripe account (optional, for card payments)

### Installation

1. **Navigate to the booking website directory:**
   ```bash
   cd booking-website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🗄️ Database Setup

The booking website uses the same Supabase database as your FleetOS admin.

1. **Deploy the schema** (if not already done):
   - Go to your Supabase project
   - Open SQL Editor
   - Run the script: `../supabase/online-booking-schema.sql`

2. **Enable Row Level Security:**
   - RLS policies are already included in the schema
   - Public read access is enabled for customer data
   - Admin writes require authentication

## 💳 Payment Integration

### Stripe Setup

1. **Create Stripe account:** https://stripe.com
2. **Get API keys:** Dashboard → Developers → API keys
3. **Add to `.env.local`:**
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

4. **Test cards:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Viva Wallet Setup (Coming Soon)

Viva Wallet integration is prepared but not yet implemented. To add:

1. Get Viva Wallet merchant credentials
2. Install Viva SDK: `npm install @vivawallet/web-sdk`
3. Update `app/payment/page.tsx` with Viva implementation

## 📧 Email Notifications

Email templates are ready in `lib/email.ts`. To enable:

1. **Choose email provider:**
   - SendGrid (recommended)
   - Mailgun
   - AWS SES
   - Resend

2. **Install SDK:**
   ```bash
   npm install @sendgrid/mail
   ```

3. **Update `lib/email.ts`** with your implementation

4. **Trigger emails** from booking flow:
   ```typescript
   await sendBookingConfirmationEmail({
     customerEmail: booking.customer_email,
     // ... other data
   });
   ```

## 🎨 Customization

### Brand Colors

Edit `tailwind.config.ts`:
```typescript
colors: {
  primary: '#2563eb',    // Your brand blue
  secondary: '#10b981',  // Your brand green
  accent: '#f59e0b',     // Your brand orange
}
```

### Logo

Add your logo to `public/logo.png` and update:
```typescript
// In app/page.tsx
<img src="/logo.png" alt="Company Logo" className="h-12" />
```

### Content

All text is in Greek (el). To add English:
1. Use i18n library (e.g., `next-intl`)
2. Or add language toggle and conditional rendering

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add booking website"
   git push
   ```

2. **Deploy to Vercel:**
   - Go to https://vercel.com
   - Import your repository
   - Root directory: `booking-website`
   - Add environment variables
   - Deploy!

3. **Update environment:**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

### Deploy to Other Platforms

- **Netlify:** Similar to Vercel
- **AWS Amplify:** Connect GitHub repo
- **DigitalOcean App Platform:** Docker or buildpack
- **Self-hosted:** Build with `npm run build` and serve with Node.js

## 📊 Analytics (Optional)

Add Google Analytics or Plausible:

1. **Install:**
   ```bash
   npm install @next/third-parties
   ```

2. **Add to layout:**
   ```typescript
   import { GoogleAnalytics } from '@next/third-parties/google'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>{children}</body>
         <GoogleAnalytics gaId="G-XXXXXXXXXX" />
       </html>
     )
   }
   ```

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection issues
- Check `.env.local` has correct credentials
- Verify RLS policies allow public read access
- Check browser console for CORS errors

### Payment not working
- Use Stripe test mode keys during development
- Check webhook configuration for production
- Verify SSL certificate on production domain

## 🔧 Development Tips

### Hot Reload
Changes are instantly reflected - no need to restart server

### TypeScript
All files are typed - use `any` sparingly

### Supabase Types
Generate types from schema:
```bash
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

## 📱 Mobile Testing

Test on real devices:
1. Run `npm run dev`
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Visit `http://YOUR-IP:3000` on mobile

## 🚀 Performance Optimization

- ✅ Images optimized with Next.js Image component
- ✅ Code splitting with dynamic imports
- ✅ CSS optimized with Tailwind purge
- ✅ API routes cached where appropriate

## 📝 TODO / Roadmap

- [ ] Add car details page (individual car view)
- [ ] Implement customer account/login
- [ ] Add booking history for customers
- [ ] Add reviews/ratings system
- [ ] Implement email notifications
- [ ] Add live chat support
- [ ] Multi-language support (EN/GR toggle)
- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA) support
- [ ] Add Google Maps integration for locations

## 🆘 Support

Need help? Check:
1. This README
2. `ONLINE_BOOKING_README.md` (project root)
3. Next.js docs: https://nextjs.org/docs
4. Supabase docs: https://supabase.com/docs

## 📄 License

Part of FleetOS project - Internal use only

---

**Built with ❤️ for FleetOS**

