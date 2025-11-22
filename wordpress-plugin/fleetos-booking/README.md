# FleetOS Booking WordPress Plugin

Integrate FleetOS car rental booking system with your WordPress site.

## Installation

1. Upload the `fleetos-booking` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings → FleetOS Booking and configure your organization slug

## Configuration

1. **Organization Slug**: Your unique organization identifier from FleetOS
2. **API URL**: The FleetOS API endpoint (default: https://fleetos.eu/api/v1)
3. **Redirect URL**: Where to redirect users after form submission (default: https://fleetos.eu/booking)

## Usage

### Shortcode

Add the booking form anywhere using:

```
[fleetos_booking_form]
```

### Widget

1. Go to Appearance → Widgets
2. Add "FleetOS Booking Form" widget to your sidebar or widget area
3. Configure the widget title

### PHP Template

```php
<?php echo do_shortcode('[fleetos_booking_form]'); ?>
```

## Features

- ✅ Availability search form
- ✅ Date and time selection
- ✅ Location selection (pickup/dropoff)
- ✅ Automatic redirect to FleetOS booking platform
- ✅ Responsive design
- ✅ Customizable styling

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Active FleetOS account with organization slug

## Support

For support, visit https://fleetos.eu/support

