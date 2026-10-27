// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(cleanup);

/** Roda o axe-core na página. O contraste de cor não é medido no jsdom (fica para o teste manual). */
async function axeViolations(container: Element) {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe('acessibilidade (axe-core)', () => {
  it('não tem violações com o diagrama de exemplo', async () => {
    const { container } = render(<App />);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('não tem violações com a lista de erros aberta', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const editor = screen.getByRole('textbox', { name: 'Código do diagrama (erDiagram)' });

    await user.clear(editor);
    await user.click(editor);
    await user.paste('erDiagram\n  CLIENTE ||..o{ PEDIDO');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await axeViolations(container)).toEqual([]);
  });
});
