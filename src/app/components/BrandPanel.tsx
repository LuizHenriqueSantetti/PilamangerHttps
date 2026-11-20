import {Activity,CalendarDays,Users,ChartNoAxesCombined,ArrowUpRight} from 'lucide-react';

export function BrandPanel(){return <aside className="pm-brand-panel">
  <div className="pm-brand-lockup"><span><Activity size={24}/></span><div>PilaManager<small>Gestão de estúdios</small></div></div>
  <div className="pm-brand-story"><p className="pm-eyebrow">MAIS CLAREZA NA SUA ROTINA</p><h2>Seu estúdio<br/>em equilíbrio.</h2><p className="pm-brand-intro">Uma visão organizada das pessoas, dos horários e das finanças. Para você dedicar mais atenção ao que importa.</p>
    <div className="pm-brand-diagram" aria-hidden="true"><div className="pm-diagram-top"><span>Seu espaço de gestão</span><Activity size={18}/></div><div className="pm-diagram-items">{[{icon:CalendarDays,name:'Agenda',note:'Cada horário no seu lugar.'},{icon:Users,name:'Pessoas',note:'Pacientes e equipe conectados.'},{icon:ChartNoAxesCombined,name:'Financeiro',note:'Informação para acompanhar.'}].map(({icon:Icon,name,note},i)=><div key={name}><span className="pm-diagram-number">0{i+1}</span><Icon size={21}/><section><b>{name}</b><small>{note}</small></section><ArrowUpRight size={16}/></div>)}</div><div className="pm-diagram-bottom">ORGANIZAÇÃO QUE ACOMPANHA O MOVIMENTO</div></div>
  </div><footer>Feito para a rotina de quem cuida.</footer>
</aside>}
