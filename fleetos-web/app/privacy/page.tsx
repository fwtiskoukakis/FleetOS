'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          <div>
            <p className="text-gray-600 mb-4">
              <strong>Last updated:</strong> {new Date().toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-4">
              When you use our online booking system, we collect the following information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Personal Information:</strong> Full name, email address, phone number, date of birth</li>
              <li><strong>Identification:</strong> ID number, passport number, driver's license number and details</li>
              <li><strong>Booking Information:</strong> Rental dates, pickup/dropoff locations, vehicle preferences, extras, insurance selections</li>
              <li><strong>Payment Information:</strong> Payment method details (processed securely through our payment providers - Viva Wallet, Stripe). We do not store full credit card details.</li>
              <li><strong>Communication:</strong> Any correspondence, special requests, or feedback you provide</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>To process and manage your vehicle rental bookings</li>
              <li>To communicate with you regarding your bookings, including confirmations, reminders, and updates</li>
              <li>To process payments and prevent fraud</li>
              <li>To comply with legal obligations and regulations</li>
              <li>To improve our services and customer experience</li>
              <li>To send you marketing communications (only with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Storage and Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All data is encrypted in transit using SSL/TLS protocols</li>
              <li>Data is stored on secure servers with restricted access</li>
              <li>Payment information is processed through PCI DSS compliant payment providers</li>
              <li>Regular security audits and updates are performed</li>
              <li>Access to personal data is limited to authorized personnel only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share your data only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Payment Providers:</strong> We share necessary information with Viva Wallet, Stripe, or other payment processors to process your payments</li>
              <li><strong>Service Providers:</strong> We may share data with trusted third-party service providers who assist in operating our platform (e.g., email services, hosting providers)</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale, your data may be transferred to the new entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights (GDPR Compliance)</h2>
            <p className="text-gray-700 mb-4">Under the General Data Protection Regulation (GDPR), you have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Right to Access:</strong> You can request a copy of your personal data we hold</li>
              <li><strong>Right to Rectification:</strong> You can request correction of inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> You can request deletion of your personal data (subject to legal obligations)</li>
              <li><strong>Right to Restrict Processing:</strong> You can request limitation of how we process your data</li>
              <li><strong>Right to Data Portability:</strong> You can request your data in a structured, machine-readable format</li>
              <li><strong>Right to Object:</strong> You can object to processing of your data for marketing purposes</li>
              <li><strong>Right to Withdraw Consent:</strong> You can withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-gray-700 mt-4">
              To exercise any of these rights, please contact us at <a href="mailto:support@fleetos.eu" className="text-blue-600 hover:underline">support@fleetos.eu</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. 
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your personal data only for as long as necessary to fulfill the purposes outlined in this policy, 
              comply with legal obligations, resolve disputes, and enforce our agreements. Booking data is typically retained 
              for 7 years to comply with tax and legal requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your data may be transferred to and processed in countries outside the European Economic Area (EEA). 
              We ensure appropriate safeguards are in place to protect your data in accordance with GDPR requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Email:</strong> <a href="mailto:support@fleetos.eu" className="text-blue-600 hover:underline">support@fleetos.eu</a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Website:</strong> <a href="https://www.fleetos.eu" className="text-blue-600 hover:underline">www.fleetos.eu</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
              We will notify you of any material changes by posting the updated policy on this page and updating the "Last updated" date. 
              We encourage you to review this policy periodically.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

