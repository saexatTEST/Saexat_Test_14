import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Printer, X, Receipt as ReceiptIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useI18n } from '@/hooks/useI18n';
import type { Booking } from '@/types/hotel';
import { formatPrice } from '@/lib/formatPrice';

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  guestFullName: string;
  roomNumber: number;
  nights: number;
  checkInTime: string;
  checkOutTime: string;
  paymentTypeLabel: string;
  paymentTimingLabel: string;
  paymentAmount: string;
  categoryLabel?: string;
  payments?: NonNullable<Booking['payments']>;
  totalAmount?: number;
}

const safeFmt = (iso?: string, pat = 'dd.MM.yyyy') => {
  if (!iso) return '—';
  try { return format(parseISO(iso), pat); } catch { return '—'; }
};

export function HotelReceiptModal({
  open, onClose, booking, guestFullName, roomNumber, nights,
  checkInTime, checkOutTime, paymentTypeLabel, paymentTimingLabel,
  paymentAmount, categoryLabel, payments, totalAmount,
}: ReceiptModalProps) {
  const { lang } = useI18n();
  const L = (ru: string, en: string, uz?: string) =>
    lang === 'ru' ? ru : lang === 'uz' ? (uz ?? en) : en;
  const history = payments && payments.length ? payments : (booking?.payments ?? []);
  const total = totalAmount && totalAmount > 0
    ? totalAmount
    : (booking?.paymentAmount ?? Number(paymentAmount) ?? 0);
  const paidSum = history.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const fullyPaid = total > 0 && paidSum >= total;
  const overallPct = total > 0 ? Math.round((paidSum / total) * 100) : 0;
  const methodLabel = (m: 'cash' | 'card' | 'transfer') =>
    ({ cash: L('Наличные', 'Cash'), card: L('Карта', 'Card'), transfer: L('Перевод', 'Transfer') } as const)[m];

  const handlePrint = () => {
    const node = document.querySelector('.receipt-paper');
    if (!node) { window.print(); return; }
    const html = node.outerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) { window.print(); return; }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${L('Квитанция', 'Receipt')}</title>${styles}<style>
      @page { size: A4 portrait; margin: 10mm; }
      html, body { margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-paper { position: static !important; width: 190mm !important; max-width: 190mm !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; background: #fff !important; color: #000 !important; }
      .receipt-paper * { overflow: visible !important; max-height: none !important; }
    </style></head><body>${html}</body></html>`);
    w.document.close();
    const doPrint = () => { w.focus(); w.print(); setTimeout(() => w.close(), 300); };
    if (w.document.readyState === 'complete') setTimeout(doPrint, 250);
    else w.addEventListener('load', () => setTimeout(doPrint, 250));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const receiptNumber = booking?.id ? booking.id.slice(0, 8).toUpperCase() : '—';
  const issuedAt = booking?.paymentConfirmedAt
    ? safeFmt(booking.paymentConfirmedAt.slice(0, 10), 'dd.MM.yyyy')
    : format(new Date(), 'dd.MM.yyyy');
  const issuedTime = booking?.paymentConfirmedAt
    ? new Date(booking.paymentConfirmedAt).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px] w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden p-0 border-0 bg-transparent shadow-none [&>button.absolute]:hidden">
        <VisuallyHidden>
          <DialogTitle>{L('Квитанция', 'Receipt')}</DialogTitle>
          <DialogDescription>{L('Платёжная квитанция', 'Payment receipt')}</DialogDescription>
        </VisuallyHidden>

        <div className="receipt-shell relative flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[24px] bg-card ring-1 ring-foreground/10 shadow-2xl">
          {/* Toolbar (hidden on print) */}
          <div className="receipt-toolbar flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/5 px-5 py-3 print:hidden">
            <div className="flex items-center gap-2 text-primary">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <ReceiptIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em]">{L('Документ', 'Document')}</p>
                <p className="text-sm font-black">{L('Квитанция об оплате', 'Payment receipt')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/30"
              >
                <Printer className="h-3.5 w-3.5" />
                {L('Печать', 'Print')}
              </Button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground hover:border-destructive/40 hover:text-destructive transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Receipt paper */}
          <div className="receipt-paper max-h-[80vh] overflow-y-auto bg-white text-slate-900 px-8 py-7 print:max-h-none print:overflow-visible print:p-6">
            <div className="flex items-start justify-between border-b border-slate-300 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight">{L('Отель Саёхат', 'Sayohat Hotel')}</h1>
                <p className="text-xs text-slate-500 mt-1">{L('Квитанция об оплате', 'Payment Receipt')}</p>
              </div>
              <div className="text-right text-xs">
                <p><span className="text-slate-500">№ </span><span className="font-mono font-bold">{receiptNumber}</span></p>
                <p className="text-slate-500 mt-1">{issuedAt} · {issuedTime}</p>
              </div>
            </div>

            <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Row k={L('ФИО гостя', 'Guest name')} v={guestFullName || '—'} />
              <Row k={L('Номер комнаты', 'Room number')} v={`№ ${roomNumber}`} />
              {categoryLabel && <Row k={L('Категория', 'Category')} v={categoryLabel} />}
              <Row k={L('Кол-во гостей', 'Guests')} v={String(booking?.guestCount ?? 1)} />
              <Row k={L('Дата заезда', 'Check-in')} v={`${safeFmt(booking?.checkIn)} · ${checkInTime}`} />
              <Row k={L('Дата выезда', 'Check-out')} v={`${safeFmt(booking?.checkOut)} · ${checkOutTime}`} />
              <Row k={L('Кол-во ночей', 'Nights')} v={Number.isInteger(nights) ? String(nights) : nights.toFixed(1)} />
              <Row k={L('Контакт', 'Contact')} v={booking?.guestPhone || booking?.guestEmail || '—'} />
            </section>

            <section className="mt-6 rounded-xl border border-slate-300 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{L('Оплата', 'Payment')}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Row k={L('Способ оплаты', 'Method')} v={paymentTypeLabel} dark />
                <Row k={L('Статус', 'Status')} v={fullyPaid ? L('Оплачено полностью', 'Paid in full') : L('Частичная оплата', 'Partial payment')} dark />
                <Row k={L('Оплачено всего', 'Paid in total')} v={`${formatPrice(paidSum)} (${overallPct}%)`} dark />
                <Row k={L('Кол-во платежей', 'Installments')} v={String(history.length)} dark />
              </div>

              {history.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-300">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-black uppercase tracking-wider">#</th>
                        <th className="px-3 py-1.5 text-left font-black uppercase tracking-wider">{L('Дата и время', 'Date & time')}</th>
                        <th className="px-3 py-1.5 text-left font-black uppercase tracking-wider">{L('Способ', 'Method')}</th>
                        <th className="px-3 py-1.5 text-right font-black uppercase tracking-wider">{L('Сумма', 'Amount')}</th>
                        <th className="px-3 py-1.5 text-right font-black uppercase tracking-wider">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p, i) => {
                        const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
                        const when = (() => { try { return format(parseISO(p.at), 'dd.MM.yyyy HH:mm'); } catch { return '—'; } })();
                        return (
                          <tr key={i} className="border-t border-slate-200">
                            <td className="px-3 py-1.5 font-mono">{i + 1}</td>
                            <td className="px-3 py-1.5">{when}</td>
                            <td className="px-3 py-1.5">{methodLabel(p.method)}</td>
                            <td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatPrice(p.amount)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-end justify-between border-t border-dashed border-slate-300 pt-3">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{L('Итого', 'Total')}</span>
                <span className="text-2xl font-black tabular-nums">
                  {formatPrice(total || Number(paymentAmount))}
                  <span className="ml-1 text-sm font-bold text-slate-500">{L('сум', 'UZS')}</span>
                </span>
              </div>
              {!fullyPaid && total > 0 && (
                <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                  <span>{L('Остаток к оплате', 'Remaining')}</span>
                  <span className="font-bold tabular-nums">{formatPrice(Math.max(0, total - paidSum))}</span>
                </div>
              )}
            </section>

            {booking?.notes && (
              <section className="mt-5 text-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{L('Заметки', 'Notes')}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{booking.notes}</p>
              </section>
            )}

            <section className="mt-8 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="text-slate-500">{L('Подпись администратора', 'Administrator signature')}</p>
                <div className="mt-8 border-t border-slate-400" />
              </div>
              <div>
                <p className="text-slate-500">{L('Подпись гостя', 'Guest signature')}</p>
                <div className="mt-8 border-t border-slate-400" />
              </div>
            </section>

            <p className="mt-6 text-center text-[10px] text-slate-400">
              {L('Спасибо, что выбрали наш отель!', 'Thank you for choosing our hotel!')}
            </p>
          </div>
        </div>

        {/* Print is handled via a fresh window (handlePrint) to avoid Radix
            Dialog transform/fixed ancestors mis-positioning the receipt. */}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, dark }: { k: string; v: string; dark?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{k}</span>
      <span className="mt-0.5 font-semibold text-slate-900">{v}</span>
    </div>
  );
}
