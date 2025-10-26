"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";

interface PlanDetails {
  name: string;
  price: number;
  features: string[];
}

const PLANS: Record<string, PlanDetails> = {
  base: {
    name: "Plan Base",
    price: 299,
    features: [
      "Plan de Nutrición Básico",
      "Acceso a recursos básicos",
      "Seguimiento mensual",
    ],
  },
  kiconu: {
    name: "Plan Kiconu",
    price: 599,
    features: [
      "Plan de Nutrición Personalizado",
      "Sesiones de Coaching (2 por mes)",
      "Guías de Mindfulness",
      "Acceso a biblioteca de recursos",
    ],
  },
  premium: {
    name: "Plan Premium",
    price: 950,
    features: [
      "Plan de Nutrición Personalizado",
      "Sesiones Semanales de Coaching Transpersonal",
      "Guías de Mindfulness y Meditación",
      "Acceso completo a la biblioteca de recursos Kiconu",
    ],
  },
};

export default function Payment2Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-panel-text">Cargando...</div>
        </div>
      }
    >
      <Payment2PageContent />
    </Suspense>
  );
}

function Payment2PageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string; discount: number} | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const planType = searchParams.get("plan") || "premium";
  const selectedPlan = PLANS[planType] || PLANS.premium;

  useEffect(() => {
    // If not logged in, redirect to home
    if (!loading && !user) {
      router.push("/");
    }
    
    // Pre-fill email if user is logged in
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user, loading, router]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Por favor ingresa un código de cupón");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError("");

    try {
      const couponsRef = collection(db, "coupons");
      const q = query(couponsRef, where("code", "==", couponCode.toUpperCase().trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setCouponError("Cupón no válido");
        setAppliedCoupon(null);
        return;
      }

      const couponDoc = snapshot.docs[0];
      const couponData = couponDoc.data();
      const expirationDate = couponData.expiration_date.toDate();
      const now = new Date();

      if (expirationDate < now) {
        setCouponError("Este cupón ha expirado");
        setAppliedCoupon(null);
        return;
      }

      // Apply the coupon
      setAppliedCoupon({
        code: couponData.code,
        discount: couponData.discount,
      });
      setCouponError("");
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError("Error al aplicar el cupón");
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const calculateTotal = () => {
    if (!appliedCoupon) return selectedPlan.price;
    const discount = (selectedPlan.price * appliedCoupon.discount) / 100;
    return selectedPlan.price - discount;
  };

  const totalAmount = calculateTotal();

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !cardNumber || !expiryDate || !cvc) {
      alert("Por favor completa todos los campos");
      return;
    }

    setIsProcessing(true);
    
    try {
      // TODO: Integrate with actual payment processor (Stripe)
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // After successful payment, redirect to register page
      router.push("/register");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPal = () => {
    alert("Integración de PayPal próximamente");
  };

  const handleRevolut = () => {
    alert("Integración de Revolut próximamente");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 lg:py-16">
      <main className="mx-auto max-w-6xl px-4 sm:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left Column - Form */}
          <div className="flex flex-col gap-8">
            {/* User Information */}
            <div>
              <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight text-panel-text">
                Completa tu Compra
              </h1>
              <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-6">
                <label className="flex w-full flex-col">
                  <p className="pb-2 text-base font-medium leading-normal text-panel-text">
                    Correo Electrónico
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 w-full rounded-xl border border-panel-border bg-background px-4 text-base font-normal leading-normal text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    placeholder="Introduce tu correo electrónico"
                    required
                  />
                </label>
                
                <div className="flex flex-col gap-6 sm:flex-row">
                  <label className="flex w-full flex-col">
                    <p className="pb-2 text-base font-medium leading-normal text-panel-text">
                      Nombre
                    </p>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-14 w-full rounded-xl border border-panel-border bg-background px-4 text-base font-normal leading-normal text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                      placeholder="Introduce tu nombre"
                      required
                    />
                  </label>
                  
                  <label className="flex w-full flex-col">
                    <p className="pb-2 text-base font-medium leading-normal text-panel-text">
                      Apellido
                    </p>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-14 w-full rounded-xl border border-panel-border bg-background px-4 text-base font-normal leading-normal text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                      placeholder="Introduce tu apellido"
                      required
                    />
                  </label>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="h-fit rounded-xl border border-panel-border bg-panel-card p-8 lg:sticky lg:top-16">
            <h3 className="mb-6 text-2xl font-bold text-panel-text">Tu Pedido</h3>
            <div className="space-y-4">
              {/* Plan Name and Price */}
              <div className="flex items-center justify-between text-base">
                <p className="text-panel-text">{selectedPlan.name}</p>
                <p className="font-semibold text-panel-text">{selectedPlan.price} €</p>
              </div>
              
              {/* Coupon Code Section */}
              <div className="border-t border-panel-border pt-4">
                <label className="mb-2 block text-sm font-medium text-panel-text" htmlFor="coupon-code">
                  Código de Cupón
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="coupon-code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 rounded-lg border border-panel-border bg-background px-3 py-2 text-sm text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    placeholder="Ingresa tu cupón"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon}
                    className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-panel-text-light transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isApplyingCoupon ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-sm text-red-500">{couponError}</p>
                )}
              </div>
              
              {/* Discount Display */}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                  <p>Descuento ({appliedCoupon.discount}%)</p>
                  <p>-{((selectedPlan.price * appliedCoupon.discount) / 100).toFixed(2)} €</p>
                </div>
              )}
              
              {/* Total */}
              <div className="flex items-center justify-between border-t border-panel-border pt-4">
                <p className="text-lg font-bold text-panel-text">Total</p>
                <p className="text-2xl font-bold text-panel-text">{totalAmount.toFixed(2)} €</p>
              </div>
              
              {/* Success Message */}
              {appliedCoupon && (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>¡Tu cupón se ha aplicado!</span>
                </div>
              )}
              
              {/* Payment Section */}
              <div className="border-t border-panel-border pt-6">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <label className="text-sm font-medium text-panel-text" htmlFor="card-number-summary">
                      Tarjeta de Crédito
                    </label>
                    <input
                      type="text"
                      id="card-number-summary"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-panel-border bg-background p-3 text-sm text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      required
                    />
                    
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-panel-text" htmlFor="expiry-date-summary">
                          Fecha de Caducidad
                        </label>
                        <input
                          type="text"
                          id="expiry-date-summary"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-panel-border bg-background p-2 text-sm text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                          placeholder="MM / AA"
                          maxLength={7}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-panel-text" htmlFor="cvc-summary">
                          CVC
                        </label>
                        <input
                          type="text"
                          id="cvc-summary"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-panel-border bg-background p-2 text-sm text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handlePaymentSubmit}
                    disabled={isProcessing}
                    className="h-12 w-full rounded-xl bg-panel-primary text-base font-bold text-panel-text-light transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Procesando..." : `Pagar ${totalAmount.toFixed(2)} €`}
                  </button>
                  
                  {/* Divider */}
                  <div className="flex items-center justify-center">
                    <span className="h-px flex-grow bg-panel-border"></span>
                    <span className="mx-4 text-xs text-panel-muted">O</span>
                    <span className="h-px flex-grow bg-panel-border"></span>
                  </div>
                  
                  {/* Alternative Payment Methods */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handlePayPal}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#003087] text-sm font-semibold text-white transition-colors hover:bg-[#00296b]"
                    >
                      <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                      PayPal
                    </button>
                    <button
                      type="button"
                      onClick={handleRevolut}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      <span className="material-symbols-outlined text-lg">payments</span>
                      Revolut
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-panel-border px-4 py-6 text-center sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-panel-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Pago Seguro por Stripe</span>
          </div>
          <div className="flex gap-4">
            <a className="hover:text-panel-text" href="#">
              Términos de Servicio
            </a>
            <a className="hover:text-panel-text" href="#">
              Política de Privacidad
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
