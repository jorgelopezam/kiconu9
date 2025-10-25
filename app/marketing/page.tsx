"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { getUserProfile } from "@/lib/firestore-helpers";
import Image from "next/image";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  campaign: string;
  expiration_date: Timestamp;
  created_by: string;
  created_at: Timestamp;
  redeemed_count: number;
}

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function MarketingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeTab, setActiveTab] = useState<"branding" | "promociones">("branding");
  
  // Form state
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [campaign, setCampaign] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Coupons list
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [userCache, setUserCache] = useState<Map<string, UserData>>(new Map());

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.is_admin) {
          setIsAdmin(true);
        } else {
          router.push("/panel");
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/panel");
      } finally {
        setCheckingAccess(false);
      }
    };

    if (!loading) {
      checkAdminAccess();
    }
  }, [user, loading, router]);

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const couponsRef = collection(db, "coupons");
      const q = query(couponsRef, orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      
      const couponsList: Coupon[] = [];
      snapshot.forEach((doc) => {
        couponsList.push({ id: doc.id, ...doc.data() } as Coupon);
      });
      
      setCoupons(couponsList);
      
      // Fetch user data for all creators
      const userIds = [...new Set(couponsList.map((c) => c.created_by))];
      const newUserCache = new Map(userCache);
      
      for (const userId of userIds) {
        if (!newUserCache.has(userId)) {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              newUserCache.set(userId, userData);
            }
          } catch (error) {
            console.error("Error fetching user:", error);
          }
        }
      }
      
      setUserCache(newUserCache);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoadingCoupons(false);
    }
  }, [userCache]);

  useEffect(() => {
    if (isAdmin) {
      fetchCoupons();
    }
  }, [fetchCoupons, isAdmin]);

  const handleGenerateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !couponCode || !discount || !campaign || !expirationDate) {
      alert("Por favor completa todos los campos");
      return;
    }

    const discountNum = parseFloat(discount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
      alert("El descuento debe ser un número entre 1 y 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const couponsRef = collection(db, "coupons");
      const expirationTimestamp = Timestamp.fromDate(new Date(expirationDate));
      
      await addDoc(couponsRef, {
        code: couponCode.toUpperCase().trim(),
        discount: discountNum,
        campaign: campaign.trim(),
        expiration_date: expirationTimestamp,
        created_by: user.uid,
        created_at: Timestamp.now(),
        redeemed_count: 0,
      });

      // Clear form
      setCouponCode("");
      setDiscount("");
      setCampaign("");
      setExpirationDate("");
      
      // Refresh coupons list
      await fetchCoupons();
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error: unknown) {
      console.error("Error creating coupon:", error);
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "Error desconocido")
          : "Error desconocido";
      alert("Error al generar el cupón: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const getUserName = (userId: string) => {
    const userData = userCache.get(userId);
    if (userData?.first_name || userData?.last_name) {
      return `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    }
    return userData?.email || 'Usuario';
  };

  const brandingAssets = [
    { name: "Logo (Oscuro)", file: "KICONU LOGO DESIGN.jpg" },
    { name: "Logo (Claro)", file: "KICONU LOGO DESIGN (2).jpg" },
    { name: "Logo (Variante)", file: "KICONU LOGO DESIGN (3).jpg" },
    { name: "Logo 9", file: "logo9.jpg" },
    { name: "Logo 12", file: "logo12.jpg" },
    { name: "Logo 13", file: "logo13.jpg" },
    { name: "Imagen Generada", file: "Gemini_Generated_Image_ohhbjlohhbjlohhb.png" },
  ];

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/branding/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
          <p className="text-sm text-panel-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-[960px] px-4 sm:px-6 md:px-10">
        <main className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-panel-text">
              Centro de Marketing Kiconu
            </h1>
          </div>

          {/* Tabs */}
          <div className="pb-3">
            <div className="flex gap-4 overflow-x-auto border-b border-panel-border sm:gap-8">
              <button
                onClick={() => setActiveTab("branding")}
                className={`flex flex-col items-center justify-center whitespace-nowrap border-b-[3px] pb-[13px] pt-4 transition-colors ${
                  activeTab === "branding"
                    ? "border-b-panel-primary text-panel-text"
                    : "border-b-transparent text-panel-muted"
                }`}
              >
                <p className="text-sm font-bold leading-normal tracking-wide">Nuestro Kit de Marca</p>
              </button>
              <button
                onClick={() => setActiveTab("promociones")}
                className={`flex flex-col items-center justify-center whitespace-nowrap border-b-[3px] pb-[13px] pt-4 transition-colors ${
                  activeTab === "promociones"
                    ? "border-b-panel-primary text-panel-text"
                    : "border-b-transparent text-panel-muted"
                }`}
              >
                <p className="text-sm font-bold leading-normal tracking-wide">Promociones</p>
              </button>
              <a
                className="flex flex-col items-center justify-center whitespace-nowrap border-b-[3px] border-b-transparent pb-[13px] pt-4 text-panel-muted"
                href="#"
              >
                <p className="text-sm font-bold leading-normal tracking-wide">Plantillas de Campañas Online</p>
              </a>
              <a
                className="flex flex-col items-center justify-center whitespace-nowrap border-b-[3px] border-b-transparent pb-[13px] pt-4 text-panel-muted"
                href="#"
              >
                <p className="text-sm font-bold leading-normal tracking-wide">Estrategia de Redes Sociales</p>
              </a>
            </div>
          </div>

          {/* Branding Section */}
          {activeTab === "branding" && (
            <div className="rounded-xl border border-panel-border bg-panel-card p-6 shadow-lg md:p-8">
              <h2 className="pb-2 text-2xl font-bold leading-tight tracking-tight text-panel-text">
                Kit de Marca
              </h2>
              <p className="pb-6 text-base font-normal leading-relaxed text-panel-muted">
                Descarga nuestros activos de marca. Utiliza estos recursos aprobados para representar la marca Kiconu de manera consistente.
              </p>
              
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {brandingAssets.map((asset) => (
                  <div key={asset.file} className="group flex flex-col items-center gap-3">
                    <button
                      onClick={() => handleDownload(asset.file)}
                      className="relative aspect-square w-full overflow-hidden rounded-lg border border-panel-border bg-white transition-shadow hover:shadow-lg dark:bg-gray-700"
                    >
                      <Image
                        alt={asset.name}
                        className="h-full w-full object-cover"
                        src={`/branding/${asset.file}`}
                        width={400}
                        height={400}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="material-symbols-outlined text-4xl text-white">download</span>
                      </div>
                    </button>
                    <p className="text-center text-sm font-medium text-panel-text">{asset.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Coupon Form */}
          {activeTab === "promociones" && (
            <>
              <div className="rounded-xl border border-panel-border bg-panel-card p-6 shadow-lg md:p-8">
            <h2 className="pb-2 text-2xl font-bold leading-tight tracking-tight text-panel-text">
              Generar un Cupón Promocional
            </h2>
            <p className="pb-6 text-base font-normal leading-relaxed text-panel-muted">
              Crea un código de cupón único para tus campañas de marketing. Establece un porcentaje de descuento y una fecha de vencimiento para personalizar tu oferta.
            </p>
            
            <form onSubmit={handleGenerateCoupon}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-panel-text" htmlFor="coupon-code">
                    Código de Cupón
                  </label>
                  <input
                    className="w-full rounded-lg border border-panel-border bg-background px-4 py-2.5 text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    id="coupon-code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="ej. KICONU25"
                    type="text"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-panel-text" htmlFor="discount">
                    Descuento (%)
                  </label>
                  <input
                    className="w-full rounded-lg border border-panel-border bg-background px-4 py-2.5 text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    id="discount"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="25"
                    type="number"
                    min="1"
                    max="100"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-panel-text" htmlFor="campaign">
                    Campaña
                  </label>
                  <input
                    className="w-full rounded-lg border border-panel-border bg-background px-4 py-2.5 text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    id="campaign"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="ej. Venta de Verano"
                    type="text"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-panel-text" htmlFor="expiration-date">
                    Fecha de Vencimiento
                  </label>
                  <input
                    className="w-full rounded-lg border border-panel-border bg-background px-4 py-2.5 text-panel-text outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                    id="expiration-date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    type="date"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-start">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 min-w-[150px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panel-primary px-6 text-base font-bold leading-normal tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">
                    {isSubmitting ? "Generando..." : "Generar Cupón"}
                  </span>
                </button>
                
                {/* Success message */}
                {showSuccess && (
                  <div className="ml-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-green-600 dark:text-green-400">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    <span className="text-sm font-semibold">Cupón generado exitosamente</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Generated Coupons Table */}
          <div className="mt-8 rounded-xl border border-panel-border bg-panel-card p-6 shadow-lg md:p-8">
            <h3 className="pb-4 text-xl font-bold leading-tight tracking-tight text-panel-text">
              Cupones Generados
            </h3>
            
            {loadingCoupons ? (
              <div className="py-8 text-center">
                <div className="mb-4 inline-block size-8 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
                <p className="text-sm text-panel-muted">Cargando cupones...</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-8 text-center text-panel-muted">
                No hay cupones generados todavía
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-panel-border text-sm font-bold">
                    <tr>
                      <th className="px-4 py-3 text-panel-text">Código</th>
                      <th className="px-4 py-3 text-panel-text">Descuento</th>
                      <th className="px-4 py-3 text-panel-text">Campaña</th>
                      <th className="px-4 py-3 text-panel-text">Vencimiento</th>
                      <th className="px-4 py-3 text-panel-text">Canjeados</th>
                      <th className="px-4 py-3 text-panel-text">Creado Por</th>
                      <th className="px-4 py-3 text-panel-text">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel-border">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="text-base">
                        <td className="px-4 py-4 font-mono text-panel-text">{coupon.code}</td>
                        <td className="px-4 py-4 text-panel-text">{coupon.discount}%</td>
                        <td className="px-4 py-4 text-panel-text">{coupon.campaign}</td>
                        <td className="px-4 py-4 text-panel-text">{formatDate(coupon.expiration_date)}</td>
                        <td className="px-4 py-4 text-panel-text">{coupon.redeemed_count}</td>
                        <td className="px-4 py-4 text-panel-muted">{getUserName(coupon.created_by)}</td>
                        <td className="px-4 py-4 text-panel-muted">{formatDate(coupon.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
