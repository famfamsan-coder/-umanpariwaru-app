import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/session';

export const GET: APIRoute = ({ cookies, redirect }) => {
  const token = cookies.get('session')?.value;
  if (token) deleteSession(token);
  cookies.delete('session', { path: '/' });
  return redirect('/');
};
