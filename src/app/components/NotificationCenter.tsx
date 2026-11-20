import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Info, X, XCircle, AlertTriangle } from 'lucide-react';
import { CONFIRMATION_EVENT, ConfirmationRequest, dismissNotification, getNotifications, getServerNotifications, notify, notifyError, subscribeNotifications } from '../utils/notifications';

export function NotificationCenter() {
  const items = useSyncExternalStore(subscribeNotifications, getNotifications, getServerNotifications);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const pendingConfirmation = useRef<ConfirmationRequest | null>(null);
  useEffect(() => {
    const confirm = (event: Event) => { const value = (event as CustomEvent<ConfirmationRequest>).detail; pendingConfirmation.current = value; setConfirmation(value); };
    const saveError = (event: Event) => {
      const detail = (event as CustomEvent).detail as { message?: string };
      notifyError(new Error(detail?.message || 'Não foi possível salvar. Seus dados foram mantidos para tentar novamente.'));
    };
    const expired = () => notify('Sua sessão expirou. Entre novamente para continuar.', 'warning');
    const denied = () => notify('Você não tem permissão para realizar esta ação.', 'error');
    const retried = () => notify('Alterações pendentes salvas.', 'success');
    window.addEventListener(CONFIRMATION_EVENT, confirm);
    window.addEventListener('pilamanager:save-error', saveError);
    window.addEventListener('pilamanager:session-expired', expired);
    window.addEventListener('pilamanager:permission-denied', denied);
    window.addEventListener('pilamanager:retry-saved', retried);
    return () => { window.removeEventListener(CONFIRMATION_EVENT, confirm); window.removeEventListener('pilamanager:save-error', saveError); window.removeEventListener('pilamanager:session-expired', expired); window.removeEventListener('pilamanager:permission-denied', denied); window.removeEventListener('pilamanager:retry-saved', retried); pendingConfirmation.current?.resolve(false); };
  }, []);
  useEffect(() => {
    if (!confirmation) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelButton.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [confirmation]);
  const finish = (value: boolean) => { confirmation?.resolve(value); pendingConfirmation.current = null; setConfirmation(null); };
  return <>
    <div className="pm-notifications" aria-label="Notificações">
      {items.map(item => {
        const Icon = item.type === 'success' ? CheckCircle2 : item.type === 'error' ? XCircle : item.type === 'warning' ? AlertTriangle : Info;
        return <div key={item.id} className="pm-notification" data-type={item.type} data-leaving={item.leaving || undefined} role={item.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
          <Icon aria-hidden="true"/><p>{item.message}</p><button type="button" onClick={() => dismissNotification(item.id)} aria-label="Fechar notificacao"><X aria-hidden="true"/></button>
        </div>;
      })}
    </div>
    {confirmation && <div className="pm-panel-overlay pm-confirm-overlay" onClick={() => finish(false)}>
      <section className="pm-panel pm-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-confirm-title" aria-describedby="pm-confirm-message" onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape') finish(false);
        if (event.key === 'Tab') { event.preventDefault(); const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button'); (document.activeElement === buttons[0] ? buttons[1] : buttons[0])?.focus(); }
      }}>
        <header className="pm-panel-header"><h2 id="pm-confirm-title">Confirmar ação</h2></header>
        <p id="pm-confirm-message">{confirmation.message}</p>
        <footer><button ref={cancelButton} type="button" className="pm-button-secondary" onClick={() => finish(false)}>Cancelar</button><button type="button" className="pm-button-primary" data-destructive={confirmation.destructive} onClick={() => finish(true)}>Confirmar</button></footer>
      </section>
    </div>}
  </>;
}
