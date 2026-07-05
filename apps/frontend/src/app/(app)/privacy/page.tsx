import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Social Planner RS',
  description: 'Privacy Policy for Social Planner RS, operated by Rahiel Studios.',
};

const sections = [
  {
    title: 'Information We Collect',
    body: 'When a user connects a social media account, we may collect and process account identifiers, profile information, page or channel information, access tokens, refresh tokens, uploaded media, captions, scheduled posts, privacy settings, publishing status, comments, insights, and related metadata.',
  },
  {
    title: 'How We Use Information',
    body: 'We use this information only to provide the social media planning service. This includes connecting social media accounts, displaying connected accounts, scheduling content, publishing posts, checking publishing status, and showing related account or post information inside the application.',
  },
  {
    title: 'Connected Platforms',
    body: 'Social Planner RS may connect to third-party platforms including TikTok, Facebook, Instagram, and other supported social media services through their official APIs. For TikTok, the app uses approved scopes only to identify the connected account, show account context, list relevant videos where available, upload user-selected media, and publish content after user action.',
  },
  {
    title: 'TikTok Direct Post Privacy Controls',
    body: 'When publishing through TikTok Direct Post, the app respects TikTok API requirements and available privacy levels. Before TikTok audit approval, TikTok may restrict Direct Post submissions to SELF_ONLY/private visibility and other platform limits. We do not override TikTok platform restrictions.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell user data. We only share data with connected social media platforms when necessary to provide features requested by the user, such as publishing a scheduled post or retrieving account information.',
  },
  {
    title: 'Data Storage',
    body: 'Connected-account information, tokens, uploaded media, and scheduled content may be stored securely for as long as needed to operate the service. Access is limited to authorized users and administrators.',
  },
  {
    title: 'Data Deletion',
    body: 'Users may disconnect their social media accounts inside the application or revoke access directly from the connected platform, such as TikTok, Facebook, or Instagram.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-lg leading-8 text-slate-700">
            How Social Planner RS handles connected-account information and related data.
          </p>
          <p className="text-base leading-7 text-slate-600">Last updated: 2026-04-30</p>
        </header>

        <article className="flex flex-col gap-8">
          <p className="leading-7 text-slate-700">
            Social Planner RS is a social media planning and publishing tool operated by Rahiel Studios.
            This Privacy Policy explains how we collect, use, store, and delete information when users connect
            social media accounts to the application.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="leading-7 text-slate-700">{section.body}</p>
            </section>
          ))}

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Deletion Requests</h2>
            <p className="leading-7 text-slate-700">
              To request deletion of stored data, contact us at{' '}
              <a className="underline" href="mailto:info@rahielstudios.ch">info@rahielstudios.ch</a>. We will delete the data
              associated with the connected account unless we are required to keep certain information for legal,
              security, or operational reasons.
            </p>
            <p className="leading-7 text-slate-700">
              Detailed data deletion instructions are available at{' '}
              <Link className="underline" href="/deletion">Data Deletion Instructions</Link>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="leading-7 text-slate-700">
              For privacy questions or deletion requests, contact:{' '}
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
