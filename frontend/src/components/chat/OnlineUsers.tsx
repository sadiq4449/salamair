interface OnlineUser {
  user_id: string;
  name: string;
  online: boolean;
}

interface Props {
  users: OnlineUser[];
}

export default function OnlineUsers({ users }: Props) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {users.map((u) => (
        <div key={u.user_id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <span>{u.name}</span>
        </div>
      ))}
    </div>
  );
}
