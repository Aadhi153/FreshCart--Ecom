const { supabaseAdmin } = require('../supabaseClient');

const STATUS_MESSAGES = {
  placed: 'Your order has been placed.',
  packed: 'Your order has been packed and is ready for dispatch.',
  shipped: 'Your order is on its way!',
  delivered: 'Your order has been delivered. Enjoy!',
  cancelled: 'Your order has been cancelled.',
};

// Best-effort: a notification failing to write should never break the order flow
// that triggered it, so callers fire this without awaiting it.
async function notifyOrderStatus(order) {
  try {
    const shortId = String(order.id).slice(0, 8).toUpperCase();
    await supabaseAdmin.from('notifications').insert([{
      user_id: order.user_id,
      title: `Order #${shortId}: ${order.status}`,
      body: STATUS_MESSAGES[order.status] || `Your order status changed to ${order.status}.`,
      link: `/orders`,
    }]);
  } catch (err) {
    console.error('Failed to create order status notification:', err.message);
  }
}

const RETURN_STATUS_MESSAGES = {
  requested: 'has been received and is awaiting review.',
  approved: 'has been approved.',
  rejected: 'was not approved.',
  picked_up: 'item has been picked up.',
  completed: 'has been completed.',
};

// Same best-effort, fire-and-forget contract as notifyOrderStatus above.
async function notifyReturnStatus(returnRequest) {
  try {
    const label = returnRequest.type === 'replace' ? 'Replacement' : 'Return';
    await supabaseAdmin.from('notifications').insert([{
      user_id: returnRequest.user_id,
      title: `${label} request: ${returnRequest.status}`,
      body: `Your ${label.toLowerCase()} request ${RETURN_STATUS_MESSAGES[returnRequest.status] || `status changed to ${returnRequest.status}.`}`,
      link: `/orders`,
    }]);
  } catch (err) {
    console.error('Failed to create return status notification:', err.message);
  }
}

module.exports = { notifyOrderStatus, notifyReturnStatus };
