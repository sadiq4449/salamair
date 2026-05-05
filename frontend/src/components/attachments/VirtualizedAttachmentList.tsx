import { Paperclip } from 'lucide-react';
import { List, type RowComponentProps } from 'react-window';
import type { Attachment } from '../../types';

type RowData = {
  items: Attachment[];
  onDownload: (att: Attachment) => void;
};

const ROW_HEIGHT = 44;
const MAX_VISIBLE_ROWS = 8;

function AttachmentRow({
  index,
  style,
  ...data
}: RowComponentProps<RowData>) {
  const att = data.items[index];
  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => data.onDownload(att)}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left"
      >
        <Paperclip size={14} className="text-gray-400" />
        <span className="text-sm text-[#00A99D] dark:text-[#2dd4bf] truncate">{att.filename}</span>
        <span className="text-xs text-gray-400 ml-auto">{(att.file_size / 1024).toFixed(0)} KB</span>
      </button>
    </div>
  );
}

interface Props {
  attachments: Attachment[];
  onDownload: (att: Attachment) => void;
}

export default function VirtualizedAttachmentList({ attachments, onDownload }: Props) {
  const height = Math.min(attachments.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;
  return (
    <List<RowData>
      defaultHeight={height}
      rowComponent={AttachmentRow}
      rowCount={attachments.length}
      rowHeight={ROW_HEIGHT}
      rowProps={{ items: attachments, onDownload }}
      style={{ height, width: '100%' }}
    />
  );
}
