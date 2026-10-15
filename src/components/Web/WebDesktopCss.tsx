import { useEffect } from "react";
import { Platform } from "react-native";

const CSS = `
html, body, #root {
  height: 100%;
  min-height: 100%;
}
[role="button"], button, a {
  cursor: pointer;
}
`;

export const WebDesktopCss: React.FC = () => {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.setAttribute("data-visao-desktop", "true");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  return null;
};
