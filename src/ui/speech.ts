import { forSpeech } from './pronunciation';

/** Velocidades oferecidas; 1 é a velocidade normal da voz. */
export const SPEECH_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/** Prefere uma voz em português do Brasil; senão, qualquer português; senão, a padrão. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === 'pt-br') ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('pt'))
  );
}

/**
 * Fala o texto, interrompendo o que estiver sendo falado: ao mudar de item, a fala anterior
 * não deve acumular. Usa o mesmo ajuste de pronúncia do leitor de tela.
 */
export function speak(text: string, rate: number): void {
  if (!isSpeechSupported() || text.trim() === '') {
    return;
  }
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(forSpeech(text));
  utterance.lang = 'pt-BR';
  utterance.rate = rate;
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
  }
  synthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}
