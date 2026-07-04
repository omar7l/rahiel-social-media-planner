import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Register } from '@gitroom/frontend/components/auth/register';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import Link from 'next/link';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { LoginWithOidc } from '@gitroom/frontend/components/auth/login.with.oidc';
import { cookies } from 'next/headers';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Register`,
  description: '',
};
export default async function Auth(params: {
  searchParams: Promise<{provider?: string; org?: string}>;
}) {
  const t = await getT();
  const searchParams = await params?.searchParams;
  const inviteCookie = (await cookies()).get('org')?.value;
  const hasInvite = Boolean(searchParams?.org || inviteCookie);
  if (process.env.DISABLE_REGISTRATION === 'true') {
    const canRegister = (
      await (await internalFetch('/auth/can-register')).json()
    ).register;
    if (!canRegister && !searchParams?.provider && !hasInvite) {
      return (
        <>
          <LoginWithOidc />
          <div className="text-center">
            {t('registration_is_disabled', 'Registration is disabled')}
            <br />
            <Link className="underline hover:font-bold" href="/auth/login">
              {t('login_instead', 'Login instead')}
            </Link>
          </div>
        </>
      );
    }
  }
  return <Register />;
}
