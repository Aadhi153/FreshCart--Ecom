import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Order } from '@freshcart/types';

const PAGE_WIDTH = 595; // A4 width in points
const PAGE_HEIGHT = 842;
const MARGIN = 50;

function money(n: number | null | undefined) {
  return `Rs.${Number(n ?? 0).toFixed(2)}`;
}

export async function generateInvoicePdf(order: Order): Promise<Blob> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);

  const draw = (text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    page.drawText(text, {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? black,
    });
  };

  draw('FreshCart', { size: 22, bold: true });
  y -= 18;
  draw('Tax Invoice', { size: 12, color: gray });
  y -= 30;

  const shortId = (order.id || '').slice(0, 8).toUpperCase();
  draw(`Order #${shortId}`, { bold: true, size: 12 });
  y -= 16;
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  draw(`Date: ${orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { color: gray });
  y -= 14;
  draw(`Payment method: ${order.payment_method || 'N/A'}`, { color: gray });
  y -= 24;

  const address = (order as any).delivery_address || (order as any).deliveryAddress;
  if (address) {
    draw('Delivered to:', { bold: true });
    y -= 14;
    const addressLine = [address.fullName, address.line1, address.line2, address.city, address.pincode]
      .filter(Boolean)
      .join(', ');
    draw(addressLine || '-', { color: gray, size: 9 });
    y -= 24;
  }

  // Table header
  draw('Item', { bold: true, x: MARGIN });
  draw('Qty', { bold: true, x: 340 });
  draw('Price', { bold: true, x: 400 });
  draw('Total', { bold: true, x: 480 });
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: gray });
  y -= 16;

  const items = order.order_items || order.items || [];
  for (const item of items as any[]) {
    const name = item.products?.name || item.name || 'Item';
    const qty = item.quantity ?? 1;
    const price = Number(item.price_at_time ?? item.price ?? 0);
    const lineTotal = item.is_gift ? 0 : price * qty;

    if (y < 100) {
      y = PAGE_HEIGHT - MARGIN;
      doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }

    draw(name.length > 45 ? `${name.slice(0, 45)}…` : name, { x: MARGIN, size: 9 });
    draw(String(qty), { x: 340, size: 9 });
    draw(item.is_gift ? 'Free' : money(price), { x: 400, size: 9 });
    draw(item.is_gift ? 'Free' : money(lineTotal), { x: 480, size: 9 });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: 340, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: gray });
  y -= 18;

  if (order.discount_amount && order.discount_amount > 0) {
    draw('Discount', { x: 400, color: gray, size: 9 });
    draw(`-${money(order.discount_amount)}`, { x: 480, color: gray, size: 9 });
    y -= 16;
  }
  draw('Delivery fee', { x: 400, color: gray, size: 9 });
  draw(order.delivery_fee ? money(order.delivery_fee) : 'Free', { x: 480, color: gray, size: 9 });
  y -= 18;

  draw('Total Paid', { x: 400, bold: true, size: 11 });
  draw(money(order.total_amount), { x: 480, bold: true, size: 11 });

  const bytes = await doc.save();
  // pdf-lib's Uint8Array<ArrayBufferLike> doesn't structurally satisfy DOM's
  // BlobPart (which wants ArrayBuffer, not the broader ArrayBufferLike) — the
  // underlying buffer from a freshly-allocated Uint8Array is always a real
  // ArrayBuffer in practice, so this cast is safe.
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function downloadInvoice(order: Order) {
  const blob = await generateInvoicePdf(order);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `freshcart-invoice-${(order.id || '').slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
