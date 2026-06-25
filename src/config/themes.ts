export interface EntityTheme {
  primary: string;
  primaryLight: string;
  primaryHover: string;
  accent: string;
  label: string;
}

export const ENTITY_THEMES: Record<string, EntityTheme> = {
  'Groupe Horizon': {
    primary:      '#003366',
    primaryLight: '#0057b8',
    primaryHover: '#002244',
    accent:       '#e8a000',
    label:        'Horizon',
  },
  'Horizon France': {
    primary:      '#b22222',
    primaryLight: '#d94040',
    primaryHover: '#8b1a1a',
    accent:       '#e67e22',
    label:        'Horizon France',
  },
  'Horizon Rail': {
    primary:      '#5a3e8a',
    primaryLight: '#7b5cbb',
    primaryHover: '#42296a',
    accent:       '#f39c12',
    label:        'Horizon Rail',
  },
  'Horizon Nord': {
    primary:      '#1a5276',
    primaryLight: '#2980b9',
    primaryHover: '#154360',
    accent:       '#27ae60',
    label:        'Horizon Nord',
  },
  'Horizon Sud': {
    primary:      '#1a6b34',
    primaryLight: '#27ae60',
    primaryHover: '#145228',
    accent:       '#f39c12',
    label:        'Horizon Sud',
  },
};

const DEFAULT_THEME: EntityTheme = ENTITY_THEMES['Groupe Horizon'];

export function applyEntityTheme(entite: string): void {
  const theme = ENTITY_THEMES[entite] ?? DEFAULT_THEME;
  const root = document.documentElement;
  root.style.setProperty('--primary',       theme.primary);
  root.style.setProperty('--primary-light', theme.primaryLight);
  root.style.setProperty('--primary-hover', theme.primaryHover);
  root.style.setProperty('--accent',        theme.accent);
}
