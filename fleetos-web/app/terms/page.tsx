'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          <div>
            <p className="text-gray-600 mb-4">
              <strong>Last updated:</strong> {new Date().toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-gray-700">
              By using our online booking system and making a reservation, you agree to be bound by these Terms and Conditions. 
              Please read them carefully before making a booking.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Booking and Payment Terms</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All bookings are subject to availability and confirmation</li>
              <li>Prices are displayed in EUR and include VAT where applicable</li>
              <li>Payment can be made online via secure payment methods (Viva Wallet, Stripe, bank transfer)</li>
              <li>A security deposit may be required and will be held until the return of the vehicle</li>
              <li>Full payment may be required at the time of booking or a deposit with balance on pickup</li>
              <li>All prices are final once the booking is confirmed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Delivery Methods and Pickup/Dropoff</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 Pickup and Dropoff Locations</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vehicle pickup and dropoff will be at the locations specified during booking</li>
              <li>You must arrive at the pickup location at the scheduled time</li>
              <li>Late arrivals may result in the vehicle being released to another customer</li>
              <li>Additional fees may apply for pickup/dropoff at different locations</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 Delivery Service</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Delivery to airports, hotels, or other locations may be available upon request (additional fees apply)</li>
              <li>Delivery arrangements must be confirmed at least 24 hours in advance</li>
              <li>You must be present at the delivery location to receive the vehicle</li>
              <li>Valid identification and driver's license must be presented at delivery</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.3 Collection Requirements</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Valid driver's license (held for minimum 2 years, or as specified for vehicle category)</li>
              <li>Valid credit/debit card in the primary driver's name for security deposit</li>
              <li>Valid identification (passport or ID card)</li>
              <li>Minimum age requirements apply (typically 21-25 years depending on vehicle category)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cancellation and Refund Policy</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.1 Cancellation by Customer</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>More than 48 hours before pickup:</strong> Full refund minus administrative fees (if any)</li>
              <li><strong>24-48 hours before pickup:</strong> 50% refund of the total booking amount</li>
              <li><strong>Less than 24 hours before pickup:</strong> No refund</li>
              <li><strong>No-show:</strong> No refund will be provided</li>
              <li>Cancellations must be made via email to support@fleetos.eu or through the booking system</li>
              <li>Refunds will be processed to the original payment method within 5-10 business days</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.2 Cancellation by Company</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>We reserve the right to cancel bookings due to unforeseen circumstances (e.g., vehicle unavailability, safety concerns)</li>
              <li>In case of cancellation by us, you will receive a full refund</li>
              <li>We will make every effort to provide an alternative vehicle of similar or better category</li>
              <li>We are not liable for any additional costs incurred due to our cancellation</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.3 Modification of Booking</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Booking modifications are subject to availability and may incur additional charges</li>
              <li>Changes must be requested at least 48 hours before the original pickup time</li>
              <li>Price differences will be charged or refunded accordingly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Return and Refund Policy</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.1 Vehicle Return</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vehicle must be returned at the scheduled time and location</li>
              <li>Late returns may incur additional daily charges</li>
              <li>Vehicle must be returned in the same condition as received (normal wear and tear excepted)</li>
              <li>Fuel tank must be returned at the same level as at pickup, or refueling charges will apply</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 Damage Assessment and Charges</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vehicle will be inspected upon return</li>
              <li>Any damage beyond normal wear and tear will be charged to the customer</li>
              <li>Charges will be deducted from the security deposit or charged to the payment method on file</li>
              <li>Repair costs will be based on actual repair invoices</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.3 Refund Processing</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Security deposits will be released within 7-14 days after vehicle return, pending damage inspection</li>
              <li>Refunds for cancellations will be processed within 5-10 business days</li>
              <li>All refunds will be made to the original payment method</li>
              <li>Administrative fees (if applicable) are non-refundable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Driver Requirements and Restrictions</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Minimum age: 21-25 years (varies by vehicle category)</li>
              <li>Valid driver's license held for at least 2 years</li>
              <li>No alcohol or drug consumption while driving</li>
              <li>Vehicle must not be used for illegal purposes</li>
              <li>Vehicle must not be driven off-road or on unpaved surfaces (unless vehicle category permits)</li>
              <li>Additional drivers must be registered and meet the same requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Insurance Coverage</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Basic insurance coverage is included in the rental price</li>
              <li>Additional insurance options may be available at extra cost</li>
              <li>Insurance coverage details will be provided in the rental agreement</li>
              <li>Insurance may be voided in case of violation of terms (e.g., driving under influence, off-road driving)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Liability and Limitations</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>You are responsible for the vehicle during the rental period</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the rental amount paid</li>
              <li>We are not responsible for personal belongings left in the vehicle</li>
              <li>You must report any accidents or incidents immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Payment Methods</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>We accept payments via Viva Wallet, Stripe, and bank transfer</li>
              <li>All payments are processed securely through PCI DSS compliant payment providers</li>
              <li>Payment information is encrypted and not stored on our servers</li>
              <li>Payment disputes should be raised within 30 days of the transaction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Force Majeure</h2>
            <p className="text-gray-700 mb-4">
              We are not liable for failure to perform our obligations due to circumstances beyond our reasonable control, 
              including but not limited to natural disasters, pandemics, government actions, or acts of terrorism.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms and Conditions are governed by the laws of Greece. Any disputes will be subject to the exclusive 
              jurisdiction of the courts of Greece.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions, complaints, or to exercise your rights regarding cancellations or refunds, please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Customer Service Email:</strong> <a href="mailto:support@fleetos.eu" className="text-blue-600 hover:underline">support@fleetos.eu</a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Customer Service Phone:</strong> Available on our website footer
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Website:</strong> <a href="https://www.fleetos.eu" className="text-blue-600 hover:underline">www.fleetos.eu</a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Business Hours:</strong> Monday - Friday: 9:00 - 18:00, Saturday: 10:00 - 15:00 (Greek Time)
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms and Conditions at any time. Material changes will be notified 
              on this page. Continued use of our services after changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

