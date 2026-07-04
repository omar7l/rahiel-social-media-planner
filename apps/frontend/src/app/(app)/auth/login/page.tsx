export const dynamic = 'force-dynamic';
import { Login } from '@gitroom/frontend/components/auth/login';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Rahiel Studios - Social Media Planner Login',
  description: 'Sign in to the Rahiel Studios social media planning workspace.',
};
export default async function Auth() {
  return <Login />;
}
