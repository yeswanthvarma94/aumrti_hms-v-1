import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, ShoppingCart, ChevronDown, Loader2, CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PatientGender } from "@/lib/patient-records";

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
  item_discount: number;
}

interface PatientSearchResult {
  id: string;
  full_name: string;
  uhid: string;
  phone: string | null;
}

interface Props {
  items: CartItem[];
  customerId: string | null;
  customerPhone: string;
  customerName: string;
  customerUhid: string;
  discountPercent: number;
  discountMode: "percent" | "fixed";
  discountFixed: number;
  searching: boolean;
  searchResults: PatientSearchResult[];
  showNewPatientForm: boolean;
  newPatientData: { full_name: string; phone: string; age: string; gender: PatientGender };
  onUpdateQty: (idx: number, qty: number) => void;
  onRemoveItem: (idx: number) => void;
  onClearAll: () => void;
  onSetCustomerPhone: (phone: string) => void;
  onSetCustomerName: (name: string) => void;
  onSetDiscountPercent: (val: number) => void;
  onSetDiscountMode: (mode: "percent" | "fixed") => void;
  onSetDiscountFixed: (val: number) => void;
  onSelectPatient: (patient: PatientSearchResult) => void;
  onClearPatient: () => void;
  onToggleNewPatientForm: () => void;
  onSetNewPatientData: (data: { full_name: string; phone: string; age: string; gender: PatientGender }) => void;
  onCreateCustomer: () => void;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netTotal: number;
}

const genders: PatientGender[] = ["male", "female", "other"];

const RetailCart: React.FC<Props> = ({
  items, customerId, customerPhone, customerName, customerUhid, discountPercent, discountMode, discountFixed,
  searching, searchResults, showNewPatientForm, newPatientData,
  onUpdateQty, onRemoveItem, onClearAll, onSetCustomerPhone, onSetCustomerName,
  onSetDiscountPercent, onSetDiscountMode, onSetDiscountFixed,
  onSelectPatient, onClearPatient, onToggleNewPatientForm, onSetNewPatientData, onCreateCustomer,
  subtotal, discountAmount, gstAmount, netTotal,
}) => {
  const [showGst, setShowGst] = useState(false);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

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

      {/* Customer Section */}
      <div className="flex-shrink-0 bg-card border-b border-border/50 px-3.5 py-2 space-y-2">
        {customerId ? (
          /* Linked patient display */
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-foreground">{customerName}</p>
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-mono">{customerUhid}</span>
                  {customerPhone && ` · ${customerPhone}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClearPatient}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <XCircle size={14} />
            </button>
          </div>
        ) : (
          /* Search inputs */
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={customerPhone}
                onChange={e => onSetCustomerPhone(e.target.value)}
                placeholder="Search by phone / UHID"
                className="h-8 text-xs bg-muted/30"
              />
              <Input
                value={customerName}
                onChange={e => onSetCustomerName(e.target.value)}
                placeholder="Search by name"
                className="h-8 text-xs bg-muted/30"
              />
            </div>

            {/* Search status */}
            <div className="flex items-center justify-between">
              {searching ? (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Searching…
                </div>
              ) : searchResults.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">{searchResults.length} patient(s) found</span>
              ) : (customerPhone.trim().length >= 2 || customerName.trim().length >= 2) ? (
                <span className="text-[11px] text-muted-foreground">No patients found</span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Search by name, phone or UHID</span>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={onToggleNewPatientForm}
              >
                <UserPlus size={10} />
                {showNewPatientForm ? "Cancel" : "Register New"}
              </Button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && !showNewPatientForm && (
              <div className="rounded-lg border border-border bg-background max-h-[140px] overflow-auto">
                {searchResults.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => onSelectPatient(patient)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground">{patient.full_name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-mono">{patient.uhid}</Badge>
                    </div>
                    {patient.phone && <p className="text-[10px] text-muted-foreground">{patient.phone}</p>}
                  </button>
                ))}
              </div>
            )}

            {/* New patient form */}
            {showNewPatientForm && (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">New Patient</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newPatientData.full_name}
                    onChange={e => onSetNewPatientData({ ...newPatientData, full_name: e.target.value })}
                    placeholder="Full name *"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={newPatientData.phone}
                    onChange={e => onSetNewPatientData({ ...newPatientData, phone: e.target.value })}
                    placeholder="Phone"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={newPatientData.age}
                    onChange={e => onSetNewPatientData({ ...newPatientData, age: e.target.value })}
                    placeholder="Age"
                    type="number"
                    min={0}
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-0.5 rounded border border-input bg-background p-0.5">
                    {genders.map(g => (
                      <button
                        key={g}
                        onClick={() => onSetNewPatientData({ ...newPatientData, gender: g })}
                        className={cn(
                          "flex-1 rounded px-1 py-1 text-[10px] font-medium capitalize transition-colors",
                          newPatientData.gender === g
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >{g}</button>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-[11px] font-bold"
                  disabled={!newPatientData.full_name.trim()}
                  onClick={onCreateCustomer}
                >
                  <UserPlus size={12} className="mr-1" />
                  Register & Link to Cart
                </Button>
              </div>
            )}
          </>
        )}
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