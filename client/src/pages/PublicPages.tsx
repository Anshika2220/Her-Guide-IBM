import { LifeBuoy, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Disclaimer, EmptyState, ErrorState, ExtLink, Skeleton } from '../components/ui';
import { useApi } from '../hooks/useApi';
import type { SupportResource } from '../types';
import { CONTACT_EMAIL, DISCLAIMER, SUPPORT_CATEGORIES } from '../utils/constants';
import { telHref } from '../utils/format';

const Wrap = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><h1 className="h-page mb-6">{title}</h1><div className="space-y-4 text-zinc-400">{children}</div></div>
);

export const About = () => (
  <Wrap title="About HerGuide">
    <p>HerGuide is an AI-powered platform that helps women navigate support resources, career pathways, opportunities and entrepreneurship resources through personalised guidance in one place.</p>
    <p>It is built around <strong className="text-zinc-200">SDG 5: Gender Equality</strong>, with supporting links to SDG 4 (Quality Education), SDG 8 (Decent Work) and SDG 10 (Reduced Inequalities).</p>
    <p>Our principle: AI helps you understand and organise, while factual details such as helplines, programmes and deadlines come from curated database records that can be checked and updated.</p>
    <Disclaimer />
    <Link to="/register" className="btn-primary mt-2">Get started</Link>
  </Wrap>
);

export const HowItWorks = () => (
  <Wrap title="How it works">
    {[['1. Create your profile', 'Tell us about your education, skills, goals and location. You control what you share.'],
      ['2. Tell us what you need', 'Describe a situation, a career goal, a business idea or upload a document.'],
      ['3. Get personalised guidance', 'Receive structured guidance, matched opportunities and a learning roadmap, with the reasoning shown.'],
      ['4. Take the next step', 'Save what matters, track applications and come back to your dashboard anytime.']].map(([t, d]) => (
      <div key={t} className="card"><h2 className="h-card">{t}</h2><p className="mt-1 text-sm">{d}</p></div>
    ))}
  </Wrap>
);

export function ResourceCard({ r }: { r: SupportResource }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        {r.categories.filter((c) => c !== 'emergency').slice(0, 3).map((c) => <span key={c} className="badge">{SUPPORT_CATEGORIES[c] ?? c}</span>)}
        {r.categories.includes('emergency') && <span className="badge border-rose-400/30 bg-rose-400/10 text-rose-200">Urgent help</span>}
        {!r.verified && <span className="badge border-amber-400/20 text-amber-200" title="Details not yet verified by HerGuide. Please confirm on the official source.">Verify details</span>}
      </div>
      <h3 className="h-card mt-3">{r.name}</h3>
      <p className="mt-1 text-sm text-zinc-400">{r.description}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2"><dt className="meta w-20">Location</dt><dd>{r.location}</dd></div>
        {r.availability && <div className="flex gap-2"><dt className="meta w-20">Available</dt><dd>{r.availability}</dd></div>}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {r.phone && <a href={telHref(r.phone)} className="btn-primary btn-sm"><Phone className="h-3.5 w-3.5" /> {r.phone}</a>}
        <ExtLink href={r.website ?? r.sourceUrl} className="btn-ghost btn-sm">Website</ExtLink>
      </div>
    </div>
  );
}

export function ResourcesPreview() {
  const { data, loading, error, reload } = useApi<{ items: SupportResource[] }>('/public/resources');
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="h-page">Support resources</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">A preview of support organisations and official portals. Sign in for guidance tailored to your situation.</p>
      <Disclaimer className="my-6" />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>}
      {data && data.items.length === 0 && <EmptyState icon={LifeBuoy} title="No resources yet" text="Resources will appear here once they've been added." />}
      <div className="grid gap-4 md:grid-cols-2">{data?.items.map((r) => <ResourceCard key={r.id} r={r} />)}</div>
    </div>
  );
}

const LEGAL: Record<string, { title: string; body: string[] }> = {
  privacy: { title: 'Privacy', body: [
    'DRAFT: have this reviewed by a qualified professional before launch.',
    'HerGuide stores the profile information you provide, your saved items, tracker entries and the results of analyses you request.',
    'Uploaded documents are processed in memory. Only the extracted analysis is kept (you can delete it at any time); the original file and its full text are not stored.',
    'Descriptions you submit to the support tool and messages to the assistant are sent to an AI provider to generate a response. The assistant conversation is not stored by HerGuide.',
    'You can delete your account and all associated data from Settings.'] },
  terms: { title: 'Terms of use', body: [
    'DRAFT: have this reviewed by a qualified professional before launch.',
    'HerGuide provides general information only. Opportunity and resource details may change; always confirm on the official source before acting or applying.',
    'Match scores are estimates from the information in your profile and are not a guarantee of eligibility.'] },
  disclaimer: { title: 'Disclaimer', body: [DISCLAIMER, 'If you are in immediate danger, contact local emergency services (in India: 112). Women Helpline (India): 181.', 'AI-generated content can contain mistakes. Do not rely on it for legal, medical or financial decisions.'] },
  contact: { title: 'Contact', body: [CONTACT_EMAIL ? `Email: ${CONTACT_EMAIL}` : 'A contact address has not been configured yet. (Set VITE_CONTACT_EMAIL for the client build.)'] },
};
export function LegalPage({ kind }: { kind: string }) {
  const p = LEGAL[kind];
  return <Wrap title={p.title}>{p.body.map((t, i) => <p key={i}>{t}</p>)}</Wrap>;
}
