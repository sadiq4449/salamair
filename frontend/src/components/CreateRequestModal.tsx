import { useState, useRef, type FormEvent } from 'react';
import { X, Upload } from 'lucide-react';
import Button from './ui/Button';
import { useRequestStore } from '../store/requestStore';
import { requestService } from '../services/requestService';

const ROUTES = [
  { value: 'MCT-DXB', label: 'MCT - DXB' },
  { value: 'MCT-KHI', label: 'MCT - KHI' },
  { value: 'MCT-BKK', label: 'MCT - BKK' },
  { value: 'MCT-COK', label: 'MCT - COK' },
  { value: 'MCT-MLE', label: 'MCT - MLE' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateRequestModal({ isOpen, onClose, onCreated }: Props) {
  const { createRequest, isLoading } = useRequestStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    route: '',
    pax: '',
    travel_date: '',
    return_date: '',
    price: '',
    priority: 'normal',
    notes: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent, asDraft = false) {
    e.preventDefault();
    try {
      const created = await createRequest({
        route: form.route,
        pax: Number(form.pax),
        travel_date: form.travel_date,
        return_date: form.return_date || undefined,
        price: Number(form.price),
        priority: form.priority,
        notes: form.notes || undefined,
        status: asDraft ? 'draft' : 'submitted',
      });

      if (files.length > 0) {
        await Promise.all(
          files.map((file) => requestService.uploadAttachment(created.id, file))
        );
      }

      onCreated?.();
      onClose();
      setForm({ route: '', pax: '', travel_date: '', return_date: '', price: '', priority: 'normal', notes: '' });
      setFiles([]);
    } catch {
      // error is set in store
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Route */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Route</label>
              <select
                value={form.route}
                onChange={(e) => update('route', e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              >
                <option value="">Select route...</option>
                {ROUTES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Passengers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Passengers</label>
              <input
                type="number"
                min="1"
                value={form.pax}
                onChange={(e) => update('pax', e.target.value)}
                required
                placeholder="Number of passengers"
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              />
            </div>

            {/* Travel Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Travel Date</label>
              <input
                type="date"
                value={form.travel_date}
                onChange={(e) => update('travel_date', e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              />
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Return Date</label>
              <input
                type="date"
                value={form.return_date}
                onChange={(e) => update('return_date', e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              />
            </div>

            {/* Proposed Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Proposed Price (OMR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update('priority', e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes or requirements..."
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10 resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Attachments</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 transition-colors"
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag & drop files here or <span className="text-teal-600 font-medium">browse</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, true)} disabled={isLoading}>
              Save Draft
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
