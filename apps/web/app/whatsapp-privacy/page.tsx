import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  LockKeyhole,
  MessageCircle,
  Mic,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "WhatsApp Assistant Privacy Policy",
  description:
    "How Yousuf Rice processes text, voice, and account information when customers use our WhatsApp assistant.",
  alternates: {
    canonical: "/whatsapp-privacy",
  },
};

const policySections = [
  {
    title: "Information we process",
    content: (
      <>
        <p>
          When you contact Yousuf Rice on WhatsApp, we may process your WhatsApp
          phone number, profile name, message content, voice notes, attachments,
          timestamps, and message delivery information.
        </p>
        <p>
          If you discuss an order, we may also process the details you choose to
          share, such as your name, delivery address, requested products, and
          customer-support history.
        </p>
      </>
    ),
  },
  {
    title: "How we use it",
    content: (
      <ul>
        <li>Answer questions about Yousuf Rice products and services.</li>
        <li>Help with orders, delivery questions, and customer support.</li>
        <li>Transcribe voice notes so the assistant can understand and reply.</li>
        <li>Protect the service from fraud, abuse, and technical failures.</li>
        <li>Maintain and improve the reliability of our customer support.</li>
      </ul>
    ),
  },
  {
    title: "Automated and AI-assisted replies",
    content: (
      <>
        <p>
          Our WhatsApp assistant uses automated software and artificial
          intelligence to prepare replies. Text, voice notes, and relevant chat
          context may be processed by our service providers only as needed to
          understand your request and produce a response.
        </p>
        <p>
          Automated replies can make mistakes. Please confirm prices, stock,
          delivery commitments, and other important information with our team
          before relying on them.
        </p>
      </>
    ),
  },
  {
    title: "Service providers and sharing",
    content: (
      <>
        <p>We use trusted providers to operate the assistant, including:</p>
        <ul>
          <li>
            <strong>Meta and WhatsApp</strong> to transmit messages and operate
            the WhatsApp Business Platform.
          </li>
          <li>
            <strong>OpenAI</strong> to process prompts and generate AI-assisted
            responses.
          </li>
          <li>
            <strong>Our hosting infrastructure</strong> to run the assistant and
            securely process requests.
          </li>
        </ul>
        <p>
          We may also share information when required by law or when necessary
          to protect our customers, business, or systems. We do not sell your
          personal information.
        </p>
      </>
    ),
  },
  {
    title: "Retention and security",
    content: (
      <>
        <p>
          We keep WhatsApp conversation and support information only for as long
          as reasonably necessary to provide support, maintain security, resolve
          disputes, and meet legal or recordkeeping obligations.
        </p>
        <p>
          We use encrypted connections, restricted administrative access, and
          other reasonable safeguards. No online service can guarantee absolute
          security, so please do not send passwords, payment-card numbers, or
          other highly sensitive information through WhatsApp.
        </p>
      </>
    ),
  },
  {
    title: "Your choices and rights",
    content: (
      <>
        <p>
          You can stop using the assistant at any time. You may also ask us to
          access, correct, or delete information associated with your WhatsApp
          conversation, subject to legal and operational requirements.
        </p>
        <p>
          To make a request, contact us using the details below and include the
          WhatsApp number connected to your request so we can identify the
          relevant records.
        </p>
      </>
    ),
  },
  {
    title: "Children and policy updates",
    content: (
      <>
        <p>
          The assistant is intended for a general audience and is not directed
          to children. We do not knowingly use it to collect personal
          information from children.
        </p>
        <p>
          We may update this policy as our services or legal obligations change.
          The effective date shown on this page identifies the latest version.
        </p>
      </>
    ),
  },
];

export default function WhatsAppPrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#17172c]">
      <header className="relative overflow-hidden bg-[#27247b] text-white">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-32 h-96 w-96 rounded-full border-[64px] border-[#ffff03]/10"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffff03]/40 bg-[#ffff03]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ffff03]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Customer data &amp; WhatsApp
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              WhatsApp Assistant
              <span className="block text-[#ffff03]">Privacy Policy</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              A plain-language explanation of how messages and voice notes move
              through the Yousuf Rice assistant, and the choices you have.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section
          aria-label="How a WhatsApp message is processed"
          className="-mt-16 mb-12 grid overflow-hidden rounded-3xl border border-white/70 bg-white shadow-xl shadow-[#27247b]/10 sm:grid-cols-4"
        >
          {[
            { icon: MessageCircle, label: "You send", detail: "Text or media" },
            { icon: Mic, label: "WhatsApp carries", detail: "Encrypted delivery" },
            { icon: Bot, label: "Assistant processes", detail: "Only what is needed" },
            { icon: LockKeyhole, label: "We reply", detail: "Through WhatsApp" },
          ].map(({ icon: Icon, label, detail }, index) => (
            <div
              key={label}
              className="relative border-b border-[#27247b]/10 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#27247b] text-[#ffff03]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-black tracking-[0.18em] text-[#27247b]/35">
                  0{index + 1}
                </span>
              </div>
              <h2 className="font-bold text-[#27247b]">{label}</h2>
              <p className="mt-1 text-sm text-gray-500">{detail}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="rounded-3xl border border-[#27247b]/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-10 border-b border-[#27247b]/10 pb-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#27247b]">
                Effective August 5, 2026
              </p>
              <p className="mt-4 text-lg leading-8 text-gray-700">
                This policy explains how Yousuf Rice, a brand of SS
                International in Pakistan, handles information when you message
                our official WhatsApp number or interact with our automated
                assistant.
              </p>
            </div>

            <div className="space-y-10">
              {policySections.map((section, index) => (
                <section key={section.title}>
                  <div className="mb-4 flex items-start gap-4">
                    <span className="mt-1 text-xs font-black tracking-[0.16em] text-[#27247b]/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-[#27247b]">
                      {section.title}
                    </h2>
                  </div>
                  <div className="ml-0 space-y-4 leading-7 text-gray-700 sm:ml-10 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-[#27247b] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffff03]">
                Contact Yousuf Rice
              </p>
              <h2 className="mt-3 text-2xl font-black">Privacy questions?</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Contact our support team and tell us which WhatsApp number your
                request concerns.
              </p>
              <a
                href="mailto:support@yousufrice.com"
                className="mt-5 block break-all font-bold text-[#ffff03] underline decoration-[#ffff03]/40 underline-offset-4"
              >
                support@yousufrice.com
              </a>
              <a
                href="https://wa.me/923123285764"
                className="mt-3 block font-bold text-white underline decoration-white/30 underline-offset-4"
              >
                +92 312 3285764
              </a>
            </div>

            <div className="rounded-3xl border border-[#27247b]/10 bg-white p-6">
              <p className="text-sm leading-6 text-gray-600">
                This page covers the WhatsApp assistant. For website, mobile
                app, ordering, advertising, and location practices, read our
                complete privacy policy.
              </p>
              <Link
                href="/privacy"
                className="mt-4 inline-flex font-bold text-[#27247b] underline decoration-[#ffff03] decoration-2 underline-offset-4"
              >
                View the full privacy policy
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
