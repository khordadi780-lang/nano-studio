// "Nano Banana" = Gemini 2.5 Flash Image
const MODEL = "gemini-2.5-flash-image";
const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export type Ratio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

async function callGemini(parts: unknown[], aspectRatio?: Ratio): Promise<string> {
  if (!KEY) throw new Error("Add VITE_GEMINI_API_KEY to your .env file.");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          ...(aspectRatio && { imageConfig: { aspectRatio } }),
        },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Generation failed.");
  const img = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
  const inline = img?.inlineData ?? img?.inline_data;
  if (!inline) throw new Error("No image returned. Try rephrasing the prompt.");
  return `data:${inline.mimeType ?? inline.mime_type ?? "image/png"};base64,${inline.data}`;
}

export const generateImage = (prompt: string, style: string, ratio: Ratio) =>
  callGemini([{ text: style === "None" ? prompt : `${prompt}. Style: ${style}.` }], ratio);

export async function upscaleImage(dataUrl: string): Promise<string> {
  const custom = import.meta.env.VITE_UPSCALE_URL as string | undefined;
  if (custom) {
    // Plug in Real-ESRGAN / SwinIR behind your own endpoint.
    const res = await fetch(custom, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!res.ok) throw new Error("Upscale service failed.");
    return (await res.json()).image;
  }
  // Default: super-resolution via Nano Banana image editing.
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/png";
  return callGemini([
    { text: "Upscale this image to maximum resolution. Restore fine detail and sharpness without changing composition, colors or content." },
    { inlineData: { mimeType, data } },
  ]);
}
