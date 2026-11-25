import { money } from "../shared/text";

export type ReceiptItem = { name: string; option: string; price: number; qty: number };
export type Receipt = {
  code: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  note: string;
  total: number;
  items: ReceiptItem[];
};

/** La "factura" que llega al WhatsApp de la tienda. */
export function buildMessage(r: Receipt, orderUrl: string): string {
  const lines = [
    `▲ *AETHER* · Pedido #${r.code}`,
    "━━━━━━━━━━━━━━━",
    `*Cliente:* ${r.customerName}`,
    `*Teléfono:* ${r.customerPhone}`,
    `*Método de pago:* ${r.paymentMethod}`,
    "",
    "*Productos*",
    ...r.items.map((i) => `• ${i.qty} × ${i.name}${i.option ? ` (${i.option})` : ""} — ${money(i.price * i.qty)}`),
    "━━━━━━━━━━━━━━━",
    `*TOTAL: ${money(r.total)}*`,
  ];
  if (r.note) lines.push("", `*Nota:* ${r.note}`);
  if (orderUrl) lines.push("", `Ver pedido: ${orderUrl}`);
  return lines.join("\n");
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
