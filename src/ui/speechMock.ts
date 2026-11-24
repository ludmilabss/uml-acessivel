import { vi } from 'vitest';

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: { lang: string; name: string } | null;
}

/** Instala uma Web Speech API falsa no jsdom e devolve o que foi "falado". */
export function installSpeechMock(voices: { lang: string; name: string }[] = []) {
  const spoken: FakeUtterance[] = [];
  const synthesis = {
    speaking: false,
    speak: vi.fn((utterance: FakeUtterance) => {
      spoken.push(utterance);
    }),
    cancel: vi.fn(),
    getVoices: () => voices,
  };
  class Utterance implements FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: FakeUtterance['voice'] = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  Object.assign(window, { speechSynthesis: synthesis, SpeechSynthesisUtterance: Utterance });
  return { synthesis, spoken, lastText: () => spoken.at(-1)?.text };
}

export function removeSpeechMock() {
  const target = window as unknown as Record<string, unknown>;
  delete target.speechSynthesis;
  delete target.SpeechSynthesisUtterance;
}
