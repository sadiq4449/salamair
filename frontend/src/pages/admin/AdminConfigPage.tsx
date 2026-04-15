import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAdminConfig, updateAdminConfig } from '../../services/adminService';
import type { AdminConfigItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Request failed';
}

export default function AdminConfigPage() {
  const [items, setItems] = useState<AdminConfigItem[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAdminConfig();
        if (cancelled) return;
        setItems(res.items);
        const d: Record<string, string> = {};
        for (const it of res.items) d[it.key] = it.value;
        setDraft(d);
      } catch (e) {
        addToast('error', apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  async function onSave() {
    setSaving(true);
    try {
      const body = items.map((it) => ({ key: it.key, value: draft[it.key] ?? it.value }));
      const res = await updateAdminConfig(body);
      setItems(res.items);
      addToast('success', 'Configuration saved');
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-teal-600">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((it) => (
          <div key={it.key} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-1/3">
              <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{it.key}</p>
              {it.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{it.description}</p>
              )}
            </div>
            <div className="flex-1">
              <Input
                value={draft[it.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [it.key]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={() => void onSave()} isLoading={saving}>
        Save changes
      </Button>
    </div>
  );
}
