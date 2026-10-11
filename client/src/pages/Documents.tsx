import { BookmarkPlus, FileText, Trash2, Upload } from 'lucide-react';
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BulletList, ConfirmDialog, Disclaimer, EmptyState, ErrorState, PageHeader, Section, Spinner, cx } from '../components/ui';
import { useAssistant } from '../context/AssistantContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { DocItem } from '../types';
import { fmtDate } from '../utils/format';

const MAX = 5 * 1024 * 1024;
const NA = 'Not specified in the provided document.';

function Result({ doc }: { doc: DocItem }) {
  const a = doc.analysis!;
  const List = ({ items }: { items: string[] }) => (items.length === 1 && items[0] === NA ? <p className="text-sm italic text-zinc-500">{NA}</p> : <BulletList items={items} />);
  return (
    <div className="card space-y-5">
      <div><h2 className="h-card">{doc.filename}</h2>{doc.truncated && <p className="meta mt-1">Only the first part of this long document was analysed.</p>}</div>
      <Section title="Summary"><p className="text-sm text-zinc-300">{a.summary}</p>{a.purpose !== NA && <p className="meta mt-2">Purpose: {a.purpose}</p>}</Section>
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Eligibility"><List items={a.eligibility} /></Section>
        <Section title="Required documents"><List items={a.requiredDocuments} /></Section>
        <Section title="Important dates"><List items={a.importantDates} /></Section>
        <Section title="Application steps"><List items={a.applicationSteps} /></Section>
        <Section title="Important conditions"><List items={a.importantConditions} /></Section>
        <Section title="Questions to verify"><List items={a.questionsToVerify} /></Section>
      </div>
    </div>
  );
}

export default function Documents() {
  const toast = useToast();
  const { ask } = useAssistant();
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [doc, setDoc] = useState<DocItem | null>(null);
  const [del, setDel] = useState<DocItem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useApi<{ items: DocItem[] }>('/documents');
  const openId = sp.get('open');

  useEffect(() => {
    if (!openId) return;
    api.get(`/documents/${openId}`).then(({ data }) => setDoc(data.item)).catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  async function run(p: Promise<{ data: { item: DocItem } }>) {
    setBusy(true); setErr(''); setDoc(null);
    try { const { data } = await p; setDoc(data.item); list.reload(); }
    catch (e) { setErr(errMsg(e, "We couldn't analyze the document right now. Please try again.")); }
    finally { setBusy(false); }
  }
  function upload(file?: File) {
    if (!file) return;
    if (!/\.(pdf|txt|docx)$/i.test(file.name)) return setErr('Please upload a PDF, DOCX or TXT file.');
    if (file.size > MAX) return setErr('That file is larger than 5 MB.');
    const fd = new FormData(); fd.append('file', file);
    run(api.post('/documents/upload', fd));
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { upload(e.target.files?.[0]); e.target.value = ''; };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); };

  async function save() {
    if (!doc) return;
    try { await api.post('/saved', { itemType: 'document', itemId: doc.id }); toast.success('Saved.'); } catch (e) { toast.error(errMsg(e)); }
  }
  async function remove() {
    if (!del) return;
    try { await api.delete(`/documents/${del.id}`); if (doc?.id === del.id) setDoc(null); setDel(null); list.reload(); toast.success('Analysis deleted.'); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div>
      <PageHeader title="Document Assistant" subtitle="Upload a notice, brochure or job post and get eligibility, requirements, dates and steps. Anything the document doesn't say is marked as not specified." crumbs={['Tools', 'Document Assistant']} />
      <div role="tablist" className="mb-4 inline-flex rounded-xl border border-white/10 p-1">
        {([['file', 'Upload file'], ['text', 'Paste text']] as const).map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cx('rounded-lg px-4 py-2 text-sm', tab === v ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-white')}>{l}</button>)}
      </div>
      {tab === 'file' ? (
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          className={cx('card flex flex-col items-center border-dashed py-12 text-center', drag && 'border-violet-400/60 bg-violet-400/[0.06]')}>
          <Upload className="h-7 w-7 text-violet-300" />
          <p className="mt-3 text-white">Drag a file here, or</p>
          <button className="btn-primary mt-3" onClick={() => input.current?.click()} disabled={busy}>{busy && <Spinner />} Choose a file</button>
          <input ref={input} type="file" accept=".pdf,.txt,.docx" className="sr-only" aria-label="Choose a document" onChange={onPick} />
          <p className="meta mt-3">PDF, DOCX or TXT · up to 5 MB · scanned/image-only PDFs aren't supported yet</p>
        </div>
      ) : (
        <div className="card space-y-3">
          <label htmlFor="doc-text" className="label">Paste the document text</label>
          <textarea id="doc-text" rows={8} maxLength={30000} className="input" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" disabled={busy || text.trim().length < 50} onClick={() => run(api.post('/documents/analyze', { text }))}>{busy && <Spinner />} Analyze text</button>
        </div>
      )}
      <p className="meta mt-3">Your file is read in memory and discarded. Only the extracted analysis is saved, and you can delete it any time. Don't upload documents you wouldn't want processed by an AI service.</p>

      {err && <div className="mt-4"><ErrorState message={err} /></div>}
      {busy && <p className="mt-6 flex items-center gap-2 text-sm text-zinc-400"><Spinner /> Reading your document…</p>}
      {doc?.analysis && !busy && (
        <div className="mt-6 space-y-3">
          <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={save}><BookmarkPlus className="h-4 w-4" /> Save</button><button className="btn-ghost btn-sm" onClick={() => ask({ prompt: 'What should I verify with the organiser?', context: `Document analysis: ${JSON.stringify(doc.analysis).slice(0, 2500)}` })}>Ask HerGuide</button></div>
          <Result doc={doc} />
          <Disclaimer />
        </div>
      )}

      <section className="mt-10">
        <h2 className="h-card mb-3">Previous analyses</h2>
        {list.data && list.data.items.length === 0 ? <EmptyState icon={FileText} title="No analyses yet" text="Your analysed documents will appear here." /> : (
          <ul className="space-y-2">{list.data?.items.map((d) => (
            <li key={d.id} className="card flex items-center justify-between py-3">
              <button className="text-left" onClick={() => { sp.set('open', d.id); setSp(sp); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><p className="text-sm font-medium text-white">{d.filename}</p><p className="meta">{fmtDate(d.createdAt)}</p></button>
              <button className="btn-ghost btn-sm" aria-label="Delete analysis" onClick={() => setDel(d)}><Trash2 className="h-4 w-4" /></button>
            </li>))}</ul>
        )}
      </section>
      <ConfirmDialog open={!!del} danger title="Delete this analysis?" message="The saved analysis will be permanently deleted." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
