import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import { bulkPreview, bulkUpload, downloadBulkTemplateBlob } from '../services/advancedService';

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof bulkPreview>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkUpload>> | null>(null);

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
    setUploading(true);
    try {
      const res = await bulkUpload(file);
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

      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
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
        <label htmlFor="bulk-xlsx" className="cursor-pointer inline-flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
          <Upload className="h-10 w-10 text-teal-600" />
          <span className="text-sm font-medium">Drop Excel here or click to choose (.xlsx)</span>
          {file && <span className="text-xs text-gray-400">{file.name}</span>}
        </label>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-3 py-2">Row</th>
                  <th className="text-left px-3 py-2">Route</th>
                  <th className="text-left px-3 py-2">Pax</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="text-left px-3 py-2">OK</th>
                  <th className="text-left px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row) => (
                  <tr key={row.row} className={row.valid ? '' : 'bg-red-50/80 dark:bg-red-950/30'}>
                    <td className="px-3 py-1.5">{row.row}</td>
                    <td className="px-3 py-1.5">{row.route}</td>
                    <td className="px-3 py-1.5">{row.pax}</td>
                    <td className="px-3 py-1.5">{row.price}</td>
                    <td className="px-3 py-1.5">{row.valid ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-1.5 text-red-600">{row.errors?.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={handleConfirmUpload} disabled={!file || preview.valid_rows === 0 || uploading}>
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
        <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 px-4 py-3 text-sm text-teal-900 dark:text-teal-100">
          {result.message}: created {result.created}, failed {result.failed}.
        </div>
      )}
    </div>
  );
}
