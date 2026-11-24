/**
 * Preferências de quem usa a aplicação, salvas no navegador.
 * O armazenamento pode estar bloqueado (ex.: janela anônima): aí a escolha vale só nesta visita.
 */

export type Theme = 'default' | 'contrast';

export const themeNames: Readonly<Record<Theme, string>> = {
  default: 'Padrão',
  contrast: 'Alto contraste',
};

const THEME_KEY = 'uml-acessivel:tema';
const SHOW_PREVIEW_KEY = 'uml-acessivel:mostrar-visualizacao';
const ENLARGE_PREVIEW_KEY = 'uml-acessivel:ampliar-desenho';
const VOICE_KEY = 'uml-acessivel:voz';
const VOICE_RATE_KEY = 'uml-acessivel:velocidade-voz';

/** Tema salvo; se não houver, segue a preferência de contraste do sistema operacional. */
export function loadTheme(): Theme {
  const saved = readSetting(THEME_KEY);
  if (saved === 'default' || saved === 'contrast') {
    return saved;
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
  writeSetting(THEME_KEY, theme);
}

/** O painel de visualização começa visível; fica oculto só se a pessoa escolheu ocultar. */
export function loadShowPreview(): boolean {
  return readSetting(SHOW_PREVIEW_KEY) !== 'false';
}

export function saveShowPreview(show: boolean): void {
  writeSetting(SHOW_PREVIEW_KEY, String(show));
}

/** O desenho começa no tamanho normal; fica ampliado só se a pessoa escolheu ampliar. */
export function loadEnlargePreview(): boolean {
  return readSetting(ENLARGE_PREVIEW_KEY) === 'true';
}

export function saveEnlargePreview(enlarge: boolean): void {
  writeSetting(ENLARGE_PREVIEW_KEY, String(enlarge));
}

/**
 * A voz começa desligada: quem usa leitor de tela já ouve a narração por ele, e duas vozes
 * ao mesmo tempo atrapalham. Ela serve para quem enxerga pouco e não usa leitor de tela.
 */
export function loadVoiceEnabled(): boolean {
  return readSetting(VOICE_KEY) === 'true';
}

export function saveVoiceEnabled(enabled: boolean): void {
  writeSetting(VOICE_KEY, String(enabled));
}

export function loadVoiceRate(allowed: readonly number[]): number {
  const saved = Number(readSetting(VOICE_RATE_KEY));
  return allowed.includes(saved) ? saved : 1;
}

export function saveVoiceRate(rate: number): void {
  writeSetting(VOICE_RATE_KEY, String(rate));
}

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento, a escolha vale só nesta visita.
  }
}
