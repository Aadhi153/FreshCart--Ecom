const { supabase, supabaseAdmin } = require('../supabaseClient');

/**
 * Middleware: Verify Supabase JWT from Authorization header.
 * Sets req.user if valid, otherwise returns 401.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
}

/**
 * Middleware: like requireAuth, but a missing/invalid token sets req.user = null and
 * continues instead of 401ing. Used by routes that personalize their response for a
 * logged-in shopper (e.g. filtering out promotions they don't qualify for) but must
 * still serve logged-out/guest traffic.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  req.user = error ? null : user;
  next();
}

/**
 * Middleware: Verify user has admin role (stored in user metadata).
 */
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
