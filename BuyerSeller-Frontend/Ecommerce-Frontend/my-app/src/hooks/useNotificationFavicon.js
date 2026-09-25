import { useEffect } from "react";

export default function useNotificationFavicon(hasUnreadNotification) {
  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    const originalFavicon =
      favicon.getAttribute("data-original-href") ||
      favicon.getAttribute("href") ||
      "/vite.svg";

    favicon.setAttribute("data-original-href", originalFavicon);

    if (!hasUnreadNotification) {
      favicon.href = originalFavicon;
      return;
    }

    const image = new Image();
    image.src = originalFavicon;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64;

      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");

      if (!context) return;

      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);

      // Kırmızı bildirim noktası
      context.beginPath();
      context.arc(51, 13, 11, 0, Math.PI * 2);
      context.fillStyle = "#ef4444";
      context.fill();

      // Noktanın daha net görünmesi için beyaz kenarlık
      context.lineWidth = 3;
      context.strokeStyle = "#ffffff";
      context.stroke();

      favicon.href = canvas.toDataURL("image/png");
    };

    image.onerror = () => {
      console.error("Favicon yüklenemedi:", originalFavicon);
    };
  }, [hasUnreadNotification]);
}