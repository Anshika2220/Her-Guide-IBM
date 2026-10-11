import { Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const nav = useNavigate();
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold text-white"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500"><Sparkles className="h-4 w-4" /></span>HerGuide</p>
        <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-white">Skip for now</Link>
      </div>
      <h1 className="h-page">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="mb-6 mt-2 text-sm text-zinc-400">A few quick questions so we can personalise your matches and recommendations. You can edit this any time.</p>
      <ProfileForm mode="steps" onDone={() => nav('/dashboard', { replace: true })} />
    </div>
  );
}
