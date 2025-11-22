# 🚀 Next Steps - WordPress Integration

## ✅ What You Just Completed

You successfully ran the `wordpress-integration-enhancements.sql` script, which:
- ✅ Created `organizations` table
- ✅ Added `organization_id` columns to all necessary tables
- ✅ Created all database functions and triggers
- ✅ Set up integration health logging
- ✅ Created booking audit logs

## 🎯 Next Steps (In Order)

### **STEP 1: Configure Environment Variables** (10 minutes)

Add these to `fleetos-web/.env.local`:

```env
# Email (SendGrid) - Required for booking confirmations
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@fleetos.eu
SENDGRID_FROM_NAME=FleetOS

# Stripe (if using Stripe payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Viva Wallet (if using Viva Wallet)
VIVA_WALLET_API_KEY=your_viva_wallet_api_key
VIVA_WALLET_WEBHOOK_SECRET=your_viva_wallet_webhook_secret

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://fleetos.eu
```

**How to get these:**
- **SendGrid**: Sign up at sendgrid.com → API Keys → Create API Key
- **Stripe**: Dashboard → Developers → API Keys
- **Viva Wallet**: Contact Viva Wallet for API credentials

---

### **STEP 2: Create Your Organization** (5 minutes)

You need to create an organization record in the database:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace with your actual data):

```sql
INSERT INTO public.organizations (
  company_name,
  trading_name,
  slug,
  vat_number,
  phone_primary,
  email_primary,
  primary_address,
  city,
  country,
  subscription_status,
  is_active,
  max_contracts_per_month
) VALUES (
  'Your Company Name',
  'Your Trading Name',
  'your-company-slug',  -- This will be used in URLs: fleetos.eu/booking/your-company-slug
  '123456789',  -- Your VAT number
  '+30 123 456 7890',
  'info@yourcompany.com',
  'Your Address',
  'Athens',
  'GR',
  'active',  -- or 'trial' for trial period
  true,
  1000  -- Monthly contract limit
) RETURNING id, slug;
```

**Save the `slug` value** - you'll need it for the WordPress plugin!

---

### **STEP 3: Test API Endpoints** (15 minutes)

Test that your API endpoints are working:

1. **Test Organization Validation:**
   ```bash
   curl https://fleetos.eu/api/v1/organizations/your-company-slug/validate
   ```
   Should return: `{"is_valid": true, ...}`

2. **Test Locations API:**
   ```bash
   curl https://fleetos.eu/api/v1/organizations/your-company-slug/locations
   ```
   Should return your locations array

3. **Test Car Search:**
   ```bash
   curl -X POST https://fleetos.eu/api/v1/organizations/your-company-slug/cars/search \
     -H "Content-Type: application/json" \
     -d '{
       "pickup_date": "2024-12-20",
       "dropoff_date": "2024-12-23",
       "pickup_time": "10:00",
       "dropoff_time": "10:00"
     }'
   ```

---

### **STEP 4: Install WordPress Plugin** (10 minutes)

1. **Zip the plugin folder:**
   - Navigate to `wordpress-plugin/fleetos-booking/`
   - Zip the entire folder (not the parent directory)

2. **Upload to WordPress:**
   - WordPress Admin → Plugins → Add New → Upload Plugin
   - Upload the zip file
   - Click "Install Now"

3. **Activate Plugin:**
   - Go to Plugins → Installed Plugins
   - Click "Activate" on "FleetOS Booking Integration"

4. **Configure Settings:**
   - Go to Settings → FleetOS Booking
   - Enter:
     - **Organization Slug**: `your-company-slug` (from Step 2)
     - **API URL**: `https://fleetos.eu/api/v1`
     - **Redirect URL**: `https://fleetos.eu/booking`
   - Click "Save Settings"

---

### **STEP 5: Add Booking Form to WordPress** (5 minutes)

**Option A: Using Shortcode**
- Edit any page/post
- Add: `[fleetos_booking_form]`
- Publish

**Option B: Using Widget**
- Appearance → Widgets
- Add "FleetOS Booking Form" widget to sidebar
- Save

---

### **STEP 6: Set Up Stripe Webhooks** (10 minutes)

If using Stripe payments:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter: `https://fleetos.eu/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to `fleetos-web/.env.local` as `STRIPE_WEBHOOK_SECRET`

---

### **STEP 7: Test Complete Flow** (20 minutes)

1. **Test WordPress Form:**
   - Visit your WordPress site
   - Fill in the booking form
   - Submit
   - Should redirect to `fleetos.eu/booking/your-company-slug/search`

2. **Test Booking Creation:**
   - Select dates, location
   - View available cars
   - Select a car
   - Fill in customer details
   - Select extras/insurance
   - Proceed to payment

3. **Test Payment:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete payment
   - Should see confirmation page

4. **Verify in Database:**
   - Supabase → Table Editor → `online_bookings`
   - Your booking should be there!
   - Check `contracts` table if instant booking is enabled

5. **Check Email:**
   - Customer should receive confirmation email
   - Organization should receive notification email

---

## ✅ Testing Checklist

- [ ] Environment variables configured
- [ ] Organization created in database
- [ ] API endpoints responding correctly
- [ ] WordPress plugin installed and activated
- [ ] Plugin settings configured
- [ ] Booking form added to WordPress site
- [ ] Form redirects to FleetOS booking page
- [ ] Car search works
- [ ] Booking creation works
- [ ] Payment processing works
- [ ] Email confirmations sent
- [ ] Booking appears in database
- [ ] Contract auto-created (if instant booking enabled)
- [ ] Customer auto-registered in `customer_profiles`

---

## 🐛 Troubleshooting

### **"Organization not found" error**
→ Check that you created the organization with the correct slug
→ Verify the slug matches in WordPress plugin settings

### **"No cars available"**
→ Make sure you have cars in `booking_cars` table
→ Check that `is_available_for_booking = true`
→ Verify `is_active = true`

### **"Payment fails"**
→ Use Stripe test card: `4242 4242 4242 4242`
→ Check Stripe keys in environment variables
→ Verify webhook is set up correctly

### **"Email not sending"**
→ Check SendGrid API key
→ Verify `SENDGRID_FROM_EMAIL` is correct
→ Check SendGrid dashboard for delivery status

### **"Booking not appearing in app"**
→ Check `organization_id` is set correctly
→ Verify RLS policies allow access
→ Check if contract auto-creation is enabled

---

## 📚 Additional Resources

- **API Documentation**: See `fleetos-web/app/api/v1/` for endpoint details
- **WordPress Plugin README**: `wordpress-plugin/fleetos-booking/README.md`
- **Implementation Guide**: `IMPLEMENTATION_COMPLETE.md`

---

## 🎉 Success Criteria

You're done when:
- ✅ WordPress form redirects to FleetOS
- ✅ Customers can complete bookings
- ✅ Payments process successfully
- ✅ Emails are sent
- ✅ Bookings appear in FleetOS admin
- ✅ Contracts are auto-created (if enabled)

**Ready to go live!** 🚀

