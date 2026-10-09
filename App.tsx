import { AnimatePresence, motion } from "framer-motion";
import { useStore, STYLES, RATIOS, Shot } from "./store";

const ratioBox = (r: string) => { const [w, h] = r.split(":").map(Number); return { aspectRatio: `${w} / ${h}` }; };
const btn = "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-banana-500 disabled:opacity-50";
const ghost = `${btn} border border-stone-300 hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800`;

function download(s: Shot) {
  const a = document.createElement("a");
  a.href = s.src; a.download = `nano-${s.id.slice(0, 6)}.png`; a.click();
}
async function share(s: Shot) {
  try {
    const blob = await (await fetch(s.src)).blob();
    const file = new File([blob], "nano.png", { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text: s.prompt });
  } catch { /* cancelled */ }
  download(s);
}

function Header() {
  const { theme, toggleTheme } = useStore();
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Nano Studio <span className="text-banana-500">●</span></h1>
      <button onClick={toggleTheme} aria-label="Toggle dark mode" className={ghost}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="inline-block">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </motion.span>
        </AnimatePresence>
      </button>
    </header>
  );
}

function Controls() {
  const { prompt, style, ratio, loading, set, generate } = useStore();
  return (
    <section className="space-y-5">
      <textarea
        value={prompt} onChange={(e) => set({ prompt: e.target.value })} rows={5}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && generate()}
        placeholder="A fox reading by lantern light in a snowy forest…"
        className="w-full resize-none rounded-2xl border border-stone-300 bg-white p-4 text-base outline-none focus:border-banana-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div>
        <p className="mb-2 text-sm font-medium">Style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button key={s} onClick={() => set({ style: s })}
              className={`rounded-full px-3 py-1.5 text-sm transition ${style === s ? "bg-banana-400 text-black" : "bg-stone-200 hover:bg-stone-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Aspect ratio</p>
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button key={r} onClick={() => set({ ratio: r })}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${ratio === r ? "border-banana-500 bg-banana-400/20" : "border-stone-300 dark:border-neutral-700"}`}>
              <span style={ratioBox(r)} className="h-4 rounded-sm border-2 border-current" />{r}
            </button>
          ))}
        </div>
      </div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={generate} disabled={loading}
        className={`${btn} w-full bg-banana-400 py-3 text-base font-bold text-black hover:bg-banana-500`}>
        {loading ? "Generating…" : "Generate"}
      </motion.button>
    </section>
  );
}

function Preview() {
  const { current, loading, error, ratio, gallery, upscalingId, save, upscale } = useStore();
  const saved = current && gallery.some((g) => g.id === current.id);
  const busy = current && upscalingId === current.id;
  return (
    <section className="space-y-4">
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-stone-200/60 p-4 dark:bg-neutral-900">
        <motion.div layout style={ratioBox(current?.ratio ?? ratio)}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="relative max-h-[560px] w-full max-w-[560px] overflow-hidden rounded-2xl bg-stone-300 dark:bg-neutral-800">
          <AnimatePresence mode="wait">
            {loading || busy ? (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-banana-400/40 to-transparent"
                  animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }} />
                <p className="absolute inset-0 grid place-items-center text-sm opacity-70">{busy ? "Upscaling…" : "Painting pixels…"}</p>
              </motion.div>
            ) : current ? (
              <motion.img key={current.src.slice(-40)} src={current.src} alt={current.prompt}
                initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} className="h-full w-full object-cover" />
            ) : (
              <motion.p key="empty" className="absolute inset-0 grid place-items-center px-6 text-center text-sm opacity-60">
                Your image appears here. The frame matches the aspect ratio you pick.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {current && !loading && (
        <div className="flex flex-wrap gap-2">
          <button className={ghost} onClick={() => save(current)} disabled={!!saved}>{saved ? "Saved ✓" : "Save to gallery"}</button>
          <button className={ghost} onClick={() => upscale(current)} disabled={!!busy || current.upscaled}>{current.upscaled ? "Upscaled ✓" : "Upscale"}</button>
          <button className={ghost} onClick={() => share(current)}>Share</button>
          <button className={ghost} onClick={() => download(current)}>Download</button>
        </div>
      )}
    </section>
  );
}

function Gallery() {
  const { gallery, open, remove } = useStore();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <h2 className="mb-4 font-display text-xl font-bold">Gallery</h2>
      {gallery.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm opacity-70 dark:border-neutral-700">
          Nothing saved yet. Generate an image and choose Save to gallery.
        </p>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <AnimatePresence>
            {gallery.map((g) => (
              <motion.figure key={g.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl bg-stone-200 dark:bg-neutral-800">
                <button onClick={() => { open(g); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="block w-full">
                  <img src={g.src} alt={g.prompt} className="aspect-square w-full object-cover" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-2 text-xs text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button onClick={() => share(g)}>Share</button>
                  <button onClick={() => remove(g.id)}>Delete</button>
                </div>
                {g.upscaled && <span className="absolute left-2 top-2 rounded bg-banana-400 px-1.5 text-xs font-bold text-black">HD</span>}
              </motion.figure>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 lg:grid-cols-[380px_1fr]">
        <Controls />
        <Preview />
      </main>
      <Gallery />
    </>
  );
}
