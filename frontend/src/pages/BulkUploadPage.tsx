import { useState, useEffect } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { bulkPreview, bulkUpload, downloadBulkTemplateBlob } from '../services/advancedService';
import { listAdminAgents } from '../services/adminService';

export default function BulkUploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof bulkPreview>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkUpload>> | null>(null);
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string }[]>([]);
  const [agentUserId, setAgentUserId] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    listAdminAgents({ limit: 500 })
      .then((res) => {
        const active = res.items.filter((a) => a.is_active);
        setAgentOptions(active.map((a) => ({ id: a.id, name: a.name })));
        setAgentUserId((prev) => prev || active[0]?.id || '');
      })
      .catch(() => setAgentOptions([]));
  }, [user?.role]);

  async function handlePreview(f: File) {
    setLoading(true);
    setResult(null);
    try {
      const p = await bulkPreview(f);
      setPreview(p);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    const blob = await downloadBulkTemplateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_requests_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmUpload() {
    if (!file) return;
    if (user?.role === 'admin' && !agentUserId) return;
    setUploading(true);
    try {
      const res = await bulkUpload(
        file,
        user?.role === 'admin' ? agentUserId : undefined,
      );
      setResult(res);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
          <Download size={16} />
          Download template
        </Button>
      </div>

      {user?.role === 'admin' && (
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Upload requests for agent
          </label>
          <select
            value={agentUserId}
            onChange={(e) => setAgentUserId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none transition-all duration-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]"
          >
            <option value="">Select agent…</option>
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-2 border-dashed border-border dark:border-gray-700 rounded-xl p-8 text-center transition-all duration-200 hover:border-[#00A99D]/35">
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          id="bulk-xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f || null);
            setPreview(null);
            setResult(null);
            if (f) void handlePreview(f);
          }}
        />
        <label htmlFor="bulk-xlsx" className="cursor-pointer inline-flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300 transition-colors">
          <Upload className="h-10 w-10 text-[#00A99D]" />
          <span className="text-sm font-medium">Drop Excel here or click to choose (.xlsx)</span>
          {file && <span className="text-xs text-gray-400">{file.name}</span>}
        </label>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A99D]" />
        </div>
      )}

      {preview?.error && (
        <p className="text-sm text-red-600">{preview.error}</p>
      )}

      {preview && !preview.error && preview.preview.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Valid {preview.valid_rows} / {preview.total_rows} rows
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 max-h-80 overflow-auto shadow-sm">
            <table className="w-full text-xs bg-white dark:bg-gray-900">
              <thead className="sticky top-0 z-[1] bg-gray-50 dark:bg-gray-800/90 border-b border-border dark:border-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Row</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Route</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Pax</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">OK</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.preview.map((row) => (
                  <tr
                    key={row.row}
                    className={`transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.valid ? '' : 'bg-red-50/80 dark:bg-red-950/30'}`}
                  >
                    <td className="px-4 py-3">{row.row}</td>
                    <td className="px-4 py-3">{row.route}</td>
                    <td className="px-4 py-3">{row.pax}</td>
                    <td className="px-4 py-3">{row.price}</td>
                    <td className="px-4 py-3">{row.valid ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-red-600">{row.errors?.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            onClick={handleConfirmUpload}
            disabled={
              !file ||
              preview.valid_rows === 0 ||
              uploading ||
              (user?.role === 'admin' && !agentUserId)
            }
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Confirm bulk create'
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-[#00A99D]/10 dark:bg-[#00A99D]/15 border border-[#00A99D]/25 dark:border-[#00A99D]/30 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 transition-all duration-200">
          {result.message}: created {result.created}, failed {result.failed}.
        </div>
      )}
    </div>
  );
}
