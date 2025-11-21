// Email notification service using SendGrid
// Documentation: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs

import sgMail from '@sendgrid/mail';

// Initialize SendGrid (only if API key is available)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@fleetos-rentals.gr';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  bookingNumber: string;
  carName: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffDate: string;
  dropoffTime: string;
  dropoffLocation: string;
  totalPrice: number;
  paymentStatus: string;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid not configured. Email would be sent to:', data.customerEmail);
      console.log('📧 Booking confirmation:', data);
      return { success: true, simulated: true };
    }

    const msg = {
      to: data.customerEmail,
      from: EMAIL_FROM,
      subject: `✓ Επιβεβαίωση Κράτησης #${data.bookingNumber}`,
      html: generateBookingConfirmationHTML(data),
      text: generateBookingConfirmationText(data),
    };

    await sgMail.send(msg);
    console.log('✅ Booking confirmation email sent to:', data.customerEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail(data: BookingEmailData) {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid not configured. Payment email would be sent to:', data.customerEmail);
      return { success: true, simulated: true };
    }

    const msg = {
      to: data.customerEmail,
      from: EMAIL_FROM,
      subject: `✓ Πληρωμή Επιβεβαιώθηκε - Κράτηση #${data.bookingNumber}`,
      html: generatePaymentConfirmationHTML(data),
      text: `Η πληρωμή σας για την κράτηση #${data.bookingNumber} ολοκληρώθηκε επιτυχώς!`,
    };

    await sgMail.send(msg);
    console.log('✅ Payment confirmation email sent to:', data.customerEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending payment email:', error);
    return { success: false, error };
  }
}

export async function sendBookingReminderEmail(data: BookingEmailData) {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid not configured. Reminder email would be sent to:', data.customerEmail);
      return { success: true, simulated: true };
    }

    const msg = {
      to: data.customerEmail,
      from: EMAIL_FROM,
      subject: `📅 Υπενθύμιση: Η παραλαβή σας είναι αύριο! - #${data.bookingNumber}`,
      html: generateBookingReminderHTML(data),
      text: `Υπενθύμιση: Η παραλαβή του αυτοκινήτου σας είναι αύριο ${data.pickupDate} στις ${data.pickupTime}`,
    };

    await sgMail.send(msg);
    console.log('✅ Reminder email sent to:', data.customerEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending reminder email:', error);
    return { success: false, error };
  }
}

// Helper function to generate plain text version
function generateBookingConfirmationText(data: BookingEmailData): string {
  return `
Αγαπητέ/ή ${data.customerName},

Η κράτησή σας επιβεβαιώθηκε!

Κωδικός Κράτησης: #${data.bookingNumber}

ΟΧΗΜΑ: ${data.carName}

ΠΑΡΑΛΑΒΗ:
Ημερομηνία: ${data.pickupDate} στις ${data.pickupTime}
Τοποθεσία: ${data.pickupLocation}

ΠΑΡΑΔΟΣΗ:
Ημερομηνία: ${data.dropoffDate} στις ${data.dropoffTime}
Τοποθεσία: ${data.dropoffLocation}

ΣΥΝΟΛΟ: €${data.totalPrice.toFixed(2)}
Κατάσταση Πληρωμής: ${data.paymentStatus === 'paid' ? 'Ολοκληρώθηκε' : 'Εκκρεμής'}

Για ερωτήσεις, επικοινωνήστε μαζί μας.

Ευχαριστούμε!
  `.trim();
}

