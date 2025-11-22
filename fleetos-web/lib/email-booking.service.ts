/**
 * Email Service for Booking Notifications
 * Handles all email communications related to online bookings
 */

interface BookingEmailData {
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  organizationName: string;
  organizationEmail?: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffDate: string;
  dropoffTime: string;
  dropoffLocation: string;
  carMakeModel: string;
  totalPrice: number;
  paymentStatus: string;
  bookingStatus: string;
  paymentMethod?: string;
  language?: string;
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@fleetos.eu';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'FleetOS';

/**
 * Send booking confirmation email to customer
 */
export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const language = data.language || 'el';
    const isGreek = language === 'el';

    const subject = isGreek
      ? `Επιβεβαίωση Κράτησης - ${data.bookingNumber}`
      : `Booking Confirmation - ${data.bookingNumber}`;

    const htmlContent = generateBookingConfirmationHTML(data, isGreek);
    const textContent = generateBookingConfirmationText(data, isGreek);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.customerEmail, name: data.customerName }],
            subject,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/plain',
            value: textContent,
          },
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(data: BookingEmailData): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const language = data.language || 'el';
    const isGreek = language === 'el';

    const subject = isGreek
      ? `Επιβεβαίωση Πληρωμής - ${data.bookingNumber}`
      : `Payment Confirmation - ${data.bookingNumber}`;

    const htmlContent = generatePaymentConfirmationHTML(data, isGreek);
    const textContent = generatePaymentConfirmationText(data, isGreek);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.customerEmail, name: data.customerName }],
            subject,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/plain',
            value: textContent,
          },
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return false;
  }
}

/**
 * Send booking reminder email (24 hours before pickup)
 */
export async function sendBookingReminderEmail(data: BookingEmailData): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const language = data.language || 'el';
    const isGreek = language === 'el';

    const subject = isGreek
      ? `Υπενθύμιση Κράτησης - ${data.bookingNumber}`
      : `Booking Reminder - ${data.bookingNumber}`;

    const htmlContent = generateBookingReminderHTML(data, isGreek);
    const textContent = generateBookingReminderText(data, isGreek);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.customerEmail, name: data.customerName }],
            subject,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/plain',
            value: textContent,
          },
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending booking reminder email:', error);
    return false;
  }
}

/**
 * Send notification to organization about new booking
 */
