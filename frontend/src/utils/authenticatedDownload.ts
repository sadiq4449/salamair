import api from '../services/api';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a file from an API path under `/api/v1` using the session Bearer token.
 * @param apiV1Path e.g. `requests/{rid}/attachments/{aid}/file` (no leading slash)
 */
export async function downloadAuthenticated(apiV1Path: string, filename: string): Promise<void> {
  const path = apiV1Path.replace(/^\//, '');
  const { data } = await api.get(path, { responseType: 'blob' });
  triggerBlobDownload(data, filename);
}
