# FleetOS Web Platform

Complete web platform for FleetOS - featuring marketing website, admin dashboard, and company-specific booking pages.

## 🚀 Features

- **Landing Page**: Marketing website promoting FleetOS
- **Web Admin Dashboard**: Same functionality as mobile app, accessible from web
- **Company-Specific Booking Pages**: Dynamic booking pages per organization (`/booking/[slug]`)
- **Authentication**: Secure login with Supabase Auth
- **Multi-Tenant**: Each company has their own isolated booking pages and data

## 📁 Project Structure

```
fleetos-web/
├── app/
│   ├── page.tsx                  # Landing page (marketing)
│   ├── login/
│   │   └── page.tsx              # Admin login
│   ├── dashboard/                # Web admin panel
│   │   └── page.tsx              # Dashboard home
│   └── booking/
│       └── [slug]/               # Company-specific booking
│           ├── page.tsx          # Booking homepage
│           └── cars/
│               └── page.tsx      # Car listing
├── components/
│   └── booking/                  # Booking components
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Utilities
└── middleware.ts                 # Auth middleware
```

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## 🌐 Routes

### Public Routes

- `/` - Landing page (marketing)
- `/login` - Admin login
- `/booking/[slug]` - Company booking homepage
- `/booking/[slug]/cars` - Company car listing

### Protected Routes (Admin)

- `/dashboard` - Admin dashboard
- `/dashboard/fleet` - Fleet management (TODO)
- `/dashboard/rentals` - Rentals management (TODO)
- `/dashboard/customers` - Customers management (TODO)
- `/dashboard/book-online` - Online booking settings (TODO)

## 🏢 Multi-Tenant Architecture

Each company (organization) has:
- Unique `slug` for URL routing (e.g., `aggelos-rentals`)
- Isolated data via `organization_id` filtering
- Custom branding via `booking_design_settings`
- Own booking page at `/booking/[slug]`

## 📝 TODO

- [ ] Complete booking flow (booking form, payment, confirmation)
- [ ] Convert React Native admin screens to web
- [ ] Implement pricing calculations with date-based rules
- [ ] Add car availability checking
- [ ] Email notifications
- [ ] Payment integration (Stripe/Viva Wallet)

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Domain Setup

1. Point `fleetos.eu` DNS to Vercel
2. Add domain in Vercel dashboard
3. SSL certificate will be auto-generated

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
