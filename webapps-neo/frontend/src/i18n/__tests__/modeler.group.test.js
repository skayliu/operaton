import { describe, it, expect } from 'vitest';
import zhCN from '../../../public/locales/zh-CN/translation.json';
import zhTW from '../../../public/locales/zh-TW/translation.json';
import enUS from '../../../public/locales/en-US/translation.json';
import deDE from '../../../public/locales/de-DE/translation.json';

describe('modeler.group translations', () => {
  const languages = [
    { code: 'zh-CN', translations: zhCN },
    { code: 'zh-TW', translations: zhTW },
    { code: 'en-US', translations: enUS },
    { code: 'de-DE', translations: deDE },
  ];

  const keys = ['file', 'edit', 'navigate'];

  const pick_keys = ['new', 'lead', 'bpmn-title', 'bpmn-text'];

  languages.forEach(({ code, translations }) => {
    it(`${code} should have all modeler.group.* keys`, () => {
      const group = translations?.modeler?.group;
      expect(group).toBeDefined();

      keys.forEach((key) => {
        expect(group[key]).toBeDefined();
        expect(group[key]).not.toBe('');
      });
    });

    it(`${code} should have all modeler.pick.* keys`, () => {
      const pick = translations?.modeler?.pick;
      expect(pick).toBeDefined();

      pick_keys.forEach((key) => {
        expect(pick[key]).toBeDefined();
        expect(pick[key]).not.toBe('');
      });
    });
  });
});