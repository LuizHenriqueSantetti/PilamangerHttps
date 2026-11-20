import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { accessLogService, AccessLogEntry } from '../services/accessLogService';

export function AccessLogsView({ isDark }: { isDark: boolean }) {
  const [items, setItems] = useState<AccessLogEntry[]>(() => accessLogService.list());
  const P = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  useEffect(() => {
    const refresh = () => setItems(accessLogService.list());
    window.addEventListener('pilamanager:access-log-updated', refresh);
    return () => window.removeEventListener('pilamanager:access-log-updated', refresh);
  }, []);

  return (
    <div className="p-6 min-h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${P}18` }}>
          <LockKeyhole className="w-5 h-5" style={{ color: P }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: textMain }}>Logs de Acesso</h2>
          <p className="text-sm" style={{ color: textSub }}>Logins, tentativas, bloqueios e encerramentos de sessao</p>
        </div>
      </div>
      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: card, borderColor: border }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: textSub, borderBottom: `1px solid ${border}` }}>
              {['Data', 'Conta', 'Status', 'Dispositivo', 'Mensagem'].map(h => <th key={h} className="text-left p-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 150).map(item => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${border}`, color: textMain }}>
                <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                <td className="p-3">{item.email}</td>
                <td className="p-3 font-semibold">{item.status}</td>
                <td className="p-3">{item.browser} / {item.platform}</td>
                <td className="p-3" style={{ color: textSub }}>{item.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-6 text-sm" style={{ color: textSub }}>Nenhum log registrado.</p>}
      </div>
    </div>
  );
}
