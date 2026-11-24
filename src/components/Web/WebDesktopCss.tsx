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

/* Chrome autofill: evita caixa clara “duplicada” sobre o wrapper escuro */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
textarea:-webkit-autofill:active {
  -webkit-text-fill-color: #ffffff !important;
  caret-color: #ffffff;
  transition: background-color 99999s ease-in-out 0s;
  box-shadow: 0 0 0 1000px #171321 inset !important;
  -webkit-box-shadow: 0 0 0 1000px #171321 inset !important;
  border: 0 !important;
  outline: none !important;
  filter: none !important;
}

input,
textarea {
  outline: none !important;
  outline-offset: 0 !important;
}

/* Desktop Visão (≥1024): scroll + sidebar hover */
@media (min-width: 1024px) {
  html {
    scrollbar-width: thin;
    scrollbar-color: rgba(185, 0, 255, 0.55) rgba(18, 16, 26, 0.9);
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  *::-webkit-scrollbar-track {
    background: rgba(7, 5, 13, 0.95);
    border-left: 1px solid rgba(185, 0, 255, 0.12);
  }
  *::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(185, 0, 255, 0.75), rgba(255, 0, 138, 0.55));
    border-radius: 999px;
    border: 2px solid rgba(7, 5, 13, 0.95);
  }
  *::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(210, 76, 255, 0.95), rgba(255, 76, 176, 0.75));
  }
  *::-webkit-scrollbar-corner {
    background: rgba(7, 5, 13, 0.95);
  }

  [data-desktop-scroll="1"] {
    scrollbar-width: thin;
    scrollbar-color: rgba(185, 0, 255, 0.55) rgba(18, 16, 26, 0.9);
  }

  /* Sidebar docked: sem divisores entre itens */
  [data-sidebar-docked="1"] [role="button"],
  [data-sidebar-item="1"] {
    border-bottom-width: 0 !important;
    border-top-width: 0 !important;
    border-bottom-color: transparent !important;
    border-top-color: transparent !important;
  }
  [data-sidebar-item="1"] {
    border-radius: 10px;
    margin: 2px 6px;
    transition: background-color 140ms ease, box-shadow 140ms ease;
    cursor: pointer;
  }
  [data-sidebar-item="1"]:hover {
    background-color: rgba(185, 0, 255, 0.14) !important;
    box-shadow: inset 3px 0 0 rgba(185, 0, 255, 0.85);
  }
  [data-sidebar-item="1"][data-sidebar-active="1"] {
    background-color: rgba(185, 0, 255, 0.2) !important;
    box-shadow: inset 3px 0 0 #B900FF;
  }
  [data-sidebar-item="1"][data-sidebar-active="1"]:hover {
    background-color: rgba(185, 0, 255, 0.26) !important;
  }
  [data-sidebar-logout="1"] {
    transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    cursor: pointer;
  }
  [data-sidebar-logout="1"]:hover {
    background-color: rgba(255, 0, 138, 0.16) !important;
    border-color: #ff4d8d !important;
    box-shadow: 0 0 0 1px rgba(255, 0, 138, 0.25);
  }

  /* Home · ações rápidas (Início desktop). */
  [data-home-action="1"] {
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      box-shadow 180ms ease,
      transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
    cursor: pointer;
    will-change: transform, box-shadow;
  }
  [data-home-action="1"][data-home-action-tone="purple"] {
    border-color: rgba(185, 0, 255, 0.34) !important;
    box-shadow:
      0 0 0 1px rgba(185, 0, 255, 0.12),
      0 0 20px rgba(185, 0, 255, 0.16),
      0 6px 16px rgba(185, 0, 255, 0.08);
  }
  [data-home-action="1"][data-home-action-tone="magenta"] {
    border-color: rgba(255, 0, 138, 0.32) !important;
    box-shadow:
      0 0 0 1px rgba(255, 0, 138, 0.12),
      0 0 20px rgba(255, 0, 138, 0.14),
      0 6px 16px rgba(255, 0, 138, 0.08);
  }
  [data-home-action="1"]:hover {
    transform: translateY(-2px) scale(1.03);
  }
  [data-home-action="1"][data-home-action-tone="purple"]:hover {
    background-color: rgba(185, 0, 255, 0.18) !important;
    border-color: rgba(185, 0, 255, 0.6) !important;
    box-shadow:
      0 0 0 1px rgba(185, 0, 255, 0.32),
      0 0 28px rgba(185, 0, 255, 0.28),
      0 10px 24px rgba(185, 0, 255, 0.2);
  }
  [data-home-action="1"][data-home-action-tone="magenta"]:hover {
    background-color: rgba(255, 0, 138, 0.16) !important;
    border-color: rgba(255, 0, 138, 0.55) !important;
    box-shadow:
      0 0 0 1px rgba(255, 0, 138, 0.3),
      0 0 28px rgba(255, 0, 138, 0.24),
      0 10px 24px rgba(255, 0, 138, 0.18);
  }
  [data-home-action="1"]:active {
    transform: translateY(0) scale(0.99);
    box-shadow:
      0 0 0 1px rgba(185, 0, 255, 0.16),
      0 0 12px rgba(185, 0, 255, 0.12);
  }
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
