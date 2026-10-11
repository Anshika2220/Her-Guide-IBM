import { FormEvent, ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, errMsg } from '../services/api';

const emailOk = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const pwError = (v: string) => v.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(v) ? 'Include a letter.' : !/[0-9]/.test(v) ? 'Include a number.' : '';

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="card w-full p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
      </div>
    </div>
  );
}
const Err = ({ msg }: { msg: string }) => msg ? <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{msg}</p> : null;

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard';
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!emailOk(f.email)) v.email = 'Please enter a valid email.';
    if (!f.password) v.password = 'Please enter your password.';
    setErrs(v); setServer('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try { await login(f.email.trim(), f.password); nav(from, { replace: true }); }
    catch (er) { setServer(errMsg(er, "We couldn't sign you in. Please try again.")); }
    finally { setBusy(false); }
  }
  return (
    <Shell title="Welcome back" subtitle="Sign in to continue to HerGuide." footer={<>New here? <Link className="text-violet-300 hover:underline" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Err msg={server} />
        <Field label="Email" error={errs.email}>{(id) => <input id={id} type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Password" error={errs.password}>{(id) => <input id={id} type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
        <div className="text-right text-sm"><Link to="/forgot-password" className="text-zinc-400 hover:text-white">Forgot password?</Link></div>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Sign in</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!f.name.trim()) v.name = 'Please enter your name.';
    if (!emailOk(f.email)) v.email = 'Please enter a valid email.';
    const p = pwError(f.password); if (p) v.password = p;
    setErrs(v); setServer('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try { await register(f.name.trim(), f.email.trim(), f.password); nav('/onboarding', { replace: true }); }
    catch (er) { setServer(errMsg(er, "We couldn't create your account. Please try again.")); }
    finally { setBusy(false); }
  }
  return (
    <Shell title="Create your account" subtitle="It takes a minute. You choose what to share." footer={<>Already have an account? <Link className="text-violet-300 hover:underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Err msg={server} />
        <Field label="Name" error={errs.name}>{(id) => <input id={id} autoComplete="name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Email" error={errs.email}>{(id) => <input id={id} type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number." error={errs.password}>{(id) => <input id={id} type="password" autoComplete="new-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Create account</button>
        <p className="meta text-center">By continuing you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link> notice.</p>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (!emailOk(email)) return setErr('Please enter a valid email.');
    setBusy(true);
    try { const { data } = await api.post('/auth/forgot-password', { email: email.trim() }); setDone(data.message); }
    catch (er) { setErr(errMsg(er)); } finally { setBusy(false); }
  }
  return (
    <Shell title="Reset your password" subtitle="We'll email you a link if an account exists." footer={<Link className="text-violet-300 hover:underline" to="/login">Back to sign in</Link>}>
      {done ? <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{done}</p> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Err msg={err} />
          <Field label="Email">{(id) => <input id={id} type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Send reset link</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const p = pwError(pw); if (p) return setErr(p);
    setBusy(true); setErr('');
    try { await api.post('/auth/reset-password', { token, password: pw }); setDone(true); setTimeout(() => nav('/login'), 1800); }
    catch (er) { setErr(errMsg(er)); } finally { setBusy(false); }
  }
  return (
    <Shell title="Choose a new password" subtitle="You'll be signed out of other devices." footer={<Link className="text-violet-300 hover:underline" to="/login">Back to sign in</Link>}>
      {!token ? <Err msg="This reset link is missing its token. Please request a new one." /> : done ? (
        <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">Password updated. Redirecting to sign in…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Err msg={err} />
          <Field label="New password" hint="At least 8 characters, with a letter and a number.">{(id) => <input id={id} type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Update password</button>
        </form>
      )}
    </Shell>
  );
}
