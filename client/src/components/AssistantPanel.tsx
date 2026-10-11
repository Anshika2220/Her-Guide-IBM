import { AlertTriangle, Send, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../services/api';
import { DISCLAIMER } from '../utils/constants';
import { Spinner } from './ui';

interface Msg { role: 'user' | 'assistant'; content: string; emergency?: string }
const PROMPTS: Record<string, string[]> = {
  opportunities: ['Help me understand why this opportunity matches my profile.', 'What documents should I prepare?', 'What should I double-check before applying?'],
  work: ['What should I learn first?', 'How can I show these skills without work experience?', 'How do I explain my career break?'],
  support: ['What information should I document?', 'What should I do first?', 'How do I preserve messages safely?'],
  biz: ['What should I research before registering a business?', 'How do I test my idea cheaply?'],
  documents: ['What should I verify with the organiser?', 'Am I likely to meet these requirements?'],
  tracker: ['Which application should I prioritise?', 'Help me prepare a follow-up message.'],
  dashboard: ['What should I do next?', 'How can I improve my profile?'],
  other: ['How can HerGuide help me?'],
};

export default function AssistantPanel({ open, onClose, page, seed }: { open: boolean; onClose: () => void; page: string; seed: { prompt?: string; contextId?: string; context?: string; n: number } }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (seed.prompt) setText(seed.prompt); }, [seed.n, seed.prompt]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  async function send(message: string) {
    if (!message.trim() || busy) return;
    setErr(''); setBusy(true); setText('');
    const history = msgs.slice(-8).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: 'user', content: message }]);
    try {
      const { data } = await api.post('/ai/chat', { message, page, contextId: seed.contextId, context: seed.context, history });
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply, emergency: data.emergencyMessage }]);
    } catch (e) {
      setErr(errMsg(e, "We couldn't get an answer right now. Please try again."));
    } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-label="HerGuide assistant" className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">HerGuide assistant</h2></div>
          <button aria-label="Close assistant" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.length === 0 && (
            <div>
              <p className="text-sm text-zinc-400">Ask about what you're looking at. I use your profile and this page for context.</p>
              <div className="mt-3 flex flex-col gap-2">
                {(PROMPTS[page] ?? PROMPTS.other).map((p) => (
                  <button key={p} onClick={() => send(p)} className="rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5">{p}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-violet-500/90 text-white' : 'border border-white/10 bg-white/[0.04] text-zinc-200'}`}>
                {m.emergency && <p className="mb-2 flex gap-2 rounded-lg bg-rose-500/15 p-2 text-xs text-rose-100"><AlertTriangle className="h-4 w-4 shrink-0" />{m.emergency}</p>}
                {m.content}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-zinc-400"><Spinner /> Thinking…</div>}
          {err && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{err}</p>}
          <div ref={end} />
        </div>
        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input className="input" aria-label="Your question" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="Ask a question…" />
            <button className="btn-primary px-3.5" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
          </div>
          <p className="meta mt-2">{DISCLAIMER} Conversations aren't stored.</p>
        </form>
      </aside>
    </div>
  );
}
