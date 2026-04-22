import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { useRequestStore } from '../store/requestStore';
import Button from './ui/Button';
/** Sales/admin only — POST `/sales/requests/{id}/notes` (logged as activity). */

export default function SalesInternalNoteForm({ requestId }: { requestId: string }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const { addNote, fetchRequest } = useRequestStore();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    const ok = await addNote(requestId, { content: t });
    if (ok) {
      setText('');
      void fetchRequest(requestId);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/15 shadow-sm">
      <div className="px-4 py-3 border-b border-amber-100/80 dark:border-amber-900/30 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-800 dark:text-amber-200">
          <StickyNote size={16} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Internal note (sales)</h3>
          <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">Visible in activity log; not sent to the agent or RM email.</p>
        </div>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="p-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Add context for the team (pricing discussion, call notes)…"
          className="w-full rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 resize-y"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={saving || !text.trim()} isLoading={saving}>
          Save note
        </Button>
      </form>
    </div>
  );
}
