import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { getSlaDashboard, type SlaDashboard } from '../services/advancedService';

export default function SlaDashboardPage() {
  const [data, setData] = useState<SlaDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSlaDashboard()
      .then(setData)
      .catch(() => setErr('Could not load SLA dashboard'));
  }, []);

  if (err) {
    return <div className="text-center py-16 text-red-600 dark:text-red-400 text-sm">{err}</div>;
  }
  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Compliance', value: `${data.compliance_rate}%`, icon: TrendingUp, tone: 'text-teal-600' },
    { label: 'On track', value: String(data.on_track), icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'At risk', value: String(data.at_risk), icon: Clock, tone: 'text-amber-600' },
    { label: 'Breached', value: String(data.breached), icon: AlertTriangle, tone: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        SLA windows follow each request status. Tracked requests: {data.total_tracked}.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">
              <Icon className={`h-4 w-4 ${tone}`} />
              {label}
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 font-semibold text-gray-900 dark:text-white">
          Overdue requests
        </div>
        {data.overdue_requests.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No overdue SLA items right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Deadline</th>
                  <th className="px-6 py-3">Overdue (h)</th>
                  <th className="px-6 py-3">Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.overdue_requests.map((r) => (
                  <tr key={r.request_code} className="hover:bg-red-50/50 dark:hover:bg-red-950/20">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{r.request_code}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{r.status}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(r.sla_deadline).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-red-600 font-medium">{r.overdue_hours}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{r.assigned_to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
