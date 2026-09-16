import React, { useState } from "react";
import {
  Share2,
  Sparkles,
  Copy,
  Check,
  Image as ImageIcon,
  Download,
  Layers,
  Quote,
  Hash,
  Loader2,
  Palette,
  Send,
  MessageSquare,
  Vote,
  ExternalLink,
  RefreshCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { SocialPromoPackage, QuoteCardPrompt } from "../../types";
import { generateImage } from "../../services/ai/visualPromptService";
import { copyToClipboard } from "../../utils/helpers";

interface SocialPromoSectionProps {
  socialData: SocialPromoPackage | null;
  isGenerating: boolean;
  onGenerate: () => void;
  title?: string;
  sourceType?: "seo" | "shorts";
  channelName?: string;
}

export const SocialPromoSection: React.FC<SocialPromoSectionProps> = ({
  socialData,
  isGenerating,
  onGenerate,
  title = "видео",
  sourceType = "seo",
  channelName = "Наш Канал",
}) => {
  const [activePlatform, setActivePlatform] = useState<"community" | "telegram" | "instagram" | "quotes">("community");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [generatedCardImages, setGeneratedCardImages] = useState<Record<string, string>>({});
  const [generatingSlideKey, setGeneratingSlideKey] = useState<string | null>(null);
  const [generatedSlideImages, setGeneratedSlideImages] = useState<Record<string, string>>({});
  const [instaSubTab, setInstaSubTab] = useState<"caption" | "carousel">("caption");

  const handleCopy = (text: string, key: string, message = "Скопировано в буфер!") => {
    if (!text) return;
    copyToClipboard(text);
    setCopiedKey(key);
    toast.success(message);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const formatCardPrompt = (basePrompt: string, headline: string, caption: string) => {
    const template = `An elegant, abstract 1:1 square composition featuring a smooth dark glass sphere resting on a raw basalt stone, with warm golden light along the edges, deep contrast, and luxurious negative space.\nCentered in the frame is dark gold text in Russian Cyrillic: "${headline}" (Alegreya font, medium italic, 24 pt); "${caption}" (Montserrat font, small, italic, 16 pt).`;
    if (basePrompt && basePrompt.includes("basalt stone") && basePrompt.includes("Alegreya font")) {
      return basePrompt;
    }
    return basePrompt ? `${basePrompt}\n${template}` : template;
  };

  const handleGenerateSlideImage = async (slide: any, slideIdx: number) => {
    const slideKey = `slide-${slide.slideNumber || slideIdx + 1}`;
    const basePrompt =
      slide.imagePrompt ||
      `An aesthetic, minimalist 1:1 square conceptual editorial artwork representing "${slide.headline}", soft studio lighting, clean composition with generous negative space, 8k resolution`;
    const promptToUse = formatCardPrompt(basePrompt, slide.headline || "", slide.text || "");
    setGeneratingSlideKey(slideKey);
    const toastId = toast.loading(`Генерация 1:1 слайда #${slide.slideNumber || slideIdx + 1}...`);
    try {
      const imgUrl = await generateImage(promptToUse, "1:1");
      if (imgUrl) {
        setGeneratedSlideImages((prev) => ({
          ...prev,
          [slideKey]: imgUrl,
        }));
        toast.success(`1:1 фоновая картинка для слайда #${slide.slideNumber || slideIdx + 1} сгенерирована!`, { id: toastId });
      } else {
        toast.error("Не удалось получить изображение от AI", { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Ошибка генерации: ${e?.message || "Попробуйте снова"}`, { id: toastId });
    } finally {
      setGeneratingSlideKey(null);
    }
  };

  const handleGenerateCardImage = async (card: QuoteCardPrompt) => {
    setGeneratingCardId(card.id);
    const toastId = toast.loading(`Генерация 1:1 карточки-цитаты через AI...`);
    try {
      const basePrompt = card.visualPrompt || `Minimalist modern editorial quote card background, clean aesthetic textured gradient, soft ambient studio lighting, generous negative space in center for text layout, 8k, photorealistic --ar 1:1`;
      const fullPrompt = formatCardPrompt(basePrompt, card.quote || "", card.authorOrContext || "");
      const imgUrl = await generateImage(fullPrompt, "1:1");
      if (imgUrl) {
        setGeneratedCardImages((prev) => ({
          ...prev,
          [card.id]: imgUrl,
        }));
        toast.success("1:1 карточка сгенерирована!", { id: toastId });
      } else {
        toast.error("Не удалось получить изображение от AI", { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Ошибка генерации: ${e?.message || "Попробуйте снова"}`, { id: toastId });
    } finally {
      setGeneratingCardId(null);
    }
  };

  const downloadImage = (base64Url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = base64Url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Изображение скачано!");
  };

  const downloadCardWithText = async (
    badge: string,
    headline: string,
    text: string,
    bgImgUrl: string | undefined,
    filename: string
  ) => {
    const toastId = toast.loading("Формирование 1:1 карточки с текстом (кириллица)...");
    try {
      const canvas = document.createElement("canvas");
      const size = 1080;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Не удалось создать canvas контекст");

      // Render background image or gradient
      if (bgImgUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = bgImgUrl;
          });
          ctx.drawImage(img, 0, 0, size, size);

          // Contrast overlay
          const grad = ctx.createLinearGradient(0, 0, 0, size);
          grad.addColorStop(0, "rgba(10, 10, 15, 0.45)");
          grad.addColorStop(0.5, "rgba(10, 10, 15, 0.72)");
          grad.addColorStop(1, "rgba(10, 10, 15, 0.95)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, size, size);
        } catch {
          const grad = ctx.createLinearGradient(0, 0, size, size);
          grad.addColorStop(0, "#0d0f14");
          grad.addColorStop(1, "#181b24");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, size, size);
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, "#0d0e12");
        grad.addColorStop(0.5, "#151722");
        grad.addColorStop(1, "#090a0d");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Accent border
        ctx.strokeStyle = "rgba(236, 72, 153, 0.3)";
        ctx.lineWidth = 14;
        ctx.strokeRect(50, 50, size - 100, size - 100);
      }

      // Draw Badge
      if (badge) {
        ctx.font = "bold 24px 'Inter', system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#ec4899";
        ctx.textBaseline = "top";
        ctx.fillText(badge.toUpperCase(), 90, 90);
      }

      // Helper for text wrapping
      const wrapText = (
        context: CanvasRenderingContext2D,
        textToWrap: string,
        x: number,
        startY: number,
        maxWidth: number,
        lineHeight: number,
        font: string,
        color: string
      ) => {
        context.font = font;
        context.fillStyle = color;
        const words = textToWrap.split(" ");
        let line = "";
        let currentY = startY;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = context.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        context.fillText(line, x, currentY);
        return currentY + lineHeight;
      };

      let currentY = 160;

      // Draw Headline (Single Cyrillic Bold font)
      if (headline) {
        currentY = wrapText(
          ctx,
          headline,
          90,
          currentY,
          size - 180,
          58,
          "bold 46px 'Inter', system-ui, -apple-system, sans-serif",
          "#ffffff"
        );
        currentY += 24;
      }

      // Draw Text (Single Cyrillic Regular font)
      if (text) {
        currentY = wrapText(
          ctx,
          text,
          90,
          currentY,
          size - 180,
          42,
          "28px 'Inter', system-ui, -apple-system, sans-serif",
          "#cbd5e1"
        );
      }

      // Draw Brand footer
      ctx.font = "22px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillText(`@${channelName || " Shorts AI Studio"}`, 90, size - 90);

      const dataUrl = canvas.toDataURL("image/png");
      downloadImage(dataUrl, filename);
      toast.success("Готовая карточка с текстом скачана!", { id: toastId });
    } catch (e: any) {
      toast.error(`Ошибка сохранения карточки: ${e?.message || "Попробуйте снова"}`, { id: toastId });
    }
  };

  return (
    <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800/80 p-5 md:p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <Share2 size={18} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                Кросс-платформенные посты и карточки-цитаты (1:1)
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Готовый промо-пакет: YouTube Сообщество, Telegram, Instagram и промты для 1:1 цитат
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent/20 shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Создаем посты и цитаты...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>{socialData ? "Перегенерировать посты" : "Сгенерировать посты и цитаты"}</span>
            </>
          )}
        </button>
      </div>

      {/* Empty State */}
      {!socialData && !isGenerating && (
        <div className="py-10 px-4 text-center space-y-3 bg-neutral-950/60 rounded-2xl border border-dashed border-neutral-800">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Share2 size={24} className="text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h5 className="text-sm font-bold text-neutral-200">
              Создайте вирусное промо для всех площадок
            </h5>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Нажмите кнопку «Сгенерировать посты и цитаты», чтобы ИИ создал посты для YouTube Сообщества с опросом, структурированный пост для Telegram, карусель для Instagram и 1:1 карточки-цитаты с промтами для генераторов картинок.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/80 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={13} className="text-accent" />
            <span>Сгенерировать для «{title.slice(0, 30)}...»</span>
          </button>
        </div>
      )}

      {/* Content Display */}
      {socialData && (
        <div className="space-y-5 relative z-10">
          {/* Platform Tabs Navigation */}
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-950 rounded-2xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActivePlatform("community")}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activePlatform === "community"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>YouTube Сообщество</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("telegram")}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activePlatform === "telegram"
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
              }`}
            >
              <Send size={13} className="text-sky-400" />
              <span>Telegram Канал</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("instagram")}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activePlatform === "instagram"
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border border-pink-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
              <span>Instagram (Пост + Карусель)</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("quotes")}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activePlatform === "quotes"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
              }`}
            >
              <Quote size={13} className="text-amber-400" />
              <span>Карточки-цитаты 1:1 ({socialData.quoteCards?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: YOUTUBE COMMUNITY */}
          {activePlatform === "community" && socialData.communityPost && (
            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl p-4 md:p-5 space-y-4">
                {/* Header with copy all */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center font-bold text-xs border border-red-500/30">
                      YT
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">{channelName}</h5>
                      <span className="text-[10px] text-neutral-400">Вкладка «Сообщество» • Только что</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const fullText = `${socialData.communityPost.headline}\n\n${socialData.communityPost.text}\n\n${socialData.communityPost.callToAction}${
                        socialData.communityPost.poll
                          ? `\n\n📊 Опрос: ${socialData.communityPost.poll.question}\n${socialData.communityPost.poll.options
                              .map((o, idx) => `${idx + 1}. ${o}`)
                              .join("\n")}`
                          : ""
                      }`;
                      handleCopy(fullText, "yt-community-all", "Полный пост сообщества скопирован!");
                    }}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === "yt-community-all" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>Копировать весь пост</span>
                  </button>
                </div>

                {/* Headline & Body Text */}
                <div className="space-y-3">
                  {socialData.communityPost.headline && (
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {socialData.communityPost.headline}
                    </h4>
                  )}
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line bg-neutral-900/40 p-3.5 rounded-xl border border-neutral-800/60">
                    {socialData.communityPost.text}
                  </p>

                  {socialData.communityPost.callToAction && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-300 font-medium flex items-center justify-between">
                      <span>🎬 {socialData.communityPost.callToAction}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(socialData.communityPost.callToAction, "yt-cta", "Призыв к действию скопирован!")}
                        className="text-neutral-400 hover:text-white text-[10px] font-bold ml-2 cursor-pointer"
                      >
                        {copiedKey === "yt-cta" ? "Скопировано" : "Копировать"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Poll Block */}
                {socialData.communityPost.poll && (
                  <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Vote size={12} /> Интерактивный опрос для сообщества
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const pollText = `${socialData.communityPost.poll?.question}\n\nВарианты:\n${socialData.communityPost.poll?.options
                            .map((o, idx) => `${idx + 1}. ${o}`)
                            .join("\n")}`;
                          handleCopy(pollText, "yt-poll", "Вопрос и варианты опроса скопированы!");
                        }}
                        className="text-[10px] text-accent hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "yt-poll" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>Копировать опрос</span>
                      </button>
                    </div>

                    <p className="text-xs font-bold text-white">
                      {socialData.communityPost.poll.question}
                    </p>

                    <div className="space-y-2">
                      {socialData.communityPost.poll.options.map((option, idx) => (
                        <div
                          key={`poll-opt-${idx}`}
                          className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 hover:border-neutral-700 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-neutral-600 flex items-center justify-center text-[9px] text-neutral-400 font-bold">
                              {idx + 1}
                            </span>
                            <span>{option}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(option, `poll-opt-${idx}`, "Вариант ответа скопирован")}
                            className="text-neutral-500 hover:text-neutral-300 p-1 cursor-pointer"
                            title="Скопировать вариант"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TELEGRAM */}
          {activePlatform === "telegram" && socialData.telegramPost && (
            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl p-4 md:p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                      <Send size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">{channelName} | Telegram</h5>
                      <span className="text-[10px] text-neutral-400">Форматированный пост с инсайтами</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const bullets = (socialData.telegramPost.bulletPoints || []).map((b) => `${b}`).join("\n");
                      const tags = (socialData.telegramPost.hashtags || []).join(" ");
                      const tgText = `⚡ ${socialData.telegramPost.title}\n\n${socialData.telegramPost.text}\n\n${bullets}\n\n🎬 ${socialData.telegramPost.callToAction}\n\n${tags}`;
                      handleCopy(tgText, "tg-all", "Текст для Telegram скопирован!");
                    }}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === "tg-all" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>Копировать для Telegram</span>
                  </button>
                </div>

                {/* Telegram Message Box Styled */}
                <div className="p-4 bg-gradient-to-b from-sky-950/20 to-neutral-950 rounded-2xl border border-sky-500/20 space-y-3">
                  <h4 className="text-sm font-bold text-sky-300">
                    ⚡ {socialData.telegramPost.title}
                  </h4>

                  <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">
                    {socialData.telegramPost.text}
                  </p>

                  {/* Bullet points */}
                  {socialData.telegramPost.bulletPoints && socialData.telegramPost.bulletPoints.length > 0 && (
                    <div className="space-y-1.5 py-1">
                      {socialData.telegramPost.bulletPoints.map((point, idx) => (
                        <div key={`tg-bp-${idx}`} className="text-xs text-neutral-300 flex items-start gap-2">
                          <span className="text-sky-400 font-bold shrink-0">•</span>
                          <span>{point.replace(/^[•\-🔹\s]+/, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  {socialData.telegramPost.callToAction && (
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-200 font-semibold">
                      👉 {socialData.telegramPost.callToAction}
                    </div>
                  )}

                  {/* Hashtags */}
                  {socialData.telegramPost.hashtags && socialData.telegramPost.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {socialData.telegramPost.hashtags.map((tag, idx) => (
                        <span
                          key={`tg-ht-${idx}`}
                          onClick={() => handleCopy(tag, `tg-ht-${idx}`, `Хештег ${tag} скопирован!`)}
                          className="px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-md text-[10px] font-medium border border-sky-500/20 cursor-pointer transition-colors"
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INSTAGRAM */}
          {activePlatform === "instagram" && socialData.instagramPost && (
            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl p-4 md:p-5 space-y-4">
                {/* Subtabs for Insta */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setInstaSubTab("caption")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        instaSubTab === "caption"
                          ? "bg-pink-600 text-white shadow-sm"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Текст поста и хештеги
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstaSubTab("carousel")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        instaSubTab === "carousel"
                          ? "bg-pink-600 text-white shadow-sm"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Слайды карусели 1:1 ({socialData.instagramPost.carouselSlides?.length || 0})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const slidesText = (socialData.instagramPost.carouselSlides || [])
                        .map(
                          (s) => {
                            const p = formatCardPrompt(s.imagePrompt || "", s.headline || "", s.text || "");
                            return `[Слайд ${s.slideNumber}: ${s.headline}]\nТекст: ${s.text}${p ? `\nПромпт картинки (1:1):\n${p}` : ""}`;
                          }
                        )
                        .join("\n\n");
                      const tags = (socialData.instagramPost.hashtags || []).join(" ");
                      const instaAll = `${socialData.instagramPost.hookTitle}\n\n${socialData.instagramPost.caption}\n\n--- СЛАЙДЫ КАРУСЕЛИ И ПРОМПТЫ 1:1 ---\n${slidesText}\n\n${tags}`;
                      handleCopy(instaAll, "insta-all", "Весь контент Instagram скопирован!");
                    }}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === "insta-all" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>Копировать всё</span>
                  </button>
                </div>

                {/* Subtab 1: Caption */}
                {instaSubTab === "caption" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-pink-950/20 via-neutral-900 to-neutral-950 rounded-2xl border border-pink-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                          Хук первой строки (Stop-Scroll)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(socialData.instagramPost.hookTitle, "insta-hook", "Хук скопирован!")}
                          className="text-[10px] text-pink-400 hover:underline font-bold"
                        >
                          {copiedKey === "insta-hook" ? "Скопировано" : "Копировать"}
                        </button>
                      </div>
                      <h4 className="text-sm font-black text-white tracking-wide">
                        {socialData.instagramPost.hookTitle}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-300">Основной текст публикации:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(socialData.instagramPost.caption, "insta-cap", "Текст поста скопирован!")}
                          className="text-[10px] text-accent hover:underline font-bold cursor-pointer"
                        >
                          {copiedKey === "insta-cap" ? "Скопировано" : "Копировать текст"}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
                        {socialData.instagramPost.caption}
                      </p>
                    </div>

                    {/* Hashtags */}
                    {socialData.instagramPost.hashtags && socialData.instagramPost.hashtags.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                            <Hash size={12} className="text-pink-400" />
                            <span>Instagram Хештеги ({socialData.instagramPost.hashtags.length}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const tags = socialData.instagramPost.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
                              handleCopy(tags, "insta-tags", "Все хештеги Instagram скопированы!");
                            }}
                            className="text-[10px] text-accent hover:underline font-bold cursor-pointer"
                          >
                            {copiedKey === "insta-tags" ? "Скопировано" : "Копировать все хештеги"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                          {socialData.instagramPost.hashtags.map((tag, idx) => (
                            <span
                              key={`ig-ht-${idx}`}
                              onClick={() => handleCopy(tag, `ig-ht-${idx}`, `Хештег ${tag} скопирован!`)}
                              className="px-2 py-0.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 rounded-md text-[10px] font-medium border border-pink-500/20 cursor-pointer transition-colors"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtab 2: Carousel 1:1 Slides */}
                {instaSubTab === "carousel" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(socialData.instagramPost.carouselSlides || []).map((slide, idx) => {
                        const slideKey = `slide-${slide.slideNumber || idx + 1}`;
                        const generatedImg = generatedSlideImages[slideKey];
                        const isGeneratingThis = generatingSlideKey === slideKey;
                        const promptText =
                          slide.imagePrompt ||
                          `An aesthetic, minimalist 1:1 square conceptual editorial artwork representing "${slide.headline}", soft studio lighting, clean composition with generous negative space for text overlay, 8k resolution`;

                        return (
                          <div
                            key={`insta-slide-${idx}`}
                            className="bg-neutral-900/90 border border-neutral-800 hover:border-pink-500/40 p-4 rounded-2xl flex flex-col justify-between space-y-3.5 relative group transition-all shadow-md"
                          >
                            {/* Slide Header */}
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                Слайд {slide.slideNumber || idx + 1} • {slide.slideType || "инсайт"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const sText = `[Слайд ${slide.slideNumber || idx + 1}: ${slide.headline}]\n${slide.text}\n\nПромпт для картинки (1:1):\n${promptText}`;
                                  handleCopy(sText, `slide-${idx}`, `Слайд ${slide.slideNumber || idx + 1} скопирован!`);
                                }}
                                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                                title="Скопировать текст и промпт слайда"
                              >
                                {copiedKey === `slide-${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                            </div>

                            {/* Slide Content */}
                            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80 space-y-1.5">
                              <h5 className="text-xs font-black text-white tracking-wide uppercase">
                                {slide.headline}
                              </h5>
                              <p className="text-[11px] text-neutral-300 leading-relaxed">
                                {slide.text}
                              </p>
                            </div>

                            {/* Generated Image Preview if available */}
                            {generatedImg && (
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-pink-500/30 bg-black group/img">
                                <img
                                  src={generatedImg}
                                  alt={slide.headline}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadCardWithText(
                                        `СЛАЙД ${slide.slideNumber || idx + 1} • ${slide.slideType || "ИНСАЙТ"}`,
                                        slide.headline,
                                        slide.text,
                                        generatedImg,
                                        `slide_${slide.slideNumber || idx + 1}_with_text.png`
                                      )
                                    }
                                    className="w-full px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                                  >
                                    <Download size={13} />
                                    <span>Скачать карточку с текстом (1:1)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadImage(generatedImg, `slide_${slide.slideNumber || idx + 1}_background.png`)}
                                    className="w-full px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <ImageIcon size={12} />
                                    <span>Скачать только чистый фон</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Image Prompt Box */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1">
                                  <Palette size={11} className="text-pink-400" /> Промт картинки слайда (1:1):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(promptText, `sl-p-${idx}`, "Промпт слайда скопирован!")}
                                  className="text-[10px] text-pink-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedKey === `sl-p-${idx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                  <span>Копировать</span>
                                </button>
                              </div>
                              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-[10px] text-neutral-300 font-mono leading-relaxed max-h-24 overflow-y-auto">
                                {promptText}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-neutral-800 space-y-2">
                              <button
                                type="button"
                                onClick={() => handleGenerateSlideImage(slide, idx)}
                                disabled={isGeneratingThis}
                                className="w-full py-2 bg-neutral-850 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-neutral-700/80 cursor-pointer shadow-sm"
                              >
                                {isGeneratingThis ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin text-pink-400" />
                                    <span>Генерация 1:1 фонового арта AI...</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon size={13} className="text-pink-400" />
                                    <span>
                                      {generatedImg
                                        ? "Сгенерировать другой чистый фон (1:1)"
                                        : "Сгенерировать чистый фон AI (без текста)"}
                                    </span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  downloadCardWithText(
                                    `СЛАЙД ${slide.slideNumber || idx + 1} • ${slide.slideType || "ИНСАЙТ"}`,
                                    slide.headline,
                                    slide.text,
                                    generatedImg,
                                    `slide_${slide.slideNumber || idx + 1}_card.png`
                                  )
                                }
                                className="w-full py-2 bg-pink-950/60 hover:bg-pink-900/60 text-pink-200 border border-pink-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Download size={13} className="text-pink-400" />
                                <span>Скачать слайд с текстом (кириллица 1:1)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: QUOTE CARDS (1:1 FORMAT) */}
          {activePlatform === "quotes" && (
            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <Quote size={14} className="text-amber-400" />
                      Промты для карточек-цитат в формате 1:1 (Square)
                    </h5>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Детальные англоязычные промты для генерации графических карточек в Midjourney / DALL-E 3 / Imagen и встроенная генерация
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const allCards = (socialData.quoteCards || [])
                        .map(
                          (c, idx) => {
                            const p = formatCardPrompt(c.visualPrompt || "", c.quote || "", c.authorOrContext || "");
                            return `--- КАРТОЧКА-ЦИТАТА ${idx + 1} (1:1) ---\nЦитата: "${c.quote}"\nАвтор/Контекст: ${c.authorOrContext}\n\nПромт для нейросети (1:1):\n${p}\n\nДизайн-заметки:\n${c.designNotes}`;
                          }
                        )
                        .join("\n\n");
                      handleCopy(allCards, "all-quote-cards", "Все промты карточек-цитат скопированы!");
                    }}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === "all-quote-cards" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>Копировать все промты</span>
                  </button>
                </div>

                {/* Quote cards grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(socialData.quoteCards || []).map((card, idx) => {
                    const generatedImage = generatedCardImages[card.id];
                    const isGeneratingThis = generatingCardId === card.id;
                    const promptText = formatCardPrompt(card.visualPrompt || "", card.quote || "", card.authorOrContext || "");

                    return (
                      <div
                        key={card.id || `quote-card-${idx}`}
                        className="bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/30 rounded-2xl p-4 space-y-3.5 transition-all shadow-md flex flex-col justify-between"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <Quote size={10} />
                            <span>Карточка-цитата #{idx + 1} (1:1)</span>
                          </span>

                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                            Соотношение: 1:1
                          </span>
                        </div>

                        {/* Quote text display */}
                        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-2">
                          <p className="text-xs font-serif italic text-amber-100/90 leading-relaxed">
                            «{card.quote}»
                          </p>
                          {card.authorOrContext && (
                            <div className="text-[10px] text-neutral-400 font-bold tracking-wider text-right">
                              — {card.authorOrContext}
                            </div>
                          )}
                        </div>

                        {/* Image Preview if generated */}
                        {generatedImage && (
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-neutral-700 bg-black group">
                            <img
                              src={generatedImage}
                              alt={card.quote}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadCardWithText(
                                    "ЦИТАТА",
                                    card.authorOrContext ? `«${card.quote}»` : "",
                                    card.authorOrContext ? `— ${card.authorOrContext}` : `«${card.quote}»`,
                                    generatedImage,
                                    `quote_card_${idx + 1}_with_text.png`
                                  )
                                }
                                className="w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                              >
                                <Download size={13} />
                                <span>Скачать карточку с текстом (1:1)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadImage(generatedImage, `quote_card_${idx + 1}_background.png`)}
                                className="w-full px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <ImageIcon size={12} />
                                <span>Скачать только чистый фон</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Visual Prompt Box */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                              <Palette size={11} className="text-amber-400" /> Промт для Midjourney / Imagen (1:1):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(promptText, `qc-p-${idx}`, "Промт скопирован!")}
                              className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `qc-p-${idx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>Копировать промт</span>
                            </button>
                          </div>
                          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-[10px] text-neutral-300 font-mono leading-relaxed max-h-24 overflow-y-auto">
                            {promptText}
                          </div>
                        </div>

                        {/* Design notes */}
                        {card.designNotes && (
                          <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg text-[10px] text-amber-200/90 leading-relaxed">
                            <span className="font-bold text-amber-300">💡 Стиль и типографика:</span> {card.designNotes}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-neutral-800 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateCardImage(card)}
                            disabled={isGeneratingThis}
                            className="w-full py-2 bg-neutral-850 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-neutral-700/80 cursor-pointer shadow-sm"
                          >
                            {isGeneratingThis ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-amber-400" />
                                <span>Генерация 1:1 фона AI...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon size={13} className="text-amber-400" />
                                <span>
                                  {generatedImage ? "Сгенерировать другой чистый фон (1:1)" : "Сгенерировать чистый фон AI (без текста)"}
                                </span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              downloadCardWithText(
                                "ЦИТАТА",
                                `«${card.quote}»`,
                                card.authorOrContext ? `— ${card.authorOrContext}` : "",
                                generatedImage,
                                `quote_card_${idx + 1}_with_text.png`
                              )
                            }
                            className="w-full py-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Download size={13} className="text-amber-400" />
                            <span>Скачать цитату с текстом (кириллица 1:1)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
