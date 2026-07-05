import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | Social Planner RS',
  description: 'Data deletion instructions for Social Planner RS, operated by Rahiel Studios.',
};

const sections = [
  {
    title: 'How to Request Data Deletion',
    body: (
      <>
        To request deletion of your data, email{' '}
        <a className="underline" href="mailto:info@rahielstudios.ch">info@rahielstudios.ch</a>{' '}
        with the subject line “Data Deletion Request”.
      </>
    ),
  },
  {
    title: 'Account Identification',
    body: 'Please include the connected platform, such as Facebook, Instagram, TikTok, or another supported service, and the account, page, or profile information needed to identify the connected account in Social Planner RS.',
  },
  {
    title: 'What We Delete',
    body: 'After receiving a valid deletion request, we will delete data associated with the connected account, including stored account identifiers, profile or page metadata, access tokens, refresh tokens, uploaded media, captions, scheduled posts, publishing status, insights, and related metadata where applicable.',
  },
  {
    title: 'Platform Access Revocation',
    body: 'You can also revoke Social Planner RS access directly from the connected platform. For TikTok, revoke access from your TikTok account app permissions/settings where available. For Facebook and Instagram, go to your Facebook settings, open Apps and Websites, find the app, and remove it.',
  },
  {
    title: 'Processing Time',
    body: 'We will process deletion requests as soon as reasonably possible. We may keep limited records if required for legal, security, fraud-prevention, or operational reasons.',
  },
  {
    title: 'Confirmation',
    body: 'After processing the request, we will reply with confirmation or provide the current status of the request.',
  },
];

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Data Deletion Instructions</h1>
          <p className="text-lg leading-8 text-slate-700">
            How users can disconnect accounts or request deletion of stored Social Planner RS data.
          </p>
          <p className="text-base leading-7 text-slate-600">Last updated: 2026-05-01</p>
        </header>

        <article className="flex flex-col gap-8">
          <p className="leading-7 text-slate-700">
            Social Planner RS is a social media planning and publishing tool operated by Rahiel Studios.
            Users can request deletion of personal data associated with connected social media accounts by following
            the instructions on this page.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="leading-7 text-slate-700">{section.body}</p>
            </section>
          ))}

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="leading-7 text-slate-700">
              For data deletion requests or questions, contact:{' '}
              <a className="underline" href="mailto:info@rahielstudios.ch">info@rahielstudios.ch</a>
            </p>
            <p className="leading-7 text-slate-700">
              Operator: Rahiel Studios<br />
              Neuweilerstrasse 19<br />
              4054 Basel<br />
              Switzerland
            </p>
          </section>
        </article>

        <footer className="flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
          <Link href="/deletion" className="underline">Data Deletion Instructions</Link>
        </footer>
      </div>
    </main>
  );
}
