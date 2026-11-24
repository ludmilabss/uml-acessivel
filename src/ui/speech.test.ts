// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { isSpeechSupported, speak, stopSpeaking } from './speech';
import { installSpeechMock, removeSpeechMock } from './speechMock';

afterEach(removeSpeechMock);

describe('speech', () => {
  it('fala em português, na velocidade pedida, com o ajuste de pronúncia', () => {
    const { spoken } = installSpeechMock();
    speak('Entidade: ITEM_PEDIDO.', 1.5);

    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: 'Entidade: ITEM PEDIDO.', lang: 'pt-BR', rate: 1.5 });
  });

  it('interrompe a fala anterior antes de falar a próxima', () => {
    const { synthesis } = installSpeechMock();
    speak('primeiro', 1);
    speak('segundo', 1);
    expect(synthesis.cancel).toHaveBeenCalledTimes(2);
  });

  it('prefere uma voz em português do Brasil', () => {
    const { spoken } = installSpeechMock([
      { lang: 'en-US', name: 'Samantha' },
      { lang: 'pt-PT', name: 'Joana' },
      { lang: 'pt-BR', name: 'Luciana' },
    ]);
    speak('olá', 1);
    expect(spoken[0].voice?.name).toBe('Luciana');
  });

  it('não faz nada quando o navegador não tem síntese de voz', () => {
    expect(isSpeechSupported()).toBe(false);
    expect(() => {
      speak('olá', 1);
      stopSpeaking();
    }).not.toThrow();
  });
});
