import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';

const PUBLIC_PATHS = ['/', '/api/auth/login', '/api/auth/logout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get('session')?.value;
  context.locals.user = null;

  if (token) {
    const session = getSession(token);
    if (session) {
      context.locals.user = session;
    }
  }

  const url = new URL(context.request.url);
  const isPublic = PUBLIC_PATHS.some(p => url.pathname === p);

  if (!context.locals.user && !isPublic) {
    return context.redirect('/');
  }

  // Already logged in and visiting login page → redirect to /stores
  if (context.locals.user && url.pathname === '/') {
    return context.redirect('/stores');
  }

  // Admin-only routes
  const isAdminRoute =
    url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin');
  if (isAdminRoute && context.locals.user?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  return next();
});
