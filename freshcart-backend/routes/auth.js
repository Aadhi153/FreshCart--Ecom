const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone },
      },
    });
    if (error) throw error;
    res.status(201).json({ message: 'Registration successful. Check your email to confirm.', user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ session: data.session, user: data.user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/otp/send — send OTP to phone
router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/otp/verify — verify OTP
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ error: 'Phone and token required' });
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    res.json({ session: data.session, user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/me — get current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Profile not found' });
  }
});

// PATCH /api/auth/me — update profile
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, notification_preferences } = req.body;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, phone, notification_preferences, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (_req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/auth/me — permanently delete the caller's own account.
// profiles.id -> auth.users(id) ON DELETE CASCADE removes the profile row too;
// orders.user_id -> profiles(id) ON DELETE SET NULL keeps order history intact
// (just unlinked from any identity), which is the right behavior for an
// e-commerce app's accounting/records — see 00000_schema_and_seed.sql.
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/me/referrals — count + light list of profiles this user referred,
// plus the current referral-reward config and this user's actual total earned from
// the referral_reward_ledger (see 00034_referral_rewards.sql). Needs supabaseAdmin:
// a customer's own RLS policy only lets them read their own profile row, not other
// customers' rows filtered by referred_by, nor other users' ledger rows.
//
// NOTE: referral_rewards_config currently has no admin UI to set non-zero amounts,
// and nothing yet inserts rows into referral_reward_ledger — see that migration's
// header comment. Until that's built this honestly returns zero amounts/tiers
// rather than fabricating numbers.
router.get('/me/referrals', requireAuth, async (req, res) => {
  try {
    const [referralsResult, configResult, ledgerResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('full_name, created_at')
        .eq('referred_by', req.user.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('referral_rewards_config').select('*').eq('id', 1).maybeSingle(),
      supabaseAdmin.from('referral_reward_ledger').select('amount').eq('user_id', req.user.id),
    ]);
    if (referralsResult.error) throw referralsResult.error;
    if (configResult.error) throw configResult.error;
    if (ledgerResult.error) throw ledgerResult.error;

    const totalEarned = (ledgerResult.data || []).reduce((sum, row) => sum + Number(row.amount), 0);

    res.json({
      count: referralsResult.data.length,
      referrals: referralsResult.data,
      totalEarned,
      config: configResult.data && {
        referrerRewardAmount: Number(configResult.data.referrer_reward_amount),
        referredRewardAmount: Number(configResult.data.referred_reward_amount),
        currency: configResult.data.currency,
        tiers: configResult.data.tiers || [],
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
