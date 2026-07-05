import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Social Planner RS',
  description: 'Terms of Service for Social Planner RS, operated by Rahiel Agency.',
};

const sections = [
  {
    title: 'Use of the Service',
    body: 'Social Planner RS allows authorized users to connect social media accounts, upload media, prepare captions, schedule posts, publish content, and view publishing status.',
  },
  {
    title: 'Authorized Users',
    body: 'The service is intended for authorized users and approved team/client workflows only. Users must not share their login access with unauthorized persons.',
  },
  {
    title: 'User Responsibility',
    body: 'Users are responsible for the content they upload, schedule, and publish through the service. Users must ensure that they have the rights and permissions needed to publish their content.',
  },
  {
    title: 'Platform Rules',
    body: 'Users must comply with the terms, policies, community guidelines, and developer rules of each connected social media platform, including TikTok, Facebook, Instagram, and any other connected service.',
  },
  {
    title: 'TikTok Direct Post Restrictions',
    body: 'Users understand that TikTok may limit Direct Post API usage before audit approval, including requiring SELF_ONLY/private visibility, limiting eligible posting users, or requiring accounts to meet TikTok platform conditions. Social Planner RS respects these TikTok API restrictions and does not guarantee that all privacy levels are available at all times.',
  },
  {
    title: 'Connected Accounts',
    body: 'Users may connect and disconnect supported social media accounts. Access to connected platforms may depend on third-party API availability, approvals, permissions, and platform rules.',
  },
  {
    title: 'Prohibited Use',
    body: 'Users must not use the service to publish unlawful, misleading, harmful, infringing, abusive, or unauthorized content. Users must not attempt to bypass platform restrictions or misuse connected APIs.',
  },
  {
    title: 'Availability',
    body: 'The service is provided as-is. We do not guarantee uninterrupted availability, error-free operation, or successful publishing in all cases.',
  },
  {
    title: 'Changes to the Service',
    body: 'We may update, limit, suspend, or discontinue parts of the service at any time, especially when required by changes to third-party platform APIs or policies.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, Rahiel Agency is not liable for indirect, incidental, or consequential damages arising from the use of the service, failed publishing, account restrictions, or third-party platform changes.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-lg leading-8 text-slate-700">Rules for authorized internal use of Social Planner RS.</p>
          <p className="text-base leading-7 text-slate-600">Last updated: 2026-04-30</p>
        </header>

        <article className="flex flex-col gap-8">
          <p className="leading-7 text-slate-700">
            These Terms of Service govern the use of Social Planner RS, a social media planning and
            publishing tool operated by Rahiel Agency.
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
              For questions about these Terms, contact:{' '}
              <a className="underline" href="mailto:info@rahielstudios.ch">info@rahielstudios.ch</a>
            </p>
            <p className="leading-7 text-slate-700">
              Operator: Rahiel Agency<br />
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