export async function sendOrganizationBookingNotification(
  organizationEmail: string,
  organizationName: string,
  bookingData: BookingEmailData
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const subject = `Νέα Κράτηση - ${bookingData.bookingNumber}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Νέα Κράτηση</h1>
          </div>
          <div class="content">
            <p>Έχετε μια νέα κράτηση που χρειάζεται προσοχή:</p>
            <div class="info-row">
              <span class="label">Αριθμός Κράτησης:</span>
              <span class="value">${bookingData.bookingNumber}</span>
            </div>
            <div class="info-row">
              <span class="label">Πελάτης:</span>
              <span class="value">${bookingData.customerName}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${bookingData.customerEmail}</span>
            </div>
            <div class="info-row">
              <span class="label">Οχήμα:</span>
              <span class="value">${bookingData.carMakeModel}</span>
            </div>
            <div class="info-row">
              <span class="label">Παραλαβή:</span>
              <span class="value">${bookingData.pickupDate} ${bookingData.pickupTime} - ${bookingData.pickupLocation}</span>
            </div>
            <div class="info-row">
              <span class="label">Σύνολο:</span>
              <span class="value">€${bookingData.totalPrice.toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span class="label">Κατάσταση Πληρωμής:</span>
              <span class="value">${bookingData.paymentStatus}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: organizationEmail, name: organizationName }],
            subject,
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending organization notification:', error);
    return false;
  }
}

// HTML Template Generators
function generateBookingConfirmationHTML(data: BookingEmailData, isGreek: boolean): string {
  const formatPrice = (amount: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
        .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .total { font-size: 24px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isGreek ? 'Επιβεβαίωση Κράτησης' : 'Booking Confirmation'}</h1>
          <p>${data.bookingNumber}</p>
        </div>
        <div class="content">
          <p>${isGreek ? `Αγαπητέ/ή ${data.customerName},` : `Dear ${data.customerName},`}</p>
          <p>${isGreek ? 'Η κράτησή σας έχει επιβεβαιωθεί επιτυχώς!' : 'Your booking has been confirmed successfully!'}</p>
          
          <div class="info-box">
            <h3>${isGreek ? 'Λεπτομέρειες Κράτησης' : 'Booking Details'}</h3>
            <div class="info-row">
              <span class="label">${isGreek ? 'Οχήμα:' : 'Vehicle:'}</span>
              <span class="value">${data.carMakeModel}</span>
            </div>
            <div class="info-row">
              <span class="label">${isGreek ? 'Παραλαβή:' : 'Pickup:'}</span>
              <span class="value">${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}</span>
            </div>
            <div class="info-row">
              <span class="label">${isGreek ? 'Παράδοση:' : 'Dropoff:'}</span>
              <span class="value">${data.dropoffDate} ${data.dropoffTime} - ${data.dropoffLocation}</span>
            </div>
          </div>
          
          <div class="total">
            ${isGreek ? 'Σύνολο:' : 'Total:'} ${formatPrice(data.totalPrice)}
          </div>
          
          <p>${isGreek ? 'Σας ευχαριστούμε για την κράτησή σας!' : 'Thank you for your booking!'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateBookingConfirmationText(data: BookingEmailData, isGreek: boolean): string {
  return isGreek
    ? `Επιβεβαίωση Κράτησης - ${data.bookingNumber}\n\nΑγαπητέ/ή ${data.customerName},\n\nΗ κράτησή σας έχει επιβεβαιωθεί επιτυχώς!\n\nΛεπτομέρειες:\nΟχήμα: ${data.carMakeModel}\nΠαραλαβή: ${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}\nΠαράδοση: ${data.dropoffDate} ${data.dropoffTime} - ${data.dropoffLocation}\nΣύνολο: €${data.totalPrice.toFixed(2)}\n\nΣας ευχαριστούμε!`
    : `Booking Confirmation - ${data.bookingNumber}\n\nDear ${data.customerName},\n\nYour booking has been confirmed successfully!\n\nDetails:\nVehicle: ${data.carMakeModel}\nPickup: ${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}\nDropoff: ${data.dropoffDate} ${data.dropoffTime} - ${data.dropoffLocation}\nTotal: €${data.totalPrice.toFixed(2)}\n\nThank you!`;
}

function generatePaymentConfirmationHTML(data: BookingEmailData, isGreek: boolean): string {
  const formatPrice = (amount: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isGreek ? 'Επιβεβαίωση Πληρωμής' : 'Payment Confirmation'}</h1>
        </div>
        <div class="content">
          <div class="success-icon">✓</div>
          <p>${isGreek ? `Αγαπητέ/ή ${data.customerName},` : `Dear ${data.customerName},`}</p>
          <p>${isGreek ? 'Η πληρωμή σας έχει ολοκληρωθεί επιτυχώς!' : 'Your payment has been completed successfully!'}</p>
          <p><strong>${isGreek ? 'Ποσό:' : 'Amount:'}</strong> ${formatPrice(data.totalPrice)}</p>
          <p><strong>${isGreek ? 'Αριθμός Κράτησης:' : 'Booking Number:'}</strong> ${data.bookingNumber}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentConfirmationText(data: BookingEmailData, isGreek: boolean): string {
  return isGreek
    ? `Επιβεβαίωση Πληρωμής\n\nΑγαπητέ/ή ${data.customerName},\n\nΗ πληρωμή σας έχει ολοκληρωθεί επιτυχώς!\n\nΠοσό: €${data.totalPrice.toFixed(2)}\nΑριθμός Κράτησης: ${data.bookingNumber}`
    : `Payment Confirmation\n\nDear ${data.customerName},\n\nYour payment has been completed successfully!\n\nAmount: €${data.totalPrice.toFixed(2)}\nBooking Number: ${data.bookingNumber}`;
}

function generateBookingReminderHTML(data: BookingEmailData, isGreek: boolean): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isGreek ? 'Υπενθύμιση Κράτησης' : 'Booking Reminder'}</h1>
        </div>
        <div class="content">
          <p>${isGreek ? `Αγαπητέ/ή ${data.customerName},` : `Dear ${data.customerName},`}</p>
          <p>${isGreek ? 'Αυτό είναι μια φιλική υπενθύμιση ότι η κράτησή σας είναι αύριο!' : 'This is a friendly reminder that your booking is tomorrow!'}</p>
          <p><strong>${isGreek ? 'Παραλαβή:' : 'Pickup:'}</strong> ${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}</p>
          <p>${isGreek ? 'Παρακαλούμε να είστε στην τοποθεσία 15 λεπτά πριν την ώρα παραλαβής.' : 'Please arrive at the location 15 minutes before your scheduled pickup time.'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateBookingReminderText(data: BookingEmailData, isGreek: boolean): string {
  return isGreek
    ? `Υπενθύμιση Κράτησης\n\nΑγαπητέ/ή ${data.customerName},\n\nΑυτό είναι μια φιλική υπενθύμιση ότι η κράτησή σας είναι αύριο!\n\nΠαραλαβή: ${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}\n\nΠαρακαλούμε να είστε στην τοποθεσία 15 λεπτά πριν την ώρα παραλαβής.`
    : `Booking Reminder\n\nDear ${data.customerName},\n\nThis is a friendly reminder that your booking is tomorrow!\n\nPickup: ${data.pickupDate} ${data.pickupTime} - ${data.pickupLocation}\n\nPlease arrive at the location 15 minutes before your scheduled pickup time.`;
}

