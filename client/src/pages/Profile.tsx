import ProfileForm from '../components/ProfileForm';
import { PageHeader, ProgressBar } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const { data, reload } = useApi<{ completeness: number }>('/profile');
  return (
    <div>
      <PageHeader title="Profile" subtitle="The more you share, the better your matches. Missing information is never assumed." />
      <div className="card mb-5">
        <div className="mb-2 flex justify-between text-sm"><span className="text-zinc-300">Profile completeness</span><span className="text-white">{data?.completeness ?? 0}%</span></div>
        <ProgressBar value={data?.completeness ?? 0} label="Profile completeness" />
        <p className="meta mt-2">{user?.email}</p>
      </div>
      <ProfileForm key={user?.id} mode="page" onDone={reload} />
    </div>
  );
}
