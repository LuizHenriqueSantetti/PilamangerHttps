import {useState} from 'react';
import {Activity,Building2,PanelLeftClose,PanelLeftOpen,LayoutDashboard,Users,GraduationCap,CreditCard,DollarSign,Calendar,FileText,Wallet} from 'lucide-react';
import {getRolePermissions,RoleType} from '../utils/permissions';
interface SidebarProps{isDark:boolean;collapsed?:boolean;onCollapsedChange?:(value:boolean)=>void;activeMenu:string;onMenuChange:(menu:string)=>void;userRole:RoleType;academiaName?:string;academiaDescription?:string;logoAcademia?:string}
export function Sidebar({collapsed:controlled,onCollapsedChange,activeMenu,onMenuChange,userRole,academiaName='PilaManager',academiaDescription='PilaManager Studio',logoAcademia}:SidebarProps){
 const [internal,setInternal]=useState(false),collapsed=controlled??internal,permissions=getRolePermissions(userRole);
 const items=[{id:'dashboard',label:'Visão Geral',icon:LayoutDashboard,group:'Rotina'},{id:'agendamento',label:'Agendamento',icon:Calendar,group:'Rotina'},{id:'pacientes',label:'Pacientes',icon:Users,group:'Rotina'},{id:'equipe',label:'Equipe',icon:GraduationCap,group:'Rotina'},{id:'planos',label:'Planos',icon:CreditCard,group:'Gestão'},{id:'cobrancas',label:'Cobranças',icon:Wallet,group:'Gestão'},{id:'comissionamento',label:'Comissionamento',icon:DollarSign,group:'Gestão'},{id:'financeiro',label:'Financeiro',icon:DollarSign,group:'Gestão'},{id:'relatorios',label:'Relatórios',icon:FileText,group:'Gestão'}].filter(i=>i.id === 'comissionamento' ? permissions.financeiro && ['gerencia','admin'].includes(userRole) : permissions[i.id as keyof typeof permissions]);
 return <aside className="pm-sidebar" data-collapsed={collapsed} aria-label="Navegação principal">
  <div className="pm-sidebar-brand pm-brand-lockup"><span>{logoAcademia?<img src={logoAcademia} alt="" width={32} height={32}/>:<Activity size={23}/>}</span>{!collapsed&&<div>PilaManager<small>Gestão de estúdios</small></div>}</div>
  {!collapsed&&<div className="pm-workspace"><Building2 size={21} color="var(--pm-primary)"/><div className="min-w-0"><strong className="block truncate">{academiaName}</strong><small className="truncate">{academiaDescription}</small></div></div>}
  <nav className="pm-nav">{['Rotina','Gestão'].map(group=><section key={group}>{!collapsed&&items.some(i=>
 i.group===group)&&<p className="pm-nav-label">{group}</p>}{items.filter(i=>i.group===group).map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>onMenuChange(id)} aria-current={activeMenu===id?'page':undefined} aria-label={label} title={collapsed?label:undefined}><Icon size={18}/>{!collapsed&&<span>{label}</span>}</button>)}</section>)}</nav>
  <div className="pm-sidebar-footer">{!collapsed&&<div><strong>Seu espaço de trabalho</strong>PilaManager 2.1</div>}<button type="button" aria-label={collapsed?'Expandir menu':'Recolher menu'} onClick={()=>{setInternal(!collapsed);onCollapsedChange?.(!collapsed)}}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button></div>
 </aside>
}
