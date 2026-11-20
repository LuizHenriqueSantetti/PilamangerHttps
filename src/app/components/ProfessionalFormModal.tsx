import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, UserRound } from 'lucide-react';
import { notify, performActionWithResult } from '../utils/notifications';
import { ImageUpload } from './ImageUpload';
import { Professional, ProfessionalInput } from '../types/professional';
import { emptyBankDetails, professionalService } from '../services/professionalService';
import { isValidCPF, isValidPhone, maskRG, maskCurrency, parseCurrency, maskAgency, maskCEP, maskCPF, maskPhone, onlyDigits } from '../utils/masks';
import { validateEmail } from '../utils/validators';
import { createPrivacyAcceptance, PRIVACY_CONSENT_TEXT } from '../utils/privacy';

type Section = 'pessoal' | 'profissional' | 'pagamento' | 'bancario';
type Errors = Record<string, string>;

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MODALITIES = ['Pilates', 'Solo', 'Aparelhos', 'Funcional', 'Alongamento', 'Reabilitação', 'Personal'];

const blank = (): ProfessionalInput => ({
  foto: '', nome: '', cpf: '', rg: '', dataNascimento: '', telefone: '', email: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  observacoes: '', tipo: 'fisioterapeuta', registroProfissional: '', especialidade: '', modalidades: [],
  dataAdmissao: new Date().toISOString().slice(0, 10), status: 'ativo', horarios: [], duracaoAula: 60, intervalos: [], bloqueios: [], indisponibilidades: [], tipoContrato: 'PJ',
  metodoPagamento: 'pix', tipoComissao: 'percentual', comissaoPercentual: 0, valorFixoAula: 0,
  regrasPagamento: '', dadosBancarios: emptyBankDetails(),
});

function fromProfessional(value: Professional): ProfessionalInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, deletedAt: _deletedAt, ...input } = value;
  return input;
}

