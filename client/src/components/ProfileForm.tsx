import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, errMsg } from '../services/api';
import { EDUCATION, EMPLOYMENT, GOALS, INTERESTS } from '../utils/constants';
import { ChipSelect, Field, Spinner, TagInput } from './ui';

const STEPS = ['Basics', 'Career', 'Interests & goals'];

export default function ProfileForm({ mode, onDone }: { mode: 'steps' | 'page'; onDone?: () => void }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const cp = user?.careerProfile ?? {};
  const [f, setF] = useState({
    name: user?.name ?? '', age: user?.age?.toString() ?? '', location: user?.location ?? '', education: user?.education ?? '',
    employmentStatus: user?.employmentStatus ?? '', currentRole: cp.currentRole ?? '', previousRole: cp.previousRole ?? '',
    yearsOfExperience: cp.yearsOfExperience?.toString() ?? '', careerBreakMonths: cp.careerBreakMonths?.toString() ?? '',
    desiredCareer: cp.desiredCareer ?? '', skills: user?.skills ?? [], interests: user?.interests ?? [], goals: user?.goals ?? [],
  });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  function validate(scope: number | 'all') {
    const e: Record<string, string> = {};
    const on = (s: number) => scope === 'all' || scope === s;
    if (on(0)) {
      if (!f.name.trim()) e.name = 'Please enter your name.';
      if (f.age && (+f.age < 13 || +f.age > 100)) e.age = 'Enter an age between 13 and 100.';
      if (!f.education) e.education = 'Please choose your education level.';
      if (!f.employmentStatus) e.employmentStatus = 'Please choose your current status.';
      if (!f.location.trim()) e.location = 'Please enter your city or state.';
    }
    if (on(1)) {
      if (f.yearsOfExperience && (+f.yearsOfExperience < 0 || +f.yearsOfExperience > 60)) e.yearsOfExperience = 'Enter a value between 0 and 60.';
    }
    if (on(2) && f.goals.length === 0) e.goals = 'Choose at least one goal so we can personalise your dashboard.';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate('all')) { if (mode === 'steps') setStep(0); return; }
    setBusy(true);
    try {
      const { data } = await api.put('/profile', {
        name: f.name, age: f.age, location: f.location, education: f.education, employmentStatus: f.employmentStatus,
        skills: f.skills, interests: f.interests, goals: f.goals,
        careerProfile: { currentRole: f.currentRole, previousRole: f.previousRole, yearsOfExperience: f.yearsOfExperience, careerBreakMonths: f.careerBreakMonths, desiredCareer: f.desiredCareer },
      });
      setUser(data.user);
      toast.success('Profile saved.');
      onDone?.();
    } catch (e) { toast.error(errMsg(e, "We couldn't save your profile. Please try again.")); }
    finally { setBusy(false); }
  }

  const showBasics = mode === 'page' || step === 0, showCareer = mode === 'page' || step === 1, showGoals = mode === 'page' || step === 2;
  const card = 'card space-y-4';
  return (
    <div className="space-y-5">
      {mode === 'steps' && (
        <ol className="flex gap-2" aria-label="Progress">
          {STEPS.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-violet-400' : 'bg-white/10'}`} aria-current={i === step} title={s} />)}
        </ol>
      )}
      {showBasics && (
        <section className={card}><h2 className="h-card">Basic information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errs.name}>{(id) => <input id={id} className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />}</Field>
            <Field label="Age (optional)" error={errs.age}>{(id) => <input id={id} type="number" className="input" value={f.age} onChange={(e) => set('age', e.target.value)} />}</Field>
            <Field label="Location" hint="City or state, e.g. Lucknow, Uttar Pradesh" error={errs.location}>{(id) => <input id={id} className="input" value={f.location} onChange={(e) => set('location', e.target.value)} />}</Field>
            <Field label="Education" error={errs.education}>{(id) => <select id={id} className="input" value={f.education} onChange={(e) => set('education', e.target.value)}><option value="">Select…</option>{EDUCATION.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
            <Field label="Employment status" error={errs.employmentStatus}>{(id) => <select id={id} className="input" value={f.employmentStatus} onChange={(e) => set('employmentStatus', e.target.value)}><option value="">Select…</option>{EMPLOYMENT.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          </div>
        </section>
      )}
      {showCareer && (
        <section className={card}><h2 className="h-card">Career information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current role">{(id) => <input id={id} className="input" value={f.currentRole} onChange={(e) => set('currentRole', e.target.value)} />}</Field>
            <Field label="Previous role">{(id) => <input id={id} className="input" value={f.previousRole} onChange={(e) => set('previousRole', e.target.value)} />}</Field>
            <Field label="Years of experience" error={errs.yearsOfExperience}>{(id) => <input id={id} type="number" step="0.5" className="input" value={f.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} />}</Field>
            <Field label="Career break (months, if any)">{(id) => <input id={id} type="number" className="input" value={f.careerBreakMonths} onChange={(e) => set('careerBreakMonths', e.target.value)} />}</Field>
            <div className="sm:col-span-2"><Field label="Desired career / role">{(id) => <input id={id} className="input" value={f.desiredCareer} onChange={(e) => set('desiredCareer', e.target.value)} />}</Field></div>
            <div className="sm:col-span-2"><Field label="Skills" hint="Press Enter to add each skill.">{(id) => <TagInput id={id} value={f.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Python, Excel, Teaching" />}</Field></div>
          </div>
        </section>
      )}
      {showGoals && (
        <section className={card}><h2 className="h-card">Interests & goals</h2>
          <div><p className="label">Interests</p><ChipSelect label="Interests" options={INTERESTS} value={f.interests} onChange={(v) => set('interests', v)} /></div>
          <div><p className="label">What are you looking for? (choose any)</p><ChipSelect label="Goals" options={GOALS} value={f.goals} onChange={(v) => set('goals', v)} />
            {errs.goals && <p role="alert" className="mt-2 text-xs text-rose-300">{errs.goals}</p>}</div>
        </section>
      )}
      {mode === 'steps' ? (
        <div className="flex justify-between">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" /> Back</button>
          {step < 2 ? <button className="btn-primary" onClick={() => validate(step) && setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
            : <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <Save className="h-4 w-4" />} Finish</button>}
        </div>
      ) : <div className="flex justify-end"><button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <Save className="h-4 w-4" />} Save profile</button></div>}
    </div>
  );
}
