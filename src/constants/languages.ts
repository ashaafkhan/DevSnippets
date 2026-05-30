export interface LanguageConfig {
  name: string;
  short: string;
  bg: string;
  text: string;
}

export const languages: Record<string, LanguageConfig> = {
  'JavaScript': { name: 'JavaScript', short: 'JS', bg: '#F7DF1E', text: '#000000' },
  'TypeScript': { name: 'TypeScript', short: 'TS', bg: '#3178C6', text: '#FFFFFF' },
  'Python': { name: 'Python', short: 'PY', bg: '#3776AB', text: '#FFFFFF' },
  'CSS': { name: 'CSS', short: 'CSS', bg: '#1572B6', text: '#FFFFFF' },
  'SQL': { name: 'SQL', short: 'SQL', bg: '#4479A1', text: '#FFFFFF' },
  'HTML': { name: 'HTML', short: 'HTML', bg: '#E34F26', text: '#FFFFFF' },
  'React': { name: 'React', short: 'RXT', bg: '#61DAFB', text: '#000000' },
  'Shell': { name: 'Shell', short: 'SH', bg: '#4EAA25', text: '#FFFFFF' },
  'Rust': { name: 'Rust', short: 'RS', bg: '#DE5833', text: '#FFFFFF' },
  'Go': { name: 'Go', short: 'GO', bg: '#00ADD8', text: '#FFFFFF' },
};

export const languageList = Object.keys(languages);

export const getLanguageConfig = (name: string): LanguageConfig => {
  return languages[name] || { name, short: name.slice(0, 2).toUpperCase(), bg: '#475569', text: '#FFFFFF' };
};
