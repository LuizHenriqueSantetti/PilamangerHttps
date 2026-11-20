import { describe, expect, it } from 'vitest';
import { categoryLabels, MANUAL_TOPICS } from '../src/app/manual/manualContent';

describe('conteúdo do Manual', () => {
  it('cobre todos os módulos documentados com conteúdo completo nos três idiomas', () => {
    const languages = ['pt', 'en', 'es'] as const;
    expect(new Set(MANUAL_TOPICS.map(topic => topic.category))).toEqual(new Set(Object.keys(categoryLabels)));
    for (const topic of MANUAL_TOPICS) for (const language of languages) {
      expect(topic.title[language].trim()).not.toBe('');
      expect(topic.summary[language].trim()).not.toBe('');
      expect(topic.steps[language].length).toBeGreaterThanOrEqual(3);
      expect(topic.notes[language].trim()).not.toBe('');
      expect(topic.unavailable[language].trim()).not.toBe('');
      expect(topic.permission[language].trim()).not.toBe('');
    }
  });
});
