import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, ShoppingCart, ChevronDown } from "lucide-react";

export interface CartItem {
  drug_id: string;
  drug_name: string;
  generic_name: string | null;
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  qty: number;
  max_qty: number;
  unit_price: number;
  mrp: number;
  gst_percent: number;
  is_ndps: boolean;
  drug_schedule: string | null;
  is_expiring: boolean;
  item_discount: number; // percent
}

interface Props {
  items: CartItem[];
  customerId: string | null;
  customerPhone: string;
  customerName: string;
  customerStatusLabel: string;
  discountPercent: number;
  discountMode: "percent" | "fixed";
  discountFixed: number;
  onUpdateQty: (idx: number, qty: number) => void;
  onRemoveItem: (idx: number) => void;
  onClearAll: () => void;
  onSetCustomerPhone: (phone: string) => void;
  onSetCustomerName: (name: string) => void;
  onSetDiscountPercent: (val: number) => void;
  onSetDiscountMode: (mode: "percent" | "fixed") => void;
  onSetDiscountFixed: (val: number) => void;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netTotal: number;
}

const RetailCart: React.FC<Props> = ({
  items, customerId, customerPhone, customerName, customerStatusLabel, discountPercent, discountMode, discountFixed,
  onUpdateQty, onRemoveItem, onClearAll, onSetCustomerPhone, onSetCustomerName,
  onSetDiscountPercent, onSetDiscountMode, onSetDiscountFixed,
  subtotal, discountAmount, gstAmount, netTotal,
}) => {
  const [showGst, setShowGst] = useState(false);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  // GST breakdown
  const gstBreakdown: Record<number, number> = {};
  items.forEach(item => {
    const itemTotal = item.unit_price * item.qty;
    const gstAmt = itemTotal * (item.gst_percent / (100 + item.gst_percent));
    gstBreakdown[item.gst_percent] = (gstBreakdown[item.gst_percent] || 0) + gstAmt;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
      {/* Header */}
      <div className="h-[44px] flex-shrink-0 bg-card border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Cart</span>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
        {items.length > 0 && (
          <button onClick={onClearAll} className="text-xs text-destructive hover:underline active:scale-[0.97]">
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Customer */}
      <div className="flex-shrink-0 bg-card border-b border-border/50 px-3.5 py-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={customerPhone}
            onChange={e => onSetCustomerPhone(e.target.value)}
            placeholder="Customer phone"
            className="h-8 text-xs bg-muted/30"
          />
          <Input
            value={customerName}
            onChange={e => onSetCustomerName(e.target.value)}
            placeholder="Customer name"
            className="h-8 text-xs bg-muted/30"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {customerId ? `Linked patient: ${customerStatusLabel}` : customerStatusLabel}
        </p>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart size={32} className="text-muted-foreground/30 mb-2" />
              <p className="text-[13px] text-muted-foreground">Add drugs from the search panel</p>
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={`${item.drug_id}-${item.batch_id}`}
              className="bg-card rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{item.drug_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.batch_number} · Exp: {new Date(item.expiry_date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(idx)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                {/* Qty adjuster */}
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => onUpdateQty(idx, Math.max(1, item.qty - 1))}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-9 text-center text-base font-bold text-foreground">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(idx, Math.min(item.max_qty, item.qty + 1))}
                    disabled={item.qty >= item.max_qty}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 disabled:opacity-40"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">₹{item.unit_price}/unit</p>
                  <p className="text-sm font-bold text-foreground">₹{(item.unit_price * item.qty).toFixed(0)}</p>
                </div>
              </div>

              {item.is_expiring && (
                <p className="text-[10px] text-amber-600 mt-1">⚠️ Expiring soon</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bill Summary */}
      {items.length > 0 && (
        <div className="flex-shrink-0 bg-card border-t border-border px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Discount</span>
            <div className="flex items-center gap-1">
              <div className="flex rounded overflow-hidden border border-input h-6">
                <button
                  onClick={() => onSetDiscountMode("percent")}
                  className={cn("px-1.5 text-[10px] font-bold", discountMode === "percent" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >%</button>
                <button
                  onClick={() => onSetDiscountMode("fixed")}
                  className={cn("px-1.5 text-[10px] font-bold", discountMode === "fixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >₹</button>
              </div>
              <Input
                type="number"
                min={0}
                value={discountMode === "percent" ? discountPercent : discountFixed}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  discountMode === "percent" ? onSetDiscountPercent(Math.min(100, v)) : onSetDiscountFixed(v);
                }}
                className="w-14 h-6 text-xs text-center p-0"
              />
              <span className="text-xs text-muted-foreground">-₹{discountAmount.toFixed(0)}</span>
            </div>
          </div>

          {/* GST */}
          <button
            onClick={() => setShowGst(!showGst)}
            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              GST <ChevronDown size={10} className={cn("transition-transform", showGst && "rotate-180")} />
            </span>
            <span>₹{gstAmount.toFixed(0)}</span>
          </button>
          {showGst && (
            <div className="pl-3 space-y-0.5">
              {Object.entries(gstBreakdown).map(([rate, amt]) => (
                <div key={rate} className="flex justify-between text-[10px] text-muted-foreground">
                  <span>GST {rate}%</span>
                  <span>₹{amt.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="flex items-end justify-between pt-2 border-t border-border">
            <div>
              <span className="text-[11px] font-bold uppercase text-muted-foreground">TOTAL</span>
              <p className="text-[10px] text-muted-foreground">{items.length} items · {totalQty} units</p>
            </div>
            <span className="text-2xl font-bold text-foreground">₹{netTotal.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailCart;
