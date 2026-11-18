// packages/ui/src/components/layout/components/__tests__/HeaderMenu.dom.test.tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button, Dialog, DropdownMenu } from '@donotdev/components';
import { BREAKPOINT_THRESHOLDS, LanguageSelector } from '@donotdev/core';

import { landingPreset } from '../../../../internal/layout/config/presets/landing';
import { AuthHeader } from '../../../auth/AuthHeader';
import { HeaderMenu } from '../header/HeaderMenu';

const env = vi.hoisted(() => ({
  changeLanguage: vi.fn(async (_id: string) => {}),
  google: vi.fn(() => {}),
}));

// AuthHeader signed out with two OAuth providers and no password provider: its DropdownMenu path.
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useAuthConfig: () => ({}),
  getEnabledAuthPartners: () => ['google', 'github'],
}));
vi.mock('../../../../utils/useAuthVisibility', () => ({
  useAuthVisibility: () => ({
    shouldHide: false,
    isLoading: false,
    isReady: true,
    isAuthenticated: false,
  }),
}));
vi.mock('@donotdev/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/auth')>()),
  MultipleAuthProviders: () => (
    <>
      <button type="button" onClick={env.google}>
        Google
      </button>
      <button type="button">GitHub</button>
    </>
  ),
}));
// LanguageSelector with three languages: its DropdownMenu path.
vi.mock('../../../../../../core/i18n/src/utils/languageSelector', () => ({
  useLanguageSelector: () => ({
    languages: [
      { id: 'fr', nativeName: 'Français' },
      { id: 'en', nativeName: 'English' },
      { id: 'ko', nativeName: '한국어' },
    ],
    currentLanguage: 'fr',
    changeLanguage: env.changeLanguage,
    isLoading: false,
    mode: 'dropdown',
    otherLanguage: undefined,
  }),
}));
vi.mock(
  '../../../../../../core/i18n/src/hooks/useTranslation',
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  })
);

// DOM from the vitest environment (happy-dom); act() without testing-library needs the flag.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];

function mount(node: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(node));
  return container;
}

/** Mouse press: Radix menus open on pointerdown, popovers, dialogs and items act on click. */
function press(target: Element) {
  const init = {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerType: 'mouse',
  };
  act(() => {
    target.dispatchEvent(new PointerEvent('pointerdown', init));
    target.dispatchEvent(new PointerEvent('pointerup', init));
    (target as HTMLElement).click();
  });
}

const settle = () =>
  act(() => new Promise<void>((done) => setTimeout(done, 0)));

function burgerOf(container: Element): HTMLButtonElement {
  const burger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Menu"]'
  );
  if (!burger) throw new Error('Missing burger trigger');
  return burger;
}

/** The popup a trigger owns (Radix sets aria-controls while it is open). */
function popupOf(trigger: Element): HTMLElement {
  const id = trigger.getAttribute('aria-controls');
  const popup = id ? document.getElementById(id) : null;
  if (!popup) throw new Error(`No open popup for ${trigger.outerHTML}`);
  return popup;
}

function byText<T extends HTMLElement>(
  scope: Element,
  selector: string,
  text: string
): T {
  const found = [...scope.querySelectorAll<T>(selector)].find(
    (node) => node.textContent?.trim() === text
  );
  if (!found) throw new Error(`Missing ${selector} "${text}"`);
  return found;
}

const isOpen = (trigger: Element) =>
  trigger.getAttribute('aria-expanded') === 'true';

function openBurger(container: Element) {
  const burger = burgerOf(container);
  press(burger);
  expect(isOpen(burger)).toBe(true);
  return { burger, panel: popupOf(burger) };
}

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount();
  });
  document.body.replaceChildren();
  env.changeLanguage.mockClear();
  env.google.mockClear();
});

