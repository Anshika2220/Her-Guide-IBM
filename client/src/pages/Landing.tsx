import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Compass, FileText, LifeBuoy, Rocket, Search, Sparkles, Target, UserPlus, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const areas = [
  { icon: LifeBuoy, title: 'Support & Rights', text: 'Describe what happened and get calm, structured next steps plus verified support organisations.' },
  { icon: Briefcase, title: 'Career & Skills', text: 'Skill-gap analysis, learning roadmaps and a dedicated return-to-work path.' },
  { icon: Compass, title: 'Opportunities', text: 'Scholarships, internships, jobs and programmes ranked by transparent matching.' },
  { icon: Rocket, title: 'Entrepreneurship', text: 'A startup checklist and relevant funding, training and mentorship resources.' },
];
const steps = [
  { icon: UserPlus, t: 'Create your profile' }, { icon: Search, t: 'Tell us what you need' },
  { icon: Wand2, t: 'Get personalised guidance' }, { icon: Target, t: 'Take the next step' },
];
const ai = [
  ['Situation understanding', 'Identifies a possible category and gives informational guidance, never legal conclusions.'],
  ['Opportunity matching', 'Rule-based scores you can inspect: education, skills, location, experience and goals.'],
  ['Skill-gap analysis', 'Compares your skills to your target role and builds a week-by-week roadmap.'],
  ['Document summarisation', 'Pulls eligibility, deadlines and steps from a notice, and says when something is not specified.'],
];

export default function Landing() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 md:pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="badge mb-6 border-violet-400/30 bg-violet-400/10 text-violet-200"><Sparkles className="h-3 w-3" /> Built for SDG 5: Gender Equality</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
            Guidance. Opportunities. <span className="gradient-text">Support.</span> One place.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
            HerGuide helps women navigate support resources, career opportunities, skills, and pathways toward greater independence.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3">Get Started <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/resources" className="btn-ghost px-6 py-3">Explore Resources</Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <motion.div {...fade} className="card mx-auto max-w-3xl text-center md:p-10">
          <p className="meta uppercase tracking-widest">The problem</p>
          <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Help exists. It's just scattered.</h2>
          <p className="mt-4 text-zinc-400">Support organisations, scholarships, return-to-work programmes and funding schemes live on dozens of different websites. When you're dealing with a hard situation or planning a next step, finding the right one shouldn't be another barrier.</p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <motion.div {...fade} className="mb-8 text-center"><p className="meta uppercase tracking-widest">The solution</p><h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Four areas, one connected platform</h2></motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a, i) => (
            <motion.div key={a.title} {...fade} transition={{ duration: 0.5, delay: i * 0.07 }} className="card card-hover">
              <div className="mb-4 inline-flex rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><a.icon className="h-5 w-5" /></div>
              <h3 className="h-card">{a.title}</h3><p className="mt-2 text-sm text-zinc-400">{a.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <motion.h2 {...fade} className="mb-10 text-center text-2xl font-semibold text-white md:text-3xl">How it works</motion.h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.li key={s.t} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="card relative text-center">
              <span className="absolute left-4 top-4 text-xs text-zinc-600">0{i + 1}</span>
              <div className="mx-auto mb-3 inline-flex rounded-full bg-gradient-to-br from-violet-500/30 to-pink-400/20 p-3 text-violet-200"><s.icon className="h-5 w-5" /></div>
              <p className="font-medium text-white">{s.t}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="card md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="meta uppercase tracking-widest">AI, with guardrails</p>
              <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Assistance, not authority</h2>
              <p className="mt-3 text-sm text-zinc-400">AI explains and organises. Phone numbers, organisations and programmes come only from our database, never from the model.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {ai.map(([t, d]) => <div key={t}><p className="flex items-center gap-2 font-medium text-white"><FileText className="h-4 w-4 text-violet-300" />{t}</p><p className="mt-1 text-sm text-zinc-400">{d}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 text-center sm:px-6">
        <h2 className="text-2xl font-semibold text-white md:text-4xl">Ready for your next step?</h2>
        <Link to="/register" className="btn-primary mt-6 px-6 py-3">Create your free profile <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