function generateBookingConfirmationHTML(data: BookingEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          .info-row { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
          .total { font-size: 24px; font-weight: bold; color: #2563eb; text-align: right; margin-top: 20px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Η κράτησή σας επιβεβαιώθηκε!</h1>
            <p style="font-size: 20px; margin: 10px 0 0 0;">Κωδικός: #${data.bookingNumber}</p>
          </div>
          
          <div class="content">
            <h2>Αγαπητέ/ή ${data.customerName},</h2>
            <p>Σας ευχαριστούμε για την κράτησή σας! Παρακάτω θα βρείτε όλες τις λεπτομέρειες:</p>
            
            <h3 style="margin-top: 30px;">🚗 Όχημα</h3>
            <p style="font-size: 18px; font-weight: bold;">${data.carName}</p>
            
            <h3 style="margin-top: 30px;">📅 Ημερομηνίες & Τοποθεσίες</h3>
            <div class="info-row">
              <strong>Παραλαβή:</strong>
              <span>${data.pickupDate} στις ${data.pickupTime}</span>
            </div>
            <div class="info-row">
              <strong>Τοποθεσία:</strong>
              <span>${data.pickupLocation}</span>
            </div>
            <div class="info-row">
              <strong>Παράδοση:</strong>
              <span>${data.dropoffDate} στις ${data.dropoffTime}</span>
            </div>
            <div class="info-row">
              <strong>Τοποθεσία:</strong>
              <span>${data.dropoffLocation}</span>
            </div>
            
            <div class="total">
              Σύνολο: €${data.totalPrice.toFixed(2)}
            </div>
            
            <p style="margin-top: 30px;">
              <strong>Κατάσταση Πληρωμής:</strong> ${data.paymentStatus === 'paid' ? '✓ Ολοκληρώθηκε' : '⏳ Εκκρεμής'}
            </p>
            
            <h3 style="margin-top: 30px;">📋 Επόμενα Βήματα</h3>
            <ol>
              <li>Φέρτε μαζί σας το δίπλωμα οδήγησής σας και ταυτότητα/διαβατήριο</li>
              <li>Παρουσιαστείτε στο σημείο παραλαβής την καθορισμένη ημερομηνία και ώρα</li>
              <li>Για οποιαδήποτε ερώτηση, επικοινωνήστε μαζί μας</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking-details?id=${data.bookingNumber}" class="button">
                Δείτε την Κράτησή σας
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Αν έχετε ερωτήσεις, επικοινωνήστε μαζί μας:</p>
            <p><strong>Email:</strong> info@yourcompany.gr | <strong>Τηλέφωνο:</strong> +30 210 1234567</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generatePaymentConfirmationHTML(data: BookingEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .success-icon { font-size: 60px; margin-bottom: 20px; }
          .amount { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 30px 0; }
          .info-box { background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; }
          .button { display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Πληρωμή Επιβεβαιώθηκε!</h1>
            <p>Κράτηση #${data.bookingNumber}</p>
          </div>
          
          <div class="content">
            <p style="font-size: 18px;">Αγαπητέ/ή <strong>${data.customerName}</strong>,</p>
            <p>Η πληρωμή σας ολοκληρώθηκε επιτυχώς! Είστε έτοιμοι να παραλάβετε το όχημά σας.</p>
            
            <div class="amount">
              €${data.totalPrice.toFixed(2)}
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">📋 Λεπτομέρειες Κράτησης</h3>
              <p><strong>Όχημα:</strong> ${data.carName}</p>
              <p><strong>Παραλαβή:</strong> ${data.pickupDate} στις ${data.pickupTime}<br>
              <em>${data.pickupLocation}</em></p>
              <p><strong>Παράδοση:</strong> ${data.dropoffDate} στις ${data.dropoffTime}<br>
              <em>${data.dropoffLocation}</em></p>
            </div>
            
            <h3>📝 Τι να φέρετε μαζί σας:</h3>
            <ul>
              <li>✓ Δίπλωμα οδήγησης (σε ισχύ)</li>
              <li>✓ Ταυτότητα ή διαβατήριο</li>
              <li>✓ Πιστωτική κάρτα για εγγύηση</li>
              <li>✓ Το email επιβεβαίωσης (εκτυπωμένο ή στο κινητό)</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <p>Ανυπομονούμε να σας υποδεχτούμε!</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Χρειάζεστε βοήθεια;</strong></p>
            <p>Email: info@fleetos-rentals.gr | Τηλ: +30 210 123 4567</p>
            <p style="font-size: 12px; margin-top: 20px;">FleetOS Car Rentals - Κλείστε το ιδανικό αυτοκίνητο</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateBookingReminderHTML(data: BookingEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .clock-icon { font-size: 60px; margin-bottom: 20px; }
          .highlight { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; font-size: 18px; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="clock-icon">⏰</div>
            <h1>Υπενθύμιση Παραλαβής</h1>
            <p>Η κράτησή σας είναι αύριο!</p>
          </div>
          
          <div class="content">
            <p style="font-size: 18px;">Αγαπητέ/ή <strong>${data.customerName}</strong>,</p>
            <p>Σας υπενθυμίζουμε ότι η παραλαβή του αυτοκινήτου σας είναι <strong>αύριο</strong>!</p>
            
            <div class="highlight">
              <strong>📅 Παραλαβή: ${data.pickupDate} στις ${data.pickupTime}</strong><br>
              📍 ${data.pickupLocation}
            </div>
            
            <h3 style="margin-top: 30px;">🚗 Το Όχημά σας</h3>
            <p style="font-size: 18px;"><strong>${data.carName}</strong></p>
            <p><strong>Κωδικός Κράτησης:</strong> #${data.bookingNumber}</p>
            
            <h3 style="margin-top: 30px;">✅ Checklist Παραλαβής</h3>
            <ul style="font-size: 16px; line-height: 2;">
              <li>□ Δίπλωμα οδήγησης</li>
              <li>□ Ταυτότητα/Διαβατήριο</li>
              <li>□ Πιστωτική κάρτα</li>
              <li>□ Email επιβεβαίωσης</li>
            </ul>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>💡 Συμβουλή:</strong> Φτάστε 10 λεπτά νωρίτερα για να έχετε άνετο χρόνο!</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p><strong>Παράδοση:</strong> ${data.dropoffDate} στις ${data.dropoffTime}</p>
              <p>📍 ${data.dropoffLocation}</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Ερωτήσεις;</strong></p>
            <p>Email: info@fleetos-rentals.gr | Τηλ: +30 210 123 4567</p>
            <p>WhatsApp: +30 690 123 4567</p>
            <p style="font-size: 12px; margin-top: 20px;">Καλό ταξίδι! 🚗💨</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

