import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, Disclaimer, Field, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, errMsg, setAccessToken } from '../services/api';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  async function changePw(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return toast.error('New password needs 8+ characters with a letter and a number.');
    setBusy(true);
    try { const { data } = await api.post('/auth/change-password', { currentPassword: cur, newPassword: next }); setAccessToken(data.accessToken); setCur(''); setNext(''); toast.success(data.message); }
    catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  }
  async function signOutAll() {
    try { await api.post('/auth/logout-all'); setAccessToken(null); setUser(null); nav('/login'); }
    catch (er) { toast.error(errMsg(er)); }
  }
  async function deleteAccount() {
    setDelBusy(true);
    try { await api.delete('/profile', { data: { password: delPw } }); setAccessToken(null); setUser(null); nav('/'); }
    catch (er) { toast.error(errMsg(er)); } finally { setDelBusy(false); }
  }
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" subtitle={user?.email} />
      <form onSubmit={changePw} className="card space-y-4">
        <h2 className="h-card">Change password</h2>
        <Field label="Current password">{(id) => <input id={id} type="password" autoComplete="current-password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
        <Field label="New password" hint="At least 8 characters, with a letter and a number.">{(id) => <input id={id} type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
        <button className="btn-primary" disabled={busy || !cur || !next}>{busy && <Spinner />} Update password</button>
      </form>
      <div className="card space-y-3">
        <h2 className="h-card">Sessions</h2>
        <p className="text-sm text-zinc-400">Sign out of HerGuide on every device where you're logged in.</p>
        <button className="btn-ghost" onClick={signOutAll}>Sign out everywhere</button>
      </div>
      <div className="card space-y-3">
        <h2 className="h-card">Your data</h2>
        <p className="text-sm text-zinc-400">Uploaded documents are not stored; only the analysis you request is kept, and you can delete each one from the Document Assistant. AI assistant chats are not stored.</p>
        <button className="btn-danger" onClick={() => setDel(true)}>Delete my account and data</button>
      </div>
      <Disclaimer />
      <ConfirmDialog open={del} danger title="Delete your account?" confirmLabel="Delete permanently" busy={delBusy}
        message="This permanently deletes your profile, saved items, tracker entries, career plans and document analyses. This cannot be undone."
        onCancel={() => { setDel(false); setDelPw(''); }} onConfirm={deleteAccount}>
        <div className="mt-4"><Field label="Confirm with your password">{(id) => <input id={id} type="password" className="input" value={delPw} onChange={(e) => setDelPw(e.target.value)} />}</Field></div>
      </ConfirmDialog>
    </div>
  );
}
