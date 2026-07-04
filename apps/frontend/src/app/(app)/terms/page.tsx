import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | Rahiel Studios Social Media Planner',
  description: 'Terms of Use for the Rahiel Studios social media planning tool.',
};

const sections = [
  ['Scope', 'These terms apply to use of Rahiel Studios Social Media Planner, a branded fork of the open-source Postiz application, operated for internal Rahiel Studios workflows and client social media planning.'],
  ['Acceptable use', 'Use the planner only for lawful content, authorized accounts, and legitimate publishing workflows. Do not abuse platform APIs, bypass security, upload malicious files, or connect accounts you are not allowed to manage. Basic adult supervision, in legal-page form.'],
  ['User responsibility', 'You are responsible for content you create, approve, schedule, publish, or upload, including claims, copyright, platform compliance, and client approvals.'],
  ['Third-party platforms', 'Publishing depends on third-party social networks and APIs. Their terms, rate limits, reviews, outages, and permission changes may affect functionality. Rahiel Studios does not control those platforms.'],
  ['Availability', 'The planner is provided on a reasonable-efforts basis. Maintenance, upstream updates, API changes, hosting issues, and security work may interrupt access.'],
  ['Branding and open source', 'This deployment is branded for Rahiel Studios. The underlying project is based on Postiz and remains subject to its open-source license and notices where applicable.'],
  ['Liability', 'To the maximum extent permitted by law, Rahiel Studios is not liable for indirect damages, lost profits, platform account actions, failed posts, deleted content, or third-party API failures.'],
  ['Contact', 'Questions about these terms should go through the official Rahiel Studios contact channel or your project owner.'],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">Rahiel Studios</p>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Use</h1>
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
