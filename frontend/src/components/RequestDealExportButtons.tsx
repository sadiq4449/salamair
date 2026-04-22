import { useState } from 'react';
import { Download, FileText, FileType, Loader2 } from 'lucide-react';
import { requestService } from '../services/requestService';
import { useToastStore } from '../store/toastStore';
import Button from './ui/Button';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? (e instanceof Error ? e.message : 'Download failed');
}

/** Download deal + chat (+ RM email for sales/admin) as ZIP, one TXT, or one PDF. */
export default function RequestDealExportButtons({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  async function run(format: 'zip' | 'txt' | 'pdf') {
    setBusy(true);
    try {
      await requestService.downloadExport(requestId, format);
      const label =
        format === 'zip' ? 'ZIP' : format === 'pdf' ? 'PDF' : 'single TXT file';
      addToast('success', `Download started (${label})`);
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200/80 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Export deal &amp; conversation</span>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run('zip')}>
            {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0" />}
            ZIP
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run('txt')}>
            <FileText className="h-3.5 w-3.5 shrink-0" />
            One TXT
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run('pdf')}>
            <FileType className="h-3.5 w-3.5 shrink-0" />
            PDF
          </Button>
        </div>
      </div>
      <p className="text-[0.65rem] text-gray-500 dark:text-gray-500 leading-snug">
        Includes request details, activity log, and Agent ↔ Sales chat. Sales and admin exports also include Sales ↔ RM email
        when stored in the portal.
      </p>
    </div>
  );
}
