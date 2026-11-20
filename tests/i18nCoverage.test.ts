import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return entry.name === 'ui' || entry.name === 'i18n' ? [] : sourceFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('cobertura das traduções', () => {
  it('possui inglês e espanhol para textos JSX estáticos e atributos visíveis', () => {
    const translationSource = readFileSync(join(process.cwd(), 'src', 'app', 'i18n', 'I18nProvider.tsx'), 'utf8');
    const dictionary = Object.fromEntries([...translationSource.matchAll(/^\s*'([^']+)':\s*\{\s*en:\s*'([^']*)',\s*es:\s*'([^']*)'/gm)].map(match => [match[1], { en: match[2], es: match[3] }]));
    const excluded = /^(PilaManager 2\.1|[^\s@]+@[^\s@]+|Ex: CREFITO-|âš|=.*|void;)/;
    const missing = new Set<string>();
    for (const file of sourceFiles(join(process.cwd(), 'src', 'app'))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/>([^<>{}\r\n]*[A-Za-zÀ-ÿ][^<>{}\r\n]*)</g)) {
        const text = match[1].trim();
        if (text && !excluded.test(text) && !dictionary[text]) missing.add(text);
      }
      for (const match of source.matchAll(/(?:placeholder|title|aria-label)="([^"]*[A-Za-zÀ-ÿ][^"]*)"/g)) {
        const text = match[1].trim();
        if (text && !excluded.test(text) && !dictionary[text]) missing.add(text);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('mantém tradução dinâmica e fallback seguro centralizados', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'i18n', 'I18nProvider.tsx'), 'utf8');
    expect(source).toContain('este horário possui');
    expect(source).toContain('return value;');
  });
});