describe('HeaderMenu collapse (CSS only)', () => {
  it('renders the inline controls and the burger in the server HTML', () => {
    const html = renderToString(
      <HeaderMenu className="extra-trigger-class">
        <Button>Account</Button>
        <Button>Language</Button>
      </HeaderMenu>
    );
    expect(html).toMatch(
      /class="dndev-header-menu-inline"[^>]*>.*Account.*Language/
    );
    expect(html).toMatch(/class="dndev-header-menu-burger"/);
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('extra-trigger-class');
    // Hamburger icon, not the former three dots.
    expect(html).toContain('lucide-menu');
    expect(html).not.toMatch(/lucide-(ellipsis|more-horizontal)/);
  });

  it('switches at the useBreakpoint("isMobileOrTablet") split', () => {
    const css = readFileSync(
      resolve(__dirname, '../header/HeaderMenu.css'),
      'utf-8'
    );
    // isMobileOrTablet ⇔ width < BREAKPOINT_THRESHOLDS.laptop (getBreakpointFromWidth).
    expect(css).toContain(`@media (width < ${BREAKPOINT_THRESHOLDS.laptop}px)`);
    expect(css.match(/@media \(/g)).toHaveLength(1);
    expect(css).toMatch(/\.dndev-header-menu-inline\s*{\s*display: contents;/);
    expect(css).toMatch(/\.dndev-header-menu-burger\s*{\s*display: none;/);
  });
});

describe('HeaderMenu nested popups', () => {
  it('opens an account DropdownMenu inside the burger and runs its item', () => {
    const onOrders = vi.fn(() => {});
    const container = mount(
      <HeaderMenu>
        <DropdownMenu
          contentAlign="end"
          trigger={<Button>Account</Button>}
          items={[{ label: 'Orders', onClick: onOrders }]}
        />
      </HeaderMenu>
    );
    const { burger, panel } = openBurger(container);
    const account = byText(panel, 'button', 'Account');
    press(account);
    expect(isOpen(account)).toBe(true);
    expect(isOpen(burger)).toBe(true);
    press(byText(popupOf(account), '[role="menuitem"]', 'Orders'));
    expect(onOrders).toHaveBeenCalledTimes(1);
    // A choice in a nested menu ends the interaction, as a burger item does.
    expect(isOpen(burger)).toBe(false);
  });

  it('opens the LanguageSelector dropdown inside the burger and changes language', () => {
    const container = mount(
      <HeaderMenu>
        <LanguageSelector display="compact" variant="ghost" />
      </HeaderMenu>
    );
    const { burger, panel } = openBurger(container);
    const language = panel.querySelector<HTMLButtonElement>(
      'button[aria-label="Change Language"]'
    );
    if (!language) throw new Error('Missing language trigger');
    press(language);
    expect(isOpen(language)).toBe(true);
    expect(isOpen(burger)).toBe(true);
    press(byText(popupOf(language), '[role="menuitem"]', 'English'));
    expect(env.changeLanguage).toHaveBeenCalledWith('en');
    expect(isOpen(burger)).toBe(false);
  });

  it('opens the AuthHeader OAuth provider menu inside the burger and signs in', async () => {
    const container = mount(
      <HeaderMenu>
        <AuthHeader />
      </HeaderMenu>
    );
    const { burger, panel } = openBurger(container);
    const signIn = byText(panel, 'button', 'Sign In');
    press(signIn);
    expect(isOpen(signIn)).toBe(true);
    expect(isOpen(burger)).toBe(true);
    // MultipleAuthProviders is lazy-loaded.
    await settle();
    press(byText(popupOf(signIn), 'button', 'Google'));
    expect(env.google).toHaveBeenCalledTimes(1);
    expect(isOpen(burger)).toBe(false);
  });

  it('keeps a Dialog opened from the burger mounted and usable', () => {
    const onSubmit = vi.fn(() => {});
    const container = mount(
      <HeaderMenu>
        <Dialog trigger={<Button>Email sign-in</Button>} title="Sign in">
          <Button onClick={onSubmit}>Submit</Button>
        </Dialog>
      </HeaderMenu>
    );
    const { burger, panel } = openBurger(container);
    const trigger = byText(panel, 'button', 'Email sign-in');
    press(trigger);
    expect(isOpen(trigger)).toBe(true);
    expect(isOpen(burger)).toBe(true);
    press(byText(popupOf(trigger), 'button', 'Submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(isOpen(trigger)).toBe(true);
    expect(isOpen(burger)).toBe(true);
  });

  it('runs a plain control once and closes the burger', () => {
    const onToggle = vi.fn(() => {});
    const container = mount(
      <HeaderMenu>
        <Button onClick={onToggle}>Theme</Button>
      </HeaderMenu>
    );
    const { burger, panel } = openBurger(container);
    press(byText(panel, 'button', 'Theme'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(isOpen(burger)).toBe(false);
  });
});

describe('landing preset', () => {
  it('wraps the desktop header controls in HeaderMenu in its mobile header only', () => {
    const mobileEnd = landingPreset.mobile?.header?.end;
    const desktopHeader = landingPreset.header;
    if (
      typeof mobileEnd !== 'function' ||
      !desktopHeader ||
      typeof desktopHeader === 'function'
    ) {
      throw new Error('Landing preset header shape changed');
    }
    const burger = mobileEnd() as ReactElement<{ children: ReactNode }>;
    expect(isValidElement(burger) && burger.type).toBe(HeaderMenu);
    const desktopEnd = (
      desktopHeader.end as () => ReactElement<{ children: ReactNode }>
    )();
    const typesOf = (element: ReactElement<{ children: ReactNode }>) =>
      Children.toArray(element.props.children).map(
        (child) => isValidElement(child) && child.type
      );
    expect(typesOf(burger)).toEqual(typesOf(desktopEnd));
    expect(typesOf(desktopEnd)).not.toContain(HeaderMenu);
  });
});
