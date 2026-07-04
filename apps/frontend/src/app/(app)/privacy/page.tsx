import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Rahiel Studios Social Media Planner',
  description: 'Privacy Policy for the Rahiel Studios social media planning tool.',
};

const sections = [
  ['What this tool is', 'Rahiel Studios Social Media Planner is a self-hosted planning and scheduling workspace operated for Rahiel Studios and its clients.'],
  ['Data we process', 'We may process account details, workspace members, connected social channel metadata, scheduled posts, uploaded media, analytics returned by connected platforms, support messages, billing metadata when billing is enabled, and technical logs required to secure and operate the service.'],
  ['Why we process it', 'We process this data to provide scheduling, collaboration, publishing, analytics, media management, authentication, security, troubleshooting, and client support.'],
  ['Connected platforms', 'When you connect a third-party platform, that platform may share access tokens, account metadata, page/channel identifiers, publishing permissions, analytics, and related API data with the application. You can revoke access through the platform or inside the planner where supported.'],
  ['Storage and security', 'Data is stored in the infrastructure configured for this deployment. Access is restricted to authorized users and operators. No security system is magic; anyone saying otherwise is selling fairy dust.'],
  ['Retention', 'We keep operational data while the workspace or client relationship is active, unless deletion is required earlier by law, contract, or a verified user request.'],
  ['Your rights', 'Depending on your jurisdiction, you may request access, correction, deletion, restriction, export, or objection to processing of your personal data.'],
  ['Contact', 'For privacy requests, contact Rahiel Studios through the official Rahiel Studios contact channel or your project owner.'],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">Rahiel Studios</p>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-base leading-7 text-slate-600">Last updated: 04 July 2026</p>
        </header>
        <div className="flex flex-col gap-8">
          {sections.map(([title, body]) => (
            <section key={title} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="leading-7 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
