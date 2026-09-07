"use client";

import { useEffect } from "react";

export function SilentSso({ loginUrl, enabled = true, resultOrigin }: { loginUrl: string; enabled?: boolean; resultOrigin?: string }) {
  useEffect(() => {
    if (!enabled || window.parent !== window) return;
    const origin = resultOrigin ?? window.location.origin;
    const key = "tt829:sso-reload:" + origin;
    try {
      if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 30000) return;
    } catch { /* Storage can be unavailable; authentication does not depend on it. */ }
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.title = "统一登录状态检测";
    frame.setAttribute("aria-hidden", "true");
    frame.src = loginUrl;
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.contentWindow || event.data?.type !== "tt829:sso") return;
      if (event.data.authenticated === true) {
        try { sessionStorage.setItem(key, String(Date.now())); } catch { /* optional loop guard */ }
        window.location.reload();
      }
      frame.remove();
    };
    window.addEventListener("message", receive);
    document.body.appendChild(frame);
    const timeout = window.setTimeout(() => frame.remove(), 20000);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      frame.remove();
    };
  }, [loginUrl, enabled, resultOrigin]);
  return null;
}

