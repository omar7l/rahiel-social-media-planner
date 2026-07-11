import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Planner RS | Social Media Planning and Publishing',
  description:
    'Planner RS is a social media planning and publishing application operated by Rahiel Agency.',
};

const features = [
  'Plan and schedule social media posts',
  'Publish content to connected social media accounts',
  'Manage media, publishing status, and team workflows',
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7433dd]">
            Rahiel Agency
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Planner RS</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700">
            Planner RS is a social media planning and publishing application for authorized teams and clients.
          </p>
          <div>
            <Link
              href="/auth/login"
              className="inline-flex rounded-md bg-[#7433dd] px-5 py-3 font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">What Planner RS does</h2>
          <ul className="flex list-disc flex-col gap-3 pl-6 leading-7 text-slate-700">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p className="leading-7 text-slate-700">
            Planner RS is operated by Rahiel Agency in Basel, Switzerland.
          </p>
          <a className="underline" href="mailto:info@rahielstudios.ch">
            info@rahielstudios.ch
          </a>
        </section>

        <footer className="flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <Link href="/about" className="underline">About Planner RS</Link>
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
          <Link href="/deletion" className="underline">Data Deletion Instructions</Link>
        </footer>
      </div>
    </main>
  );
}
