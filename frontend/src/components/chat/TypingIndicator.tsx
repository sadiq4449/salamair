import type { TypingUser } from '../../types';

interface Props {
  typingUsers: TypingUser[];
}

export default function TypingIndicator({ typingUsers }: Props) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.name);
  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing`;
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 italic">{text}</span>
    </div>
  );
}
