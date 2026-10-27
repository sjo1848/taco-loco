declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" | "redirect" }): void;
          renderButton(parent: HTMLElement, options: { theme?: string; size?: string; text?: string; shape?: string; width?: number }): void;
          cancel(): void;
        };
      };
    };
  }
}

export {};
