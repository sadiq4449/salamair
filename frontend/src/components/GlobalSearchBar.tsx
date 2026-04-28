import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { searchGlobal } from '../services/advancedService';

const RECENT_KEY = 'salam_recent_searches';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  const prev = loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  prev.unshift(t);
  localStorage.setItem(RECENT_KEY, JSON.stringify(prev.slice(0, MAX_RECENT)));
}

export default function GlobalSearchBar() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<{ label: string; path: string }[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const nav = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const term = q.trim();
      if (term.length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      const detailPrefix = user?.role === 'agent' ? '/requests' : '/pending';
      searchGlobal({ q: term, type: 'all', limit: 15 })
        .then((res) => {
          const list: { label: string; path: string }[] = [];
          res.results.requests.forEach((r) => {
            list.push({ label: `${r.request_code} — ${r.route}`, path: `${detailPrefix}/${r.id}` });
          });
          res.results.messages.forEach((m) => {
            list.push({
              label: `${m.request_code}: ${m.content.slice(0, 60)}…`,
              path: `${detailPrefix}/${m.request_id}`,
            });
          });
          res.results.agents.forEach((a) => {
            list.push({ label: `${a.name} (${a.email})`, path: '/admin/agents' });
          });
          setHits(list.slice(0, 8));
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 320);
    return () => clearTimeout(t);
  }, [q, user?.role]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function goSearch(term?: string) {
    const v = (term ?? q).trim();
    if (v.length < 2) return;
    pushRecent(v);
    setOpen(false);
    nav(`/search?q=${encodeURIComponent(v)}`);
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goSearch();
          }}
          placeholder="Search requests, messages…"
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#00A99D] focus:border-[#00A99D]"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#00A99D]" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-80 overflow-y-auto text-sm transition-all duration-200">
          {q.trim().length < 2 && recent.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              Recent
            </div>
          )}
          {q.trim().length < 2 &&
            recent.map((r) => (
              <button
                key={r}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all duration-200"
                onClick={() => {
                  setQ(r);
                  goSearch(r);
                }}
              >
                {r}
              </button>
            ))}
          {hits.map((h, i) => (
            <button
              key={`${h.path}-${i}`}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-t border-gray-50 dark:border-gray-800 transition-all duration-200"
              onClick={() => {
                pushRecent(q);
                setOpen(false);
                nav(h.path);
              }}
            >
              {h.label}
            </button>
          ))}
          {q.trim().length >= 2 && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-[#00A99D] font-medium border-t border-gray-100 dark:border-gray-800 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/80"
              onClick={() => goSearch()}
            >
              View all results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
