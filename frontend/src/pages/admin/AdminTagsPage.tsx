import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { createTag, deleteTag, listTags, type TagDto } from '../../services/advancedService';

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');

  async function load() {
    setLoading(true);
    try {
      setTags(await listTags());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await createTag({ name: name.trim(), color });
    setName('');
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag?')) return;
    await deleteTag(id);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder="Urgent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 rounded cursor-pointer border border-gray-200 dark:border-gray-700"
          />
        </div>
        <Button type="button" onClick={handleCreate}>
          Create tag
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
        {tags.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No tags yet.</p>
        ) : (
          tags.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-8 w-8 rounded-full shrink-0 border border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: t.color }}
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                  <p className="text-xs text-gray-500">Used on {t.usage_count ?? 0} requests</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                aria-label="Delete tag"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
