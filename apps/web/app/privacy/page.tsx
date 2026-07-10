import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Yousuf Rice collects, uses, and protects information when you order rice online or use our mobile app.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "Information we collect",
    body: (
      <>
        <p>
          When you use Yousuf Rice, we may collect information you choose to
          provide, including your name, email address, phone number, account
          details, delivery address, and order information.
        </p>
        <p>
          If you choose <strong>Use GPS</strong> during checkout, the app uses
          your device location to save delivery coordinates. Location access
          is requested only for this purpose and is not required for browsing
          the catalog.
        </p>
      </>
    ),
  },
  {
    title: "How we use information",
    body: (
      <ul>
        <li>Process and deliver cash-on-delivery orders.</li>
        <li>Save delivery details so future checkouts are faster.</li>
        <li>Provide order status updates and customer support.</li>
        <li>Send delivery notifications and relevant customer offers when you enable notifications.</li>
        <li>Maintain, secure, and improve the Yousuf Rice website and app.</li>
      </ul>
    ),
  },
  {
    title: "Payments and service providers",
    body: (
      <>
        <p>
          Yousuf Rice currently accepts cash on delivery. We do not collect or
          store credit-card numbers or online payment credentials in the app.
        </p>
        <p>
          We use Appwrite to provide account, database, file-storage, and
          notification services. These services process information only as
          needed to operate the Yousuf Rice service.
        </p>
      </>
    ),
  },
  {
    title: "Sharing and retention",
    body: (
      <p>
        We share order and delivery information with the people who need it to
        prepare, support, and deliver your order. We do not sell your personal
        information. We retain information for as long as needed to provide
        the service, support customers, meet legal obligations, and resolve
        disputes.
      </p>
    ),
  },
  {
    title: "Your choices",
    body: (
      <ul>
        <li>You can choose not to grant location access and enter an address manually.</li>
        <li>You can disable notifications in your device settings.</li>
        <li>You can contact us to request help with your account information.</li>
      </ul>
    ),
  },
  {
    title: "Contact us",
    body: (
      <p>
        For privacy questions or requests, email{" "}
        <a
          href="mailto:support@yousufrice.com"
          className="font-semibold text-[#27247b] underline decoration-[#ffff03] decoration-2 underline-offset-4"
        >
          support@yousufrice.com
        </a>{" "}
        or call <a href="tel:+923332339557">+92 333 2339557</a>.
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
            We explain what information we use to deliver your rice orders and
            how you control it.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border-2 border-[#ffff03]/60 bg-[#ffff03]/10 p-5 text-sm text-gray-700">
          <strong className="text-[#27247b]">Last updated:</strong> July 10,
          2026
        </div>

        <div className="space-y-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-10">
          <p className="text-lg leading-relaxed text-gray-700">
            This Privacy Policy describes how Yousuf Rice, a brand of SS
            International, handles information when you use our website or
            iOS and Android applications.
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
