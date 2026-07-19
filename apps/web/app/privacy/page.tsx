import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Yousuf Rice collects, uses, stores, and shares information when you use our website or mobile app.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "1. Information We Collect",
    body: (
      <>
        <p>
          <strong>When you place an order</strong>, we collect the information
          needed to process and deliver it: 
        </p>
        <ul>
          <li>
            Name, email address, and phone number — so we can confirm your order
            and contact you about it.
          </li>
          <li>Delivery address — so we know where to deliver your rice.</li>
          <li>
            Order details and order history — so we can prepare, track, and
            support your order.
          </li>
        </ul>
        <p>
          <strong>When you create an account</strong>, we store your login details
          so you don’t have to re-enter your information on future orders.
        </p>
        <p>
          <strong>Location information (optional):</strong>
        </p>
        <ul>
          <li>
            If you choose <strong>Use GPS</strong> at checkout, we use your
            device’s location to save delivery coordinates for that order.
          </li>
          <li>
            This is entirely optional. You can skip GPS and type your delivery
            address manually instead — GPS is never required to browse the
            catalog or place an order.
          </li>
        </ul>
        <p>
          <strong>Technical information (collected automatically):</strong>
        </p>
        <ul>
          <li>
            IP address, device type, and app version — used for security, fraud
            prevention, and keeping the app running correctly.
          </li>
        </ul>
        <p>
          <strong>Advertising and analytics information:</strong>
        </p>
        <ul>
          <li>
            We use <strong>Meta (Facebook) Pixel</strong> on our website, along
            with <strong>Meta’s Conversions API</strong>, to measure and improve
            our ads.
          </li>
          <li>
            This means that when you visit our site or complete an order, certain
            event data (such as page views, and — in hashed, non-readable form —
            your email address or phone number if you’ve provided one) may be
            sent directly to Meta’s servers to help us measure ad performance and
            show relevant ads.
          </li>
          <li>
            In the iOS app, we ask for permission through Apple’s App Tracking
            Transparency prompt before sending app activity or hashed contact
            data to Meta. If you decline, the iOS app does not send those events
            to Meta.
          </li>
          <li>
            We do not send Meta your delivery address. We send only the limited
            shopping event, product, purchase, and hashed contact data needed
            for ad measurement.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "2. How We Use Information",
    body: (
      <ul>
        <li>Process and deliver cash-on-delivery orders.</li>
        <li>Save delivery details so future checkouts are faster.</li>
        <li>Provide order status updates and customer support.</li>
        <li>
          Send delivery notifications and offers, if you’ve enabled
          notifications.
        </li>
        <li>
          Measure and improve the performance of our advertising (via Meta
          Pixel/Conversions API).
        </li>
        <li>
          Maintain, secure, and improve the Yousuf Rice website and app.
        </li>
      </ul>
    ),
  },
  {
    title: "3. Payments",
    body: (
      <p>
        Yousuf Rice currently accepts <strong>cash on delivery only</strong>. We
        do not collect, process, or store credit/debit card numbers or online
        payment credentials anywhere in the app or website.
      </p>
    ),
  },
  {
    title: "4. Where Your Data Is Stored and How It's Protected",
    body: (
      <>
        <p>
          We run our own backend software (a self-hosted, open-source server
          platform) on a private server that we manage ourselves. Because we
          manage this software directly, no customer data is transmitted to any
          third-party database or backend-as-a-service provider — it stays on
          infrastructure under our own control.
        </p>
        <p>We apply reasonable technical safeguards, including:</p>
        <ul>
          <li>
            Encrypted connections (HTTPS) between your device and our servers
          </li>
          <li>Restricted administrative access to the server and database</li>
          <li>Regular backups and routine security maintenance</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Who We Share Information With",
    body: (
      <>
        <p>We share information only where necessary:</p>
        <ul>
          <li>
            <strong>Order fulfillment staff</strong> — to prepare, support, and
            deliver your order.
          </li>
          <li>
            <strong>Meta (Facebook)</strong> — receives limited event and hashed
            contact data via Pixel/Conversions API, solely for ad measurement,
            as described above.
          </li>
          <li>
            <strong>Apple App Store / Google Play Store</strong> — as the
            platforms distributing our app, subject to their own respective
            privacy and diagnostic policies for app installs and updates.
          </li>
        </ul>
        <p>We do not sell your personal information to anyone.</p>
        <p>
          Calls made to our business phone line (used for order confirmation and
          customer support) may be recorded for quality and training purposes.
        </p>
      </>
    ),
  },
  {
    title: "6. Data Retention",
    body: (
      <p>
        We keep your information for as long as needed to provide the service,
        support you as a customer, meet any legal obligations, and resolve
        disputes. You can ask us to delete your account information at any time
        (see Section 8).
      </p>
    ),
  },
  {
    title: "7. Delivery Area",
    body: (
      <p>
        Yousuf Rice currently delivers within <strong>Pakistan only</strong>.
      </p>
    ),
  },
  {
    title: "8. Your Choices and Rights",
    body: (
      <ul>
        <li>
          Skip GPS and enter your delivery address manually — no impact on your
          ability to order.
        </li>
        <li>
          Disable notifications any time in your device settings.
        </li>
        <li>
          Delete your account directly in the mobile app from{" "}
          <strong>Account → Delete account</strong>. This permanently removes
          your Appwrite login and notification targets and disconnects your
          customer profile. Existing order and delivery records may be retained
          where needed to fulfill orders, prevent fraud, resolve disputes, and
          meet recordkeeping obligations.
        </li>
        <li>
          Limit ad tracking: you can manage how Meta uses your data for ads
          through your{" "}
          <a
            href="https://www.facebook.com/adpreferences/ad_settings"
            target="_blank"
            rel="noopener noreferrer"
          >
            Meta Ad Preferences
          </a>{" "}
          or by using browser-level tracking protection.
        </li>
        <li>
          Contact us for any questions related to your order or account.
        </li>
      </ul>
    ),
  },
  {
    title: "9. Children's Privacy",
    body: (
      <p>
        Yousuf Rice is intended for general audiences and is not directed at
        children. We do not knowingly collect personal information from children.
      </p>
    ),
  },
  {
    title: "10. Scope",
    body: (
      <p>
        This Privacy Policy applies to the Yousuf Rice iOS app, Android app, and
        website.
      </p>
    ),
  },
  {
    title: "11. Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. The “Last updated”
        date at the top reflects the most recent revision. Continued use of the
        app or website after changes means you accept the updated policy.
      </p>
    ),
  },
  {
    title: "12. Contact Us",
    body: (
      <p>
        For order-related questions or support, email{" "}
        <a
          href="mailto:support@ssricemills.com"
          className="font-semibold text-[#27247b] underline decoration-[#ffff03] decoration-2 underline-offset-4"
        >
          support@ssricemills.com
        </a>{" "}
        or call{" "}
        <a href="tel:+923332339557">+92 333 2339557</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
      <section className="bg-[#27247b] text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[#ffff03]">
            Yousuf Rice
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
            We explain what information we collect, use, store, and share when
            you use our website or mobile app.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border-2 border-[#ffff03]/60 bg-[#ffff03]/10 p-5 text-sm text-gray-700">
          <strong className="text-[#27247b]">Last updated:</strong> July 19,
          2026
        </div>

        <div className="space-y-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-10">
          <p className="text-lg leading-relaxed text-gray-700">
            This Privacy Policy explains how Yousuf Rice, a brand of SS
            International (Karachi, Pakistan), collects, uses, stores, and shares
            information when you use our website, iOS app, or Android app.
          </p>

          <p className="text-sm leading-relaxed text-gray-500">
            SS International is the data controller responsible for this
            information. If you have questions, see the <strong>Contact Us</strong> section below.
          </p>

          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-2xl font-bold text-[#27247b]">
                {section.title}
              </h2>
              <div className="space-y-3 leading-relaxed text-gray-700 [&_a]:font-semibold [&_a]:text-[#27247b] [&_a]:underline [&_a]:decoration-[#ffff03] [&_a]:decoration-2 [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
