import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateImage, upscaleImage, Ratio } from "./api";

export interface Shot { id: string; src: string; prompt: string; style: string; ratio: Ratio; upscaled?: boolean; createdAt: number }
export const STYLES = ["None", "Photorealistic", "Anime", "Watercolor", "3D render", "Oil painting", "Pixel art", "Cinematic"];
export const RATIOS: Ratio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

interface State {
  theme: "light" | "dark";
  prompt: string; style: string; ratio: Ratio;
  loading: boolean; error: string | null; current: Shot | null;
  gallery: Shot[]; upscalingId: string | null;
  toggleTheme: () => void;
  set: (p: Partial<Pick<State, "prompt" | "style" | "ratio">>) => void;
  generate: () => Promise<void>;
  save: (s: Shot) => void;
  remove: (id: string) => void;
  upscale: (s: Shot) => Promise<void>;
  open: (s: Shot) => void;
}

const apply = (t: "light" | "dark") => document.documentElement.classList.toggle("dark", t === "dark");
const initial = (): "light" | "dark" =>
  (localStorage.getItem("ns-theme") as "light" | "dark") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      theme: initial(), prompt: "", style: "None", ratio: "1:1",
      loading: false, error: null, current: null, gallery: [], upscalingId: null,
      toggleTheme: () => { const t = get().theme === "dark" ? "light" : "dark"; localStorage.setItem("ns-theme", t); apply(t); set({ theme: t }); },
      set: (p) => set(p),
      generate: async () => {
        const { prompt, style, ratio } = get();
        if (!prompt.trim()) return set({ error: "Describe the image you want first." });
        set({ loading: true, error: null });
        try {
          const src = await generateImage(prompt, style, ratio);
          set({ current: { id: crypto.randomUUID(), src, prompt, style, ratio, createdAt: Date.now() }, loading: false });
        } catch (e) { set({ loading: false, error: (e as Error).message }); }
      },
      save: (s) => set((st) => ({ gallery: [s, ...st.gallery.filter((g) => g.id !== s.id)] })),
      remove: (id) => set((st) => ({ gallery: st.gallery.filter((g) => g.id !== id) })),
      open: (s) => set({ current: s, prompt: s.prompt, style: s.style, ratio: s.ratio }),
      upscale: async (s) => {
        set({ upscalingId: s.id, error: null });
        try {
          const src = await upscaleImage(s.src);
          const up = { ...s, src, upscaled: true };
          set((st) => ({
            upscalingId: null,
            current: st.current?.id === s.id ? up : st.current,
            gallery: st.gallery.map((g) => (g.id === s.id ? up : g)),
          }));
        } catch (e) { set({ upscalingId: null, error: (e as Error).message }); }
      },
    }),
    {
      name: "ns-gallery",
      partialize: (s) => ({ gallery: s.gallery }),
      storage: {
        getItem: (n) => { try { const v = localStorage.getItem(n); return v ? JSON.parse(v) : null; } catch { return null; } },
        setItem: (n, v) => { try { localStorage.setItem(n, JSON.stringify(v)); } catch { /* storage full */ } },
        removeItem: (n) => localStorage.removeItem(n),
      },
    }
  )
);
apply(useStore.getState().theme);
