import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { getReminderRules, runRemindersNow, saveReminderRules, type ReminderRule } from '../../services/advancedService';

export default function AdminRemindersPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getReminderRules();
      setRules(res.rules);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = rules.map((r) => ({
        id: r.id,
        delay_hours: r.delay_hours,
        reminder_type: r.reminder_type,
        message_template: r.message_template,
        is_active: r.is_active,
      }));
      const res = await saveReminderRules(payload);
      setRules(res.rules);
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunMsg(null);
    const r = await runRemindersNow();
    setRunMsg(`Created ${r.notifications_created} notifications, sent ${r.emails_sent} emails.`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save rules'}
        </Button>
        <Button variant="secondary" type="button" onClick={runNow}>
          Run reminders now
        </Button>
      </div>
      {runMsg && <p className="text-sm text-teal-700 dark:text-teal-300">{runMsg}</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Delay (h)</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Template</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rules.map((r, idx) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-xs">{r.trigger_status}</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={r.delay_hours}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setRules((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, delay_hours: Number.isFinite(v) ? v : x.delay_hours } : x))
                      );
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={r.reminder_type}
                    onChange={(e) => {
                      setRules((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, reminder_type: e.target.value } : x))
                      );
                    }}
                  >
                    <option value="in_app">in_app</option>
                    <option value="email">email</option>
                    <option value="both">both</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => {
                      setRules((prev) => prev.map((x, i) => (i === idx ? { ...x, is_active: e.target.checked } : x)));
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className="w-full min-w-[200px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                    value={r.message_template}
                    onChange={(e) => {
                      setRules((prev) => prev.map((x, i) => (i === idx ? { ...x, message_template: e.target.value } : x)));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
