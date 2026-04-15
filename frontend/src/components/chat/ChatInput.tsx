import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  onFileSelect?: (files: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onFileSelect,
  onTyping,
  disabled,
  isSending,
  placeholder = 'Type a message...',
}: Props) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      if (onTyping) {
        onTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => onTyping(false), 2000);
      }
    },
    [onTyping],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;

    if (trimmed) {
      onSend(trimmed);
    }
    if (files.length > 0 && onFileSelect) {
      onFileSelect(files);
    }

    setText('');
    setFiles([]);
    onTyping?.(false);
    clearTimeout(typingTimeout.current);
  }, [text, files, onSend, onFileSelect, onTyping]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
            >
              <Paperclip size={12} />
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1 px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-50"
        />
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || isSending}
          className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <Paperclip size={18} />
        </button>
        <button
          onClick={handleSend}
          disabled={disabled || isSending || (!text.trim() && files.length === 0)}
          className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