export function ProfessionalFormModal({ isDark, professional, onClose, onSaved, initialSection = 'pessoal' }: {
  isDark: boolean; professional: Professional | null; onClose: () => void; onSaved: (record: Professional) => void; initialSection?: Section;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [form, setForm] = useState<ProfessionalInput>(() => professional ? fromProfessional(professional) : blank());
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(Boolean(professional?.privacyConsent?.accepted));
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    bodyRef.current?.scrollTo({ top: 0 });
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const P = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const set = <K extends keyof ProfessionalInput>(key: K, value: ProfessionalInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
  };
  const setAddress = (key: keyof ProfessionalInput['endereco'], value: string) => set('endereco', { ...form.endereco, [key]: value });
  const setBank = (key: keyof ProfessionalInput['dadosBancarios'], value: string) => set('dadosBancarios', { ...form.dadosBancarios, [key]: value });

  const bankIncomplete = useMemo(() => {
    const b = form.dadosBancarios;
    const started = Object.values(b).some(Boolean);
    return started && !(b.banco && b.agencia && b.conta && b.tipoConta && b.nomeTitular && b.cpfTitular);
  }, [form.dadosBancarios]);

  const validate = () => {
    const next: Errors = {};
    if (form.nome.trim().length < 3) next.nome = 'Informe o nome completo.';
    if (!isValidCPF(form.cpf)) next.cpf = 'Informe um CPF válido.';
    if (!/^\d{5,14}$/.test(onlyDigits(form.rg))) next.rg = 'Informe um RG válido.';
    if (!form.dataNascimento || new Date(`${form.dataNascimento}T12:00:00`) >= new Date()) next.dataNascimento = 'Informe uma data de nascimento válida.';
    if (!isValidPhone(form.telefone)) next.telefone = 'Informe um telefone com DDD.';
    const emailError = validateEmail(form.email); if (emailError) next.email = emailError;
    if (!form.registroProfissional.trim()) next.registroProfissional = `Informe o ${form.tipo === 'fisioterapeuta' ? 'CREFITO' : 'registro profissional'}.`;
    if (!form.especialidade.trim()) next.especialidade = 'Informe a especialidade.';
    if (!form.dataAdmissao) next.dataAdmissao = 'Informe a data de admissão.';
    if (!Number.isInteger(form.duracaoAula) || form.duracaoAula < 15 || form.duracaoAula > 240) next.duracaoAula = 'Informe uma duração entre 15 e 240 minutos.';
    if (form.horarios.some(slot => !slot.inicio || !slot.fim || slot.inicio >= slot.fim)) next.horarios = 'Revise os turnos de disponibilidade.';
    if (form.tipoComissao !== 'fixa' && (form.comissaoPercentual <= 0 || form.comissaoPercentual > 100)) next.comissaoPercentual = 'Informe um percentual entre 0,01 e 100.';
    if (form.tipoComissao !== 'percentual' && form.valorFixoAula <= 0) next.valorFixoAula = 'Informe o valor fixo por aula.';
    const duplicate = professionalService.findDuplicate(form.cpf, form.email, professional?.id);
    if (duplicate) next[duplicate] = duplicate === 'cpf' ? 'Já existe um profissional com este CPF.' : 'Já existe um profissional com este e-mail.';
    if (!form.privacyConsent?.accepted && !privacyAccepted) next.privacyConsent = 'Aceite a Política de Privacidade antes de salvar o profissional.';
    const b = form.dadosBancarios;
    if (Object.values(b).some(Boolean)) {
      if (b.agencia && !/^\d{1,5}$/.test(b.agencia)) next.agencia = 'Informe uma agência válida.';
      if (b.conta && !/^\d{1,12}$/.test(onlyDigits(b.conta))) next.conta = 'Informe uma conta válida.';
      if (b.cpfTitular && !isValidCPF(b.cpfTitular)) next.cpfTitular = 'Informe um CPF de titular válido.';
      if (b.chavePix && !b.tipoChavePix) next.tipoChavePix = 'Selecione o tipo da chave Pix.';
      if (b.tipoChavePix === 'cpf' && b.chavePix && !isValidCPF(b.chavePix)) next.chavePix = 'Informe uma chave CPF válida.';
      if (b.tipoChavePix === 'email' && b.chavePix && validateEmail(b.chavePix)) next.chavePix = 'Informe uma chave de e-mail válida.';
      if (b.tipoChavePix === 'telefone' && b.chavePix && !isValidPhone(b.chavePix)) next.chavePix = 'Informe uma chave de telefone válida.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const bankKeys = ['banco', 'agencia', 'conta', 'tipoConta', 'nomeTitular', 'cpfTitular', 'tipoChavePix', 'chavePix'];
      if (Object.keys(next).some(key => bankKeys.includes(key))) setSection('bancario');
      else if (next.comissaoPercentual || next.valorFixoAula) setSection('pagamento');
      else if (next.registroProfissional || next.especialidade || next.dataAdmissao) setSection('profissional');
      else setSection('pessoal');
      notify('Verifique as informações preenchidas.', 'warning');
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const saved = await performActionWithResult('professional:' + (professional?.id || 'new'), () =>
        professionalService.save({ ...form, privacyConsent: form.privacyConsent?.accepted ? form.privacyConsent : createPrivacyAcceptance('profissional') }, professional?.id),
        professional ? 'Profissional atualizado.' : 'Profissional cadastrado com sucesso.');
      if (saved.ok) onSaved(saved.value);
    } finally { setSubmitting(false); }
  };

  const fieldProps = { inputBg, border, textMain };
  return (
    <div className="pm-panel-overlay professional-form-overlay fixed inset-0 z-[9999] flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.62)' }}>
      <div className="pm-panel professional-form-dialog flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true" aria-labelledby="professional-title">
        <header className="pm-panel-header professional-form-header flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border, backgroundColor: card }}>
          <div className="pm-panel-heading"><span className="pm-panel-heading-icon"><UserRound aria-hidden="true"/></span><div><h2 id="professional-title" className="text-lg font-bold" style={{ color: textMain }}>{professional ? 'Editar profissional' : 'Adicionar novo profissional'}</h2><p className="text-sm" style={{ color: textSub }}>Preencha os dados pessoais, profissionais e de pagamento.</p></div></div>
          <button onClick={onClose} className="professional-form-close flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: textSub, backgroundColor: inputBg }} aria-label="Fechar edição do profissional" title="Fechar"><X className="h-5 w-5" /></button>
        </header>

        <nav className="professional-section-tabs grid grid-cols-2 border-b sm:grid-cols-4" style={{ borderColor: border }} aria-label="Seções do cadastro">
          {([['pessoal', 'Dados pessoais'], ['profissional', 'Dados profissionais'], ['pagamento', 'Pagamento e comissão'], ['bancario', 'Dados bancários']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSection(id)} className="border-b-2 px-3 py-3 text-sm font-semibold" style={{ borderColor: section === id ? P : 'transparent', color: section === id ? P : textSub, backgroundColor: section === id ? `${P}0A` : 'transparent' }}>{label}</button>
          ))}
        </nav>

        <div ref={bodyRef} className="professional-form-body min-w-0 overflow-y-auto overflow-x-hidden p-5">
          {section === 'pessoal' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><ImageUpload currentImage={form.foto} onImageChange={value => set('foto', value)} label="Foto de perfil" isDark={isDark} /></div>
            <Field label="Nome completo *" value={form.nome} onChange={v => set('nome', v)} error={errors.nome} {...fieldProps} />
            <Field label="CPF *" value={form.cpf} onChange={v => set('cpf', maskCPF(v))} error={errors.cpf} inputMode="numeric" {...fieldProps} />
            <Field label="RG *" value={form.rg} onChange={v => set('rg', maskRG(v))} error={errors.rg} {...fieldProps} />
            <Field label="Data de nascimento *" type="date" value={form.dataNascimento} onChange={v => set('dataNascimento', v)} error={errors.dataNascimento} {...fieldProps} />
            <Field label="Telefone *" value={form.telefone} onChange={v => set('telefone', maskPhone(v))} error={errors.telefone} inputMode="tel" {...fieldProps} />
            <Field label="E-mail *" type="email" value={form.email} onChange={v => set('email', v)} error={errors.email} {...fieldProps} />
            <Field label="CEP" value={form.endereco.cep} onChange={v => setAddress('cep', maskCEP(v))} inputMode="numeric" {...fieldProps} />
            <Field label="Logradouro" value={form.endereco.logradouro} onChange={v => setAddress('logradouro', v)} {...fieldProps} />
            <Field label="Número" value={form.endereco.numero} onChange={v => setAddress('numero', v)} {...fieldProps} />
            <Field label="Complemento" value={form.endereco.complemento} onChange={v => setAddress('complemento', v)} {...fieldProps} />
            <Field label="Bairro" value={form.endereco.bairro} onChange={v => setAddress('bairro', v)} {...fieldProps} />
            <Field label="Cidade" value={form.endereco.cidade} onChange={v => setAddress('cidade', v)} {...fieldProps} />
            <Field label="UF" value={form.endereco.uf} onChange={v => setAddress('uf', v.toUpperCase().slice(0, 2))} {...fieldProps} />
            <TextArea label="Observações" value={form.observacoes} onChange={v => set('observacoes', v)} {...fieldProps} />
          </div>}

          {section === 'profissional' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField label="Tipo de profissional *" value={form.tipo} onChange={v => set('tipo', v as ProfessionalInput['tipo'])} options={[['professor', 'Professor'], ['fisioterapeuta', 'Fisioterapeuta']]} {...fieldProps} />
            <Field label={`${form.tipo === 'fisioterapeuta' ? 'CREFITO' : 'Registro profissional'} *`} value={form.registroProfissional} onChange={v => set('registroProfissional', v.toUpperCase())} error={errors.registroProfissional} {...fieldProps} />
            <Field label="Especialidade *" value={form.especialidade} onChange={v => set('especialidade', v)} error={errors.especialidade} {...fieldProps} />
            <Field label="Data de admissão *" type="date" value={form.dataAdmissao} onChange={v => set('dataAdmissao', v)} error={errors.dataAdmissao} {...fieldProps} />
            <SelectField label="Situação" value={form.status} onChange={v => set('status', v as ProfessionalInput['status'])} options={[['ativo', 'Ativo'], ['inativo', 'Inativo']]} {...fieldProps} />
            <SelectField label="Contrato" value={form.tipoContrato} onChange={v => set('tipoContrato', v as ProfessionalInput['tipoContrato'])} options={[['CLT', 'CLT'], ['PJ', 'PJ'], ['Horista', 'Horista']]} {...fieldProps} />
            <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold" style={{ color: textMain }}>Modalidades</p><div className="flex flex-wrap gap-2">{MODALITIES.map(item => <button key={item} type="button" onClick={() => set('modalidades', form.modalidades.includes(item) ? form.modalidades.filter(value => value !== item) : [...form.modalidades, item])} className="rounded-full border px-3 py-2 text-sm" style={{ borderColor: form.modalidades.includes(item) ? P : border, color: form.modalidades.includes(item) ? P : textSub, backgroundColor: form.modalidades.includes(item) ? `${P}14` : inputBg }}>{item}</button>)}</div></div>
            <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold" style={{ color: textMain }}>Disponibilidade</p><div className="space-y-2">{form.horarios.map((slot, index) => <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2"><select value={slot.dia} onChange={e => set('horarios', form.horarios.map((item, i) => i === index ? { ...item, dia: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}>{DAYS.map(day => <option key={day}>{day}</option>)}</select><input type="time" value={slot.inicio} onChange={e => set('horarios', form.horarios.map((item, i) => i === index ? { ...item, inicio: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><input type="time" value={slot.fim} onChange={e => set('horarios', form.horarios.map((item, i) => i === index ? { ...item, fim: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><button type="button" onClick={() => set('horarios', form.horarios.filter((_, i) => i !== index))} className="rounded-lg px-2 text-sm text-[#D95C5C]">Remover</button></div>)}</div><button type="button" onClick={() => set('horarios', [...form.horarios, { dia: 'Segunda', inicio: '08:00', fim: '12:00' }])} className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ color: P, backgroundColor: `${P}14` }}>Adicionar turno</button></div>
            <NumberField label="Duração padrão da aula (minutos) *" value={form.duracaoAula} onChange={v => set('duracaoAula', v)} error={errors.duracaoAula} {...fieldProps} />
            <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold" style={{ color: textMain }}>Intervalos</p><div className="space-y-2">{form.intervalos.map((slot, index) => <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2"><select value={slot.dia} onChange={e => set('intervalos', form.intervalos.map((item, i) => i === index ? { ...item, dia: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}>{DAYS.map(day => <option key={day}>{day}</option>)}</select><input type="time" value={slot.inicio} onChange={e => set('intervalos', form.intervalos.map((item, i) => i === index ? { ...item, inicio: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><input type="time" value={slot.fim} onChange={e => set('intervalos', form.intervalos.map((item, i) => i === index ? { ...item, fim: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><button type="button" onClick={() => set('intervalos', form.intervalos.filter((_, i) => i !== index))} className="rounded-lg px-2 text-sm text-[#D95C5C]">Remover</button></div>)}</div><button type="button" onClick={() => set('intervalos', [...form.intervalos, { dia: 'Segunda', inicio: '12:00', fim: '13:00' }])} className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ color: P, backgroundColor: `${P}14` }}>Adicionar intervalo</button></div>
            <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold" style={{ color: textMain }}>Bloqueios de horário</p><div className="space-y-2">{form.bloqueios.map((slot, index) => <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2"><input type="date" value={slot.data} onChange={e => set('bloqueios', form.bloqueios.map((item, i) => i === index ? { ...item, data: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><input type="time" value={slot.inicio} onChange={e => set('bloqueios', form.bloqueios.map((item, i) => i === index ? { ...item, inicio: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><input type="time" value={slot.fim} onChange={e => set('bloqueios', form.bloqueios.map((item, i) => i === index ? { ...item, fim: e.target.value } : item))} className="rounded-xl border px-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><button type="button" onClick={() => set('bloqueios', form.bloqueios.filter((_, i) => i !== index))} className="rounded-lg px-2 text-sm text-[#D95C5C]">Remover</button></div>)}</div><button type="button" onClick={() => set('bloqueios', [...form.bloqueios, { data: new Date().toISOString().slice(0, 10), inicio: '08:00', fim: '09:00', motivo: '' }])} className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ color: P, backgroundColor: `${P}14` }}>Adicionar bloqueio</button></div>
            <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold" style={{ color: textMain }}>Férias ou afastamentos</p><div className="space-y-2">{form.indisponibilidades.map((period, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input type="date" value={period.inicio} onChange={e => set('indisponibilidades', form.indisponibilidades.map((item, i) => i === index ? { ...item, inicio: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><input type="date" value={period.fim} onChange={e => set('indisponibilidades', form.indisponibilidades.map((item, i) => i === index ? { ...item, fim: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /><button type="button" onClick={() => set('indisponibilidades', form.indisponibilidades.filter((_, i) => i !== index))} className="rounded-lg px-2 text-sm text-[#D95C5C]">Remover</button></div>)}</div><button type="button" onClick={() => set('indisponibilidades', [...form.indisponibilidades, { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10), motivo: '' }])} className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ color: P, backgroundColor: `${P}14` }}>Adicionar período</button></div>
          </div>}

          {section === 'pagamento' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField label="Método de pagamento" value={form.metodoPagamento} onChange={v => set('metodoPagamento', v as ProfessionalInput['metodoPagamento'])} options={[['pix', 'Pix'], ['ted', 'TED'], ['dinheiro', 'Dinheiro'], ['outro', 'Outro']]} {...fieldProps} />
            <SelectField label="Tipo de comissão" value={form.tipoComissao} onChange={v => set('tipoComissao', v as ProfessionalInput['tipoComissao'])} options={[['percentual', 'Percentual'], ['fixa', 'Valor fixo por aula'], ['hibrida', 'Modelo híbrido']]} {...fieldProps} />
            {form.tipoComissao !== 'fixa' && <NumberField label="Comissão percentual (%) *" value={form.comissaoPercentual} onChange={v => set('comissaoPercentual', v)} error={errors.comissaoPercentual} {...fieldProps} />}
            {form.tipoComissao !== 'percentual' && <Field label="Valor fixo por aula (R$) *" inputMode="numeric" value={maskCurrency(String(Math.round(form.valorFixoAula * 100)))} onChange={v => set('valorFixoAula', parseCurrency(maskCurrency(v)))} error={errors.valorFixoAula} {...fieldProps} />}
            <TextArea label="Regras ou observacoes de pagamento" value={form.regrasPagamento} onChange={v => set('regrasPagamento', v)} {...fieldProps} />
          </div>}

          {section === 'bancario' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-xl border p-3 text-sm" style={{ borderColor: bankIncomplete ? '#E5A83B' : border, color: bankIncomplete ? '#E5A83B' : textSub, backgroundColor: bankIncomplete ? 'rgba(229,168,59,0.08)' : inputBg }}>{bankIncomplete ? 'Cadastro bancário incompleto. Complete os campos antes do primeiro pagamento.' : 'Os dados bancários são opcionais no primeiro cadastro.'}</div>
            <Field label="Banco" value={form.dadosBancarios.banco} onChange={v => setBank('banco', v)} error={errors.banco} {...fieldProps} />
            <Field label="Código do banco" value={form.dadosBancarios.codigoBanco} onChange={v => setBank('codigoBanco', onlyDigits(v).slice(0, 4))} inputMode="numeric" {...fieldProps} />
            <Field label="Agência" value={form.dadosBancarios.agencia} onChange={v => setBank('agencia', maskAgency(v))} error={errors.agencia} inputMode="numeric" {...fieldProps} />
            <Field label="Conta" value={form.dadosBancarios.conta} onChange={v => setBank('conta', onlyDigits(v).slice(0, 12))} error={errors.conta} inputMode="numeric" {...fieldProps} />
            <Field label="Dígito da conta" value={form.dadosBancarios.digitoConta} onChange={v => setBank('digitoConta', v.replace(/[^0-9Xx]/g, '').slice(0, 2).toUpperCase())} {...fieldProps} />
            <SelectField label="Tipo de conta" value={form.dadosBancarios.tipoConta} onChange={v => setBank('tipoConta', v)} error={errors.tipoConta} options={[['', 'Selecione'], ['corrente', 'Corrente'], ['poupanca', 'Poupança']]} {...fieldProps} />
            <SelectField label="Tipo da chave Pix" value={form.dadosBancarios.tipoChavePix} onChange={v => setBank('tipoChavePix', v)} error={errors.tipoChavePix} options={[['', 'Selecione'], ['cpf', 'CPF'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['aleatoria', 'Aleatória']]} {...fieldProps} />
            <Field label="Chave Pix" value={form.dadosBancarios.chavePix} onChange={v => setBank('chavePix', form.dadosBancarios.tipoChavePix === 'cpf' ? maskCPF(v) : form.dadosBancarios.tipoChavePix === 'telefone' ? maskPhone(v) : v)} error={errors.chavePix} {...fieldProps} />
            <Field label="Nome do titular" value={form.dadosBancarios.nomeTitular} onChange={v => setBank('nomeTitular', v)} error={errors.nomeTitular} {...fieldProps} />
            <Field label="CPF do titular" value={form.dadosBancarios.cpfTitular} onChange={v => setBank('cpfTitular', maskCPF(v))} error={errors.cpfTitular} inputMode="numeric" {...fieldProps} />
          </div>}
        </div>

        <footer className="flex flex-col gap-3 border-t px-5 py-4" style={{ borderColor: border }}>
          {!form.privacyConsent?.accepted && (
            <label className="flex items-start gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: errors.privacyConsent ? '#D95C5C' : border, color: textSub, backgroundColor: inputBg }}>
              <input type="checkbox" checked={privacyAccepted} onChange={e => { setPrivacyAccepted(e.target.checked); setErrors(current => ({ ...current, privacyConsent: '' })); }} className="mt-1 h-4 w-4 flex-shrink-0" style={{ accentColor: P }} />
              <span>{PRIVACY_CONSENT_TEXT}{errors.privacyConsent && <span className="mt-1 block text-xs text-[#D95C5C]">{errors.privacyConsent}</span>}</span>
            </label>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-xs sm:block" style={{ color: textSub }}>* Campos obrigatórios</p>
            <div className="ml-auto flex gap-2"><button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: border, color: textSub }}>Cancelar</button><button onClick={save} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: P }}><Check className="h-4 w-4" />{submitting ? 'Salvando...' : 'Salvar profissional'}</button></div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, inputBg, border, textMain, error, type = 'text', inputMode }: { label: string; value: string; onChange: (value: string) => void; inputBg: string; border: string; textMain: string; error?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold" style={{ color: textMain }}>{label}</span><input type={type} value={value} inputMode={inputMode} onChange={e => onChange(e.target.value)} aria-invalid={Boolean(error)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: error ? '#D95C5C' : border, color: textMain }} />{error && <span className="mt-1 block text-xs text-[#D95C5C]">{error}</span>}</label>;
}

function NumberField({ value, onChange, ...props }: Omit<Parameters<typeof Field>[0], 'value' | 'onChange'> & { value: number; onChange: (value: number) => void }) { return <Field {...props} type="number" value={String(value || '')} onChange={value => onChange(Math.max(0, Number(value)))} />; }
function TextArea({ label, value, onChange, inputBg, border, textMain }: { label: string; value: string; onChange: (value: string) => void; inputBg: string; border: string; textMain: string }) { return <label className="block md:col-span-2"><span className="mb-1 block text-sm font-semibold" style={{ color: textMain }}>{label}</span><textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /></label>; }
function SelectField({ label, value, onChange, options, inputBg, border, textMain, error }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; inputBg: string; border: string; textMain: string; error?: string }) { return <label className="block"><span className="mb-1 block text-sm font-semibold" style={{ color: textMain }}>{label}</span><select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: error ? '#D95C5C' : border, color: textMain }}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>{error && <span className="mt-1 block text-xs text-[#D95C5C]">{error}</span>}</label>; }
