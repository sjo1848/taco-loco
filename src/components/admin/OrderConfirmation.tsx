"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCustomerWhatsAppAppUrl, buildCustomerWhatsAppUrl, buildOrderConfirmationMessage } from "@/modules/orders/confirmation";

type Props = { businessName: string; orderNumber: number; totalAmount: number; customerName: string | null; customerPhone: string | null; fulfillment: "PICKUP" | "DINE_IN" };

export function OrderConfirmation({ businessName, orderNumber, totalAmount, customerName, customerPhone, fulfillment }: Props) {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const message = useMemo(() => buildOrderConfirmationMessage({ businessName, orderNumber, totalAmount, customerName, fulfillment }), [businessName, orderNumber, totalAmount, customerName, fulfillment]);
  const whatsappUrl = useMemo(() => buildCustomerWhatsAppUrl(customerPhone, message), [customerPhone, message]);
  const whatsappAppUrl = useMemo(() => buildCustomerWhatsAppAppUrl(customerPhone, message), [customerPhone, message]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const updateDeviceMode = () => setIsMobileDevice(mediaQuery.matches);
    updateDeviceMode();
    mediaQuery.addEventListener("change", updateDeviceMode);
    return () => mediaQuery.removeEventListener("change", updateDeviceMode);
  }, []);

  async function copyMessage() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(message);
      else {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("COPY_FAILED");
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return <section className="admin-panel order-confirmation"><div className="order-confirmation__header"><div><p className="eyebrow">Confirmación administrativa</p><h2>Mensaje para WhatsApp</h2></div><strong>TL-{String(orderNumber).padStart(4, "0")}</strong></div><p className="order-confirmation__help">El pedido está confirmado en Foodtrack. Copiá este mensaje y respondé en la conversación correspondiente.</p><textarea aria-label="Mensaje de confirmación" readOnly value={message} rows={7} /><div className="order-confirmation__actions"><button className="admin-button admin-button--primary" type="button" onClick={copyMessage}>{copyState === "copied" ? "Mensaje copiado" : "Copiar mensaje"}</button>{whatsappUrl && <a className="admin-button admin-button--secondary" href={isMobileDevice ? whatsappAppUrl ?? whatsappUrl : whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}</div>{copyState === "error" && <p className="form-error" role="alert">No se pudo copiar automáticamente. Seleccioná el texto del mensaje y copialo manualmente.</p>}{!whatsappUrl && <p className="order-confirmation__missing-phone" role="status">Este pedido no tiene un teléfono vinculado. Respondé desde la conversación de WhatsApp iniciada por el cliente; el código TL-{String(orderNumber).padStart(4, "0")} identifica el pedido.</p>}</section>;
}
