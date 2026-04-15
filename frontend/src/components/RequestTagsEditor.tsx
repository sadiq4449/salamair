import { useEffect, useState } from 'react';
import Button from './ui/Button';
import { listTags, updateRequestTags, type TagDto } from '../services/advancedService';
import type { TagBrief } from '../types';

interface RequestTagsEditorProps {
  requestId: string;
  initialTags: TagBrief[];
  onUpdated: () => void;
}

export default function RequestTagsEditor({ requestId, initialTags, onUpdated }: RequestTagsEditorProps) {
  const [allTags, setAllTags] = useState<TagDto[]>([]);
  const [selected, setSelected] = useState<string[]>(() => initialTags.map((t) => t.id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    setSelected(initialTags.map((t) => t.id));
  }, [initialTags]);

  async function save() {
    setSaving(true);
    try {
      await updateRequestTags(requestId, selected);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  if (allTags.length === 0) {
    return (
      <p className="text-xs text-gray-500 mt-3">
        No tags defined yet. Sales or admin can create tags under Admin → Tags.
      </p>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tags</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {allTags.map((t) => (
          <label
            key={t.id}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={selected.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) setSelected((s) => [...s, t.id]);
                else setSelected((s) => s.filter((x) => x !== t.id));
              }}
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="text-gray-800 dark:text-gray-200">{t.name}</span>
          </label>
        ))}
      </div>
      <Button type="button" size="sm" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save tags'}
      </Button>
    </div>
  );
}
