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

module.exports = router;
