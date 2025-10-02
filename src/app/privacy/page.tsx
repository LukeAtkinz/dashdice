import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
              ← Back to DashDice
            </Link>
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-gray-400">Last updated: October 2, 2025</p>
          </div>

          {/* Content */}
          <div className="bg-gray-800 rounded-lg p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">1. Information We Collect</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  <strong>Account Information:</strong> When you create an account, we collect your email address and username.
                </p>
                <p>
                  <strong>Game Data:</strong> We store your game statistics, match history, achievements, and friend connections.
                </p>
                <p>
                  <strong>Device Information:</strong> We may collect device type, operating system, and app version for technical support.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">2. How We Use Your Information</h2>
              <div className="space-y-4 text-gray-300">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain the DashDice gaming service</li>
                  <li>Process game matches and maintain leaderboards</li>
                  <li>Enable social features like friend connections and chat</li>
                  <li>Send important updates about your account or the game</li>
                  <li>Improve our services and develop new features</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">3. Information Sharing</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share information in these limited circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With your consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With service providers who help us operate the game (like Firebase)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">4. Data Security</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  We implement appropriate security measures to protect your personal information against unauthorized access, 
                  alteration, disclosure, or destruction. We use industry-standard encryption and secure cloud storage.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">5. Data Retention</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  We retain your account information as long as your account is active. If you delete your account, 
                  we will remove your personal information within 30 days, though some data may be retained for 
                  legal or technical reasons.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">6. Children's Privacy</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  DashDice is not intended for children under 13. We do not knowingly collect personal information 
                  from children under 13. If we become aware that we have collected such information, we will delete it immediately.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">7. Your Rights</h2>
              <div className="space-y-4 text-gray-300">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access the personal information we have about you</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and personal information</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt out of marketing communications</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">8. Third-Party Services</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  DashDice uses Firebase (Google) for authentication and data storage. Their privacy practices are 
                  governed by Google's Privacy Policy. We also use analytics services to improve our game.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">9. International Users</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  DashDice is available globally. Your information may be transferred to and processed in countries 
                  other than your own. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">10. Changes to This Policy</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes by posting 
                  the new policy on this page and updating the "Last updated" date.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">11. Contact Us</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  If you have any questions about this privacy policy or our data practices, please contact us at:
                </p>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p><strong>Email:</strong> privacy@dashdice.gg</p>
                  <p><strong>Website:</strong> https://dashdice.gg</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Return to DashDice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}