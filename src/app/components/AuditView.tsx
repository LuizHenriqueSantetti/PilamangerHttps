import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { auditService, AuditEntry } from '../services/auditService';
import { authService } from '../services/authService';

export function AuditView({ isDark, showOtherUsers = false }: { isDark: boolean; showOtherUsers?: boolean }) {
  const [items, setItems] = useState<AuditEntry[]>(() => auditService.list());
  const P = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const currentEmail = authService.getCurrentUser()?.email;
  const visibleItems = showOtherUsers ? items : items.filter(item => item.userEmail === currentEmail);

  useEffect(() => {
    const refresh = () => setItems(auditService.list());
    window.addEventListener('pilamanager:audit-updated', refresh);
    return () => window.removeEventListener('pilamanager:audit-updated', refresh);
  }, []);

  return (
    <div className="p-6 min-h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${P}18` }}>
          <ShieldCheck className="w-5 h-5" style={{ color: P }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: textMain }}>Registro de Atividades</h2>
          <p className="text-sm" style={{ color: textSub }}>Registro das ações importantes realizadas no sistema.</p>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: card, borderColor: border }}>
        {visibleItems.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: textSub }}>Nenhuma atividade importante registrada.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: border }}>
            {visibleItems.slice(0, 150).map(item => (
              <div key={item.id} className="p-4 grid grid-cols-1 md:grid-cols-[1.2fr_.8fr_.7fr] gap-2" style={{ backgroundColor: muted }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: textMain }}>{item.action}</p>
                  <p className="text-xs" style={{ color: textSub }}>{item.module} {item.recordId ? `- ${item.recordId}` : ''}</p>
                </div>
                <p className="text-sm" style={{ color: textSub }}>{item.userName}<br /><span className="text-xs">{item.userEmail}</span></p>
                <p className="text-xs md:text-right" style={{ color: textSub }}>{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
