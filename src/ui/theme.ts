export type Theme = 'default' | 'contrast';

export const themeNames: Readonly<Record<Theme, string>> = {
  default: 'Padrão',
  contrast: 'Alto contraste',
};

const STORAGE_KEY = 'uml-acessivel:tema';

/** Tema salvo; se não houver, segue a preferência de contraste do sistema operacional. */
export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'default' || saved === 'contrast') {
      return saved;
    }
  } catch {
    // Armazenamento bloqueado (ex.: janela anônima): segue sem tema salvo.
  }

  try {
    if (window.matchMedia?.('(prefers-contrast: more)').matches) {
      return 'contrast';
    }
  } catch {
    // matchMedia indisponível: usa o tema padrão.
  }
  return 'default';
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sem armazenamento, o tema vale só nesta visita.
  }
}
