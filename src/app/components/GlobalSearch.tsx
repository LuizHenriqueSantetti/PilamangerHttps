import { useEffect, useState } from 'react';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { SystemPermissions } from '../utils/permissions';
import { globalSearchService, SearchResult } from '../services/globalSearchService';

interface GlobalSearchProps {
  isDark: boolean;
  perms: SystemPermissions;
  onNavigate: (module: string, recordId?: string) => void;
}

export function GlobalSearch({ isDark, perms, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(() => { setResults(globalSearchService.search(query, perms)); setLoading(false); }, 180);
    return () => window.clearTimeout(timer);
  }, [query, perms]);
  const P = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const inputBg = isDark ? '#111F35' : '#F4F8FB';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] || []), item];
    return acc;
  }, {});

  return (
    <div className="relative hidden md:block w-[360px] max-w-[42vw]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: P }} />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none"
        style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}
        placeholder="Buscar alunos e profissionais..."
        aria-label="Pesquisar pessoas cadastradas"
      />
      {query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-xl shadow-xl z-50 overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          {loading ? (
            <p className="flex items-center gap-2 p-4 text-sm" style={{ color: textSub }}><Loader2 className="h-4 w-4 animate-spin" />Carregando...</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: textSub }}>Nenhum resultado encontrado.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="py-1">
                  <p className="px-3 py-1 text-[11px] font-bold uppercase" style={{ color: textSub }}>{category}</p>
                  {items.map(item => (
                    <button
                      key={`${item.module}-${item.id}`}
                      onClick={() => { onNavigate(item.module, item.id); setQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left"
                      style={{ color: textMain }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-xs truncate" style={{ color: textSub }}>{item.subtitle}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: P }} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
