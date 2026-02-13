export const metadata = {
  title: 'Privacy Policy — PUMWI',
  description: 'How PUMWI collects and uses your data. Artisan OS, Studio Logs, and DPO contact.',
}

export default function PrivacyPage() {
  return (
    <article className="max-w-none">
      <p className="text-sm text-gray-500 mb-8">Last updated: Feb 2026</p>

      <div className="prose prose-slate prose-lg max-w-none">
        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          1. Introduction
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          PUMWI (&quot;we&quot;, &quot;our&quot;) respects your privacy. This policy describes what data we
          collect, how we use it, and your rights. By using the Service, you agree to
          this Privacy Policy.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          2. Data We Collect
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We collect information you provide (e.g., account details, profile, and
          content) and data generated when you use the Service. In particular, we
          collect data to power the <strong>Artisan OS</strong>—our operating system for
          artists—including:
        </p>
        <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
          <li>Inventory data (products, stock levels)</li>
          <li>Sales and order logs</li>
          <li>Shipping and fulfillment information</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          This data is used to operate the Artisan OS, fulfill orders, and improve the
          platform.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          3. Studio Logs
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          <strong>Studio Logs</strong> are public content that artists share voluntarily.
          When you post a Studio Log, it is visible to other users and may be indexed or
          shared in connection with the Service. You control what you publish; do not
          include sensitive or personally identifiable information you do not wish to
          make public.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          4. How We Use Your Data
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We use collected data to provide, secure, and improve the Service; to process
          transactions; to communicate with you; and to comply with legal obligations.
          We do not sell your personal data to third parties for marketing.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          5. Sharing & Disclosure
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We may share data with service providers that help us operate the platform
          (e.g., hosting, payments). We may disclose data when required by law or to
          protect our rights and users.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          6. Data Retention
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We retain your data for as long as your account is active or as needed to
          provide the Service and comply with legal obligations. You may request
          deletion of your data subject to applicable law.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          7. Your Rights
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Depending on your jurisdiction, you may have the right to access, correct,
          delete, or port your data, or to object to or restrict certain processing.
          To exercise these rights, contact our Data Protection contact below.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-2">
          8. Data Protection Contact (DPO)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-12">
          For privacy-related requests, questions, or to contact our Data Protection
          Officer, email:{' '}
          <a
            href="mailto:taewan0819g@gmail.com"
            className="text-[#2F5D50] font-medium hover:underline"
          >
            taewan0819g@gmail.com
          </a>
        </p>
      </div>
    </article>
  )
}
