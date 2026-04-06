import type { APIRoute } from 'astro';
import { findUser } from '../../../lib/auth';
import { createSession } from '../../../lib/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = formData.get('username')?.toString().trim() ?? '';
  const password = formData.get('password')?.toString() ?? '';

  if (!username || !password) {
    return redirect('/?error=required');
  }

  const user = await findUser(username, password);
  if (!user) {
    return redirect('/?error=invalid');
  }

  const token = createSession({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return redirect('/stores');
};
