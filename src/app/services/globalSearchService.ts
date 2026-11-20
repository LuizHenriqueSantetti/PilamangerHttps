import { SystemPermissions } from '../utils/permissions';
import { onlyDigits } from '../utils/masks';
import { professionalService } from './professionalService';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  module: 'pacientes' | 'equipe';
  category: 'Alunos' | 'Professores' | 'Fisioterapeutas';
}

function readPatients(): any[] {
  try { return JSON.parse(localStorage.getItem('pacientes') || '[]'); } catch { return []; }
}

function matchesPerson(person: any, query: string): boolean {
  const text = query.trim().toLocaleLowerCase();
  const digits = onlyDigits(query);
  const textValues = [person.nome, person.name, person.email].filter(Boolean).map(String);
  const numericValues = [person.cpf, person.telefone, person.phone].filter(Boolean).map((value: unknown) => onlyDigits(String(value)));
  return textValues.some(value => value.toLocaleLowerCase().includes(text)) || Boolean(digits && numericValues.some(value => value.includes(digits)));
}

export const globalSearchService = {
  search(query: string, perms: SystemPermissions, limit = 15): SearchResult[] {
    if (query.trim().length < 2) return [];
    const results: SearchResult[] = [];
    if (perms.pacientes.visualizar) {
      readPatients().filter(item => matchesPerson(item, query)).forEach(item => results.push({
        id: String(item.id ?? item.email ?? item.nome), title: item.nome || item.name || 'Aluno',
        subtitle: item.email || item.telefone || item.cpf || 'Aluno', module: 'pacientes', category: 'Alunos',
      }));
    }
    if (perms.equipe.visualizar) {
      professionalService.list({ includeInactive: true }).filter(item => matchesPerson(item, query)).forEach(item => results.push({
        id: item.id, title: item.nome, subtitle: item.email || item.telefone || item.cpf,
        module: 'equipe', category: item.tipo === 'professor' ? 'Professores' : 'Fisioterapeutas',
      }));
    }
    return results.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)).slice(0, limit);
  },
};
