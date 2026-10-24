// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Register } from '../../apps/frontend/src/components/auth/register';

const fixture = vi.hoisted(() => ({
  query: 'provider=GOOGLE&code=one-use-code&state=login-browser-nonce',
  fetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(fixture.query),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) =>
    React.createElement('a', props, children),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => fixture.fetch,
}));
vi.mock('@gitroom/react/translation/get.transation.service.client', () => ({
  useT: () => (_key: string, fallback: string) => fallback,
}));
vi.mock('@gitroom/react/helpers/variable.context', () => ({
  useVariables: () => ({ isGeneral: true }),
}));
vi.mock('@gitroom/frontend/components/layout/loading', () => ({
  LoadingComponent: () =>
    React.createElement('div', { role: 'status' }, 'Signing in'),
}));
vi.mock('@gitroom/react/form/button', () => ({
  Button: ({ children }: any) => React.createElement('button', null, children),
}));
vi.mock('@gitroom/react/form/input', () => ({ Input: () => null }));
vi.mock('@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto', () => ({
  CreateOrgUserDto: class {},
}));
vi.mock('@gitroom/helpers/utils/use.fire.events', () => ({
  useFireEvents: () => vi.fn(),
}));
vi.mock('@gitroom/react/helpers/use.track', () => ({
  useTrack: () => vi.fn(),
}));
vi.mock('@gitroom/frontend/components/auth/providers/github.provider', () => ({
  GithubProvider: () => null,
}));
vi.mock('@gitroom/frontend/components/auth/providers/google.provider', () => ({
  GoogleProvider: () => null,
}));
vi.mock('@gitroom/frontend/components/auth/providers/oauth.provider', () => ({
  OauthProvider: () => null,
}));
vi.mock(
  '@gitroom/frontend/components/auth/providers/farcaster.provider',
  () => ({ FarcasterProvider: () => null })
);
vi.mock(
  '@gitroom/frontend/components/auth/providers/placeholder/wallet.ui.provider',
  () => ({ WalletUiProvider: () => null })
);

describe('OAuth login callback', () => {
  beforeEach(() => {
    fixture.query =
      'provider=GOOGLE&code=one-use-code&state=login-browser-nonce';
    fixture.fetch.mockReset();
  });
  afterEach(cleanup);

  it('sends the returned state together with the code so the backend can verify this browser', async () => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify({ login: true }))
    );
    render(React.createElement(Register));
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledOnce());
    const [url, options] = fixture.fetch.mock.calls[0];
    expect(url).toBe('/auth/oauth/GOOGLE/exists');
    expect(JSON.parse(options.body)).toEqual({
      code: 'one-use-code',
      state: 'login-browser-nonce',
    });
  });

  it('replaces the spinner with a fresh-login link when the callback is rejected', async () => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid state' }), {
        status: 500,
      })
    );
    const page = render(React.createElement(Register));
    await waitFor(() => expect(page.queryByRole('alert')).not.toBeNull());
    expect(page.queryByRole('status')).toBeNull();
    expect(
      page.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')
    ).toBe('/auth/login');
  });

  it('exchanges a single-use code only once when React replays mount effects', async () => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify({ login: true }))
    );
    render(
      React.createElement(React.StrictMode, null, React.createElement(Register))
    );
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledOnce());
  });
});
