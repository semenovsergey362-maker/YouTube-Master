import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "../config/logger";
import JSZip from "jszip";
import { getFullScriptText, handleAppError } from "../utils/helpers";
import {
  cutLongFormScriptToShorts,
  analyzeShortsTopicRetention,
  optimizeShortsRetentionAndIntegrate,
  generateSeamlessLoopEnding,
  generateShortsMusicPrompt,
  generateDetailedPromptForScene,
  generateShortsSEO,
  generateShortsHashtags,
  analyzeShortsCTR,
  optimizeTitle,
  type CutShortItem,
  type ShortsTopicRetentionAnalysis,
  type ShortsSEO,
  type ShortsHashtagsResult,
  type ShortsCtrAnalysisResult,
  type VideoSEO,
  type NicheData,
  type GeneratedBlock,
} from "../services/geminiService";

export interface UseShortsGenerationProps {
  videoSEO: VideoSEO | null;
  selectedModel: string;
  isCustomInstructionsEnabled: boolean;
  customInstructions: string;
  nicheData: NicheData | null;
  selectedBranding: any;
  generatedBlocks: Record<number, GeneratedBlock>;
  handleGeminiError?: (error: any, defaultMessage: string) => void;
}

const cleanShortsVoiceoverText = (text: string) =>
  text
    .replace(/\[(?:КАДР|ЗВУК|ПАУЗА)(?=[\s:\]])[^\]]*\]/giu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function useShortsGeneration(props: UseShortsGenerationProps) {
  const {
    videoSEO,
    selectedModel,
    isCustomInstructionsEnabled,
    customInstructions,
    nicheData,
    selectedBranding,
    generatedBlocks,
    handleGeminiError,
  } = props;

  // Shorts Tab states for Smart Cutting & Seamless Loop Hooks
  const [shortsActiveSubTab, setShortsActiveSubTab] = useState<"cut" | "loop" | "visuals" | "seo">("cut");
  const [longFormScriptToCut, setLongFormScriptToCut] = useState("");
  const [cutShortsResults, setCutShortsResults] = useState<CutShortItem[]>([]);
  const [isCuttingLongForm, setIsCuttingLongForm] = useState(false);
  const [selectedShortForVisuals, setSelectedShortForVisuals] = useState<string>("");
  const [shortsVisuals, setShortsVisuals] = useState<{ text: string; prompt: string }[]>([]);
  const [shortsMusicPrompt, setShortsMusicPrompt] = useState<string>("");
  const [isGeneratingShortsVisuals, setIsGeneratingShortsVisuals] = useState(false);
  const [selectedShortForSeo, setSelectedShortForSeo] = useState<string>("");
  const [shortsSeoResult, setShortsSeoResult] = useState<ShortsSEO | null>(null);
  const [isGeneratingShortsSeo, setIsGeneratingShortsSeo] = useState(false);
  const [generatingLoopForCard, setGeneratingLoopForCard] = useState<Record<number, boolean>>({});
  const [shortsSeoError, setShortsSeoError] = useState<string | null>(null);
  const [loopErrorForCard, setLoopErrorForCard] = useState<Record<number, string | null>>({});

  // Shorts CTR & clickability analysis states
  const [shortsCtrTitle, setShortsCtrTitle] = useState("");
  const [shortsCtrDescription, setShortsCtrDescription] = useState("");
  const [shortsCtrResult, setShortsCtrResult] = useState<ShortsCtrAnalysisResult | null>(null);
  const [isAnalyzingShortsCtr, setIsAnalyzingShortsCtr] = useState(false);
  const [shortsCtrError, setShortsCtrError] = useState<string | null>(null);

  // Shorts Hashtag Generator states
  const [isGeneratingShortsHashtags, setIsGeneratingShortsHashtags] = useState(false);
  const [shortsHashtagsResult, setShortsHashtagsResult] = useState<ShortsHashtagsResult | null>(null);
  const [shortsHashtagsCopied, setShortsHashtagsCopied] = useState(false);

  // Shorts Topic Retention Analysis & Optimization states
  const [analyzingShortRetentionForCard, setAnalyzingShortRetentionForCard] = useState<Record<number, boolean>>({});
  const [optimizingShortRetentionForCard, setOptimizingShortRetentionForCard] = useState<Record<number, boolean>>({});
  const [hiddenRetentionCards, setHiddenRetentionCards] = useState<Record<number, boolean>>({});
  const [longFormRetentionAnalysis, setLongFormRetentionAnalysis] = useState<ShortsTopicRetentionAnalysis | null>(null);
  const [isAnalyzingLongFormRetention, setIsAnalyzingLongFormRetention] = useState(false);

  // Persistence for Shorts Tab
  const [isShortsRestored, setIsShortsRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("shortsTabState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shortsActiveSubTab) setShortsActiveSubTab(parsed.shortsActiveSubTab);
        if (parsed.longFormScriptToCut) setLongFormScriptToCut(parsed.longFormScriptToCut);
        if (parsed.cutShortsResults) setCutShortsResults(parsed.cutShortsResults);
        if (parsed.selectedShortForVisuals) setSelectedShortForVisuals(parsed.selectedShortForVisuals);
        if (parsed.shortsVisuals) setShortsVisuals(parsed.shortsVisuals);
        if (parsed.shortsMusicPrompt) setShortsMusicPrompt(parsed.shortsMusicPrompt);
        if (parsed.selectedShortForSeo) setSelectedShortForSeo(parsed.selectedShortForSeo);
        if (parsed.shortsSeoResult) setShortsSeoResult(parsed.shortsSeoResult);
      }
    } catch (e) {
      logger.error("Error restoring Shorts state:", e);
    }
    setIsShortsRestored(true);
  }, []);

  useEffect(() => {
    if (!isShortsRestored) return;
    try {
      const stateToSave = {
        shortsActiveSubTab,
        longFormScriptToCut,
        cutShortsResults,
        selectedShortForVisuals,
        shortsVisuals,
        shortsMusicPrompt,
        selectedShortForSeo,
        shortsSeoResult,
      };
      localStorage.setItem("shortsTabState", JSON.stringify(stateToSave));
    } catch (e) {
      logger.error("Error saving Shorts state:", e);
    }
  }, [
    isShortsRestored,
    shortsActiveSubTab,
    longFormScriptToCut,
    cutShortsResults,
    selectedShortForVisuals,
    shortsVisuals,
    shortsMusicPrompt,
    selectedShortForSeo,
    shortsSeoResult,
  ]);

  useEffect(() => {
    if (!cutShortsResults.length) {
      if (selectedShortForSeo) {
        setSelectedShortForSeo("");
      }
      return;
    }

    const isSelectedStillValid = cutShortsResults.some(
      (item) =>
        item.loopEnding?.loopedFullScript === selectedShortForSeo ||
        item.script === selectedShortForSeo
    );

    if (!isSelectedStillValid) {
      const fallback = cutShortsResults[0]?.loopEnding?.loopedFullScript || cutShortsResults[0]?.script || "";
      if (fallback) {
        setSelectedShortForSeo(fallback);
      }
    }
  }, [cutShortsResults, selectedShortForSeo]);

  useEffect(() => {
    if (!longFormScriptToCut && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const text = getFullScriptText(generatedBlocks);
      if (text && text.trim()) {
        setLongFormScriptToCut(text.trim());
      }
    }
  }, [generatedBlocks, longFormScriptToCut]);

  const onError = (error: any, defaultMessage: string) => {
    if (handleGeminiError) {
      handleGeminiError(error, defaultMessage);
    } else {
      handleAppError(error, defaultMessage);
    }
  };

  const handleAnalyzeLongFormRetention = async () => {
    let text = longFormScriptToCut.trim();
    if (!text && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const fullText = getFullScriptText(generatedBlocks);
      if (fullText && fullText.trim()) {
        text = fullText.trim();
        setLongFormScriptToCut(text);
      }
    }
    if (!text) {
      toast.error("Пожалуйста, введите или загрузите длинный сценарий");
      return;
    }
    setIsAnalyzingLongFormRetention(true);
    try {
      const result = await analyzeShortsTopicRetention(text, "Long-Form Сценарий", "Главное вступление");
      setLongFormRetentionAnalysis(result);
      toast.success("ИИ-анализ удержания тем для Long-Form успешно завершён!");
    } catch (error) {
      onError(error, "Ошибка при анализе удержания Long-Form");
    } finally {
      setIsAnalyzingLongFormRetention(false);
    }
  };

  const handleAnalyzeShortTopicRetention = async (idx: number, item: CutShortItem) => {
    const scriptToAnalyze = item.loopEnding?.loopedFullScript || item.script;
    setAnalyzingShortRetentionForCard((prev) => ({ ...prev, [idx]: true }));
    try {
      const analysis = await analyzeShortsTopicRetention(scriptToAnalyze, item.title, item.hook);
      const updated = [...cutShortsResults];
      updated[idx] = {
        ...updated[idx],
        retentionAnalysis: analysis,
      };
      setCutShortsResults(updated);
      toast.success(`Анализ удержания тем для "${item.title}" завершён! Оценка: ${analysis.overallScore}%`);
    } catch (error) {
      onError(error, "Ошибка анализа удержания тем");
    } finally {
      setAnalyzingShortRetentionForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleOptimizeShortRetention = async (idx: number, item: CutShortItem) => {
    const currentScript = item.loopEnding?.loopedFullScript || item.script;
    setOptimizingShortRetentionForCard((prev) => ({ ...prev, [idx]: true }));
    try {
      const result = await optimizeShortsRetentionAndIntegrate(
        currentScript,
        item.title,
        item.retentionAnalysis
      );

      const updated = [...cutShortsResults];
      if (updated[idx].loopEnding) {
        updated[idx].loopEnding = {
          ...updated[idx].loopEnding!,
          loopedFullScript: result.optimizedScript,
        };
      } else {
        updated[idx].script = result.optimizedScript;
      }
      if (result.optimizedHook) {
        updated[idx].hook = result.optimizedHook;
      }
      updated[idx].optimizedResult = result;
      setCutShortsResults(updated);
      setHiddenRetentionCards((prev) => ({ ...prev, [idx]: true }));
      toast.success(`Сценарий "${item.title}" успешно оптимизирован! ${result.expectedRetentionGain}`);
    } catch (error) {
      onError(error, "Ошибка при оптимизации и внедрении рекомендаций");
    } finally {
      setOptimizingShortRetentionForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleApplyTitleToSeo = (title: string) => {
    setShortsCtrTitle(title);
    const index = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    if (index !== -1) {
      const updated = [...cutShortsResults];
      if (updated[index].seo) {
        const currentSeo = updated[index].seo!;
        const newTitles = [...(currentSeo.titles || [])];
        if (newTitles.length > 0) {
          newTitles[0] = title;
        } else {
          newTitles.push(title);
        }
        const updatedSeo = {
          ...currentSeo,
          titles: newTitles,
        };
        updated[index].seo = updatedSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(updatedSeo);
        toast.success("Заголовок применен к Анализатору и к Пакетному SEO!");
      } else {
        const newSeo: ShortsSEO = {
          titles: [title],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        updated[index].seo = newSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(newSeo);
        toast.success("Заголовок применен к Анализатору и создан новый SEO-пакет!");
      }
    } else {
      if (shortsSeoResult) {
        const newTitles = [...(shortsSeoResult.titles || [])];
        if (newTitles.length > 0) {
          newTitles[0] = title;
        } else {
          newTitles.push(title);
        }
        setShortsSeoResult({
          ...shortsSeoResult,
          titles: newTitles,
        });
        toast.success("Заголовок применен к Анализатору и к Пакетному SEO!");
      } else {
        setShortsSeoResult({
          titles: [title],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        });
        toast.success("Заголовок применен к Анализатору и создан новый SEO-пакет!");
      }
    }
  };

  const handleApplyDescriptionToSeo = (description: string) => {
    setShortsCtrDescription(description);
    const index = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    if (index !== -1) {
      const updated = [...cutShortsResults];
      if (updated[index].seo) {
        const currentSeo = updated[index].seo!;
        const oldDescription = currentSeo.description || "";
        let newDescription = description;
        const paragraphs = oldDescription.split("\n");
        if (paragraphs.length > 1) {
          paragraphs[0] = description;
          newDescription = paragraphs.join("\n");
        } else {
          newDescription = description;
        }
        const updatedSeo = {
          ...currentSeo,
          description: newDescription,
        };
        updated[index].seo = updatedSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(updatedSeo);
        toast.success("Описание применено к Анализатору и к Пакетному SEO!");
      } else {
        const newSeo: ShortsSEO = {
          titles: [],
          description: description,
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        updated[index].seo = newSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(newSeo);
        toast.success("Описание применено к Анализатору и создан новый SEO-пакет!");
      }
    } else {
      if (shortsSeoResult) {
        const oldDescription = shortsSeoResult.description || "";
        let newDescription = description;
        const paragraphs = oldDescription.split("\n");
        if (paragraphs.length > 1) {
          paragraphs[0] = description;
          newDescription = paragraphs.join("\n");
        } else {
          newDescription = description;
        }
        setShortsSeoResult({
          ...shortsSeoResult,
          description: newDescription,
        });
        toast.success("Описание применено к Анализатору и к Пакетному SEO!");
      } else {
        setShortsSeoResult({
          titles: [],
          description: description,
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        });
        toast.success("Описание применено к Анализатору и создан новый SEO-пакет!");
      }
    }
  };

  const handleApplyLongFormSeoToShorts = (targetScriptText?: string) => {
    if (!videoSEO || (!videoSEO.keywords && (!videoSEO.hashtags || videoSEO.hashtags.length === 0))) {
      toast.error(
        "В разделе SEO (для длинных видео) пока нет ключевых слов или хештегов. Заполните или сгенерируйте SEO во вкладке 'SEO'."
      );
      return;
    }
    // Extract raw keywords from videoSEO.keywords
    const rawKeywords =
      typeof videoSEO.keywords === "string"
        ? videoSEO.keywords.split(/[,;\n]+/).map((k) => k.trim()).filter(Boolean)
        : Array.isArray(videoSEO.keywords)
        ? (videoSEO.keywords as string[]).map((k) => String(k).trim()).filter(Boolean)
        : [];

    // Extract raw hashtags from videoSEO.hashtags
    const rawHashtags = Array.isArray(videoSEO.hashtags)
      ? videoSEO.hashtags
          .map((h) => {
            const clean = h.trim().replace(/^#/, "");
            return clean ? `#${clean}` : "";
          })
          .filter(Boolean)
      : [];

    const defaultShortsTags = ["#Shorts", "#YouTubeShorts", "#шортс"];
    const combinedHashtags = Array.from(new Set([...rawHashtags, ...defaultShortsTags]));

    const scriptKey = targetScriptText || selectedShortForSeo;
    const targetIndex = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === scriptKey || item.script === scriptKey
    );

    if (targetIndex !== -1) {
      const updated = [...cutShortsResults];
      const existingSeo = updated[targetIndex].seo;
      const mergedKeywords = Array.from(new Set([...(existingSeo?.keywords || []), ...rawKeywords]));
      const mergedHashtags = Array.from(new Set([...(existingSeo?.hashtags || []), ...combinedHashtags]));

      let updatedDesc = existingSeo?.description || "";
      if (updatedDesc) {
        const hashtagsString = mergedHashtags.slice(0, 5).join(" ");
        if (!updatedDesc.includes("#Shorts") && !updatedDesc.includes("#shorts")) {
          updatedDesc = `${updatedDesc}\n\n${hashtagsString}`;
        }
      } else {
        updatedDesc = `${videoSEO.description || ""}\n\n${mergedHashtags.slice(0, 5).join(" ")}`.trim();
      }

      const newSeo: ShortsSEO = {
        titles:
          existingSeo?.titles && existingSeo.titles.length > 0
            ? existingSeo.titles
            : [updated[targetIndex].title || videoSEO.title || "Shorts"],
        description: updatedDesc,
        keywords: mergedKeywords,
        hashtags: mergedHashtags,
        pinnedComment: existingSeo?.pinnedComment || videoSEO.pinnedComment || "",
      };

      updated[targetIndex].seo = newSeo;
      setCutShortsResults(updated);
      setShortsSeoResult(newSeo);
      setSelectedShortForSeo(updated[targetIndex].loopEnding?.loopedFullScript || updated[targetIndex].script);
      toast.success(
        `Настройки SEO применены к Shorts #${targetIndex + 1}! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
      );
    } else {
      const mergedKeywords = Array.from(new Set([...(shortsSeoResult?.keywords || []), ...rawKeywords]));
      const mergedHashtags = Array.from(new Set([...(shortsSeoResult?.hashtags || []), ...combinedHashtags]));

      let updatedDesc = shortsSeoResult?.description || "";
      if (updatedDesc) {
        const hashtagsString = mergedHashtags.slice(0, 5).join(" ");
        if (!updatedDesc.includes("#Shorts") && !updatedDesc.includes("#shorts")) {
          updatedDesc = `${updatedDesc}\n\n${hashtagsString}`;
        }
      } else {
        updatedDesc = `${videoSEO.description || ""}\n\n${mergedHashtags.slice(0, 5).join(" ")}`.trim();
      }

      const newSeo: ShortsSEO = {
        titles:
          shortsSeoResult?.titles && shortsSeoResult.titles.length > 0
            ? shortsSeoResult.titles
            : videoSEO.title
            ? [videoSEO.title]
            : ["Вирусный Shorts"],
        description: updatedDesc,
        keywords: mergedKeywords,
        hashtags: mergedHashtags,
        pinnedComment: shortsSeoResult?.pinnedComment || videoSEO.pinnedComment || "",
      };

      setShortsSeoResult(newSeo);
      if (cutShortsResults.length > 0) {
        const updated = [...cutShortsResults];
        updated[0].seo = newSeo;
        setCutShortsResults(updated);
        setSelectedShortForSeo(updated[0].loopEnding?.loopedFullScript || updated[0].script);
        toast.success(
          `Настройки SEO применены к Shorts #1! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
        );
      } else {
        toast.success(
          `Настройки SEO применены к активному пакету Shorts! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
        );
      }
    }
  };

  const handleGenerateShortsHashtags = async (customTitle?: string, customScript?: string) => {
    const activeItem = cutShortsResults.find(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    const title = customTitle || shortsCtrTitle || activeItem?.title || videoSEO?.title || "Shorts видео";
    const script =
      customScript ||
      selectedShortForSeo ||
      activeItem?.loopEnding?.loopedFullScript ||
      activeItem?.script ||
      longFormScriptToCut ||
      "Короткое видео для Shorts";

    setIsGeneratingShortsHashtags(true);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await generateShortsHashtags(title, script, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsHashtagsResult(result);

      if (result.hashtags && result.hashtags.length > 0) {
        if (selectedShortForSeo) {
          setCutShortsResults((prev) =>
            prev.map((item) => {
              const actual = item.loopEnding?.loopedFullScript || item.script;
              if (actual === selectedShortForSeo || item.script === selectedShortForSeo) {
                const prevSeo = item.seo || {
                  titles: [item.title || title],
                  description: "",
                  keywords: [],
                  hashtags: [],
                  pinnedComment: "",
                };
                return {
                  ...item,
                  seo: {
                    ...prevSeo,
                    hashtags: result.hashtags,
                  },
                };
              }
              return item;
            })
          );
        }
        setShortsSeoResult((prev) => {
          if (prev) {
            return { ...prev, hashtags: result.hashtags };
          }
          return {
            titles: [title],
            description: "",
            keywords: [],
            hashtags: result.hashtags,
            pinnedComment: "",
          };
        });
      }
      toast.success(`Сгенерировано ${result.hashtags.length} релевантных хештегов для Shorts!`);
    } catch (error) {
      onError(error, "Ошибка при генерации хештегов Shorts");
    } finally {
      setIsGeneratingShortsHashtags(false);
    }
  };

  const handleCopyShortsHashtags = (hashtagsToCopy?: string[] | string) => {
    let text = "";
    if (typeof hashtagsToCopy === "string" && hashtagsToCopy.trim()) {
      text = hashtagsToCopy.trim();
    } else if (Array.isArray(hashtagsToCopy) && hashtagsToCopy.length > 0) {
      text = hashtagsToCopy.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    } else if (shortsHashtagsResult?.formattedString) {
      text = shortsHashtagsResult.formattedString;
    } else if (shortsHashtagsResult?.hashtags && shortsHashtagsResult.hashtags.length > 0) {
      text = shortsHashtagsResult.hashtags.join(" ");
    } else {
      const current = cutShortsResults.find(
        (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
      )?.seo?.hashtags || shortsSeoResult?.hashtags;
      if (current && current.length > 0) {
        text = current.join(" ");
      }
    }
    if (!text) {
      toast.error("Список хештегов пуст. Сгенерируйте хештеги перед копированием.");
      return;
    }
    navigator.clipboard.writeText(text);
    setShortsHashtagsCopied(true);
    setTimeout(() => setShortsHashtagsCopied(false), 2000);
    toast.success(`Хештеги скопированы в буфер обмена! (${text.split(/\s+/).filter(Boolean).length} шт.)`);
  };

  const handleCutLongFormScript = async () => {
    let text = longFormScriptToCut.trim();
    if (!text && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const fullText = getFullScriptText(generatedBlocks);
      if (fullText && fullText.trim()) {
        text = fullText.trim();
        setLongFormScriptToCut(text);
      }
    }
    if (!text) {
      toast.error("Пожалуйста, введите или вставьте длинный сценарий (или сгенерируйте его во вкладке «Сценарий»)");
      return;
    }
    setIsCuttingLongForm(true);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const results = await cutLongFormScriptToShorts(text, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });

      if (!results || results.length === 0) {
        setCutShortsResults([]);
        toast.error("Не удалось сгенерировать Shorts. Попробуйте упростить или сократить исходный сценарий и повторите попытку.");
        return;
      }

      setCutShortsResults(results);

      if (results.length < 3) {
        toast.warning(
          `Сгенерировано ${results.length} Shorts — автоматически создано дополнительные варианты из исходного текста, чтобы получить минимум 3.`
        );
      } else if (results.length > 5) {
        toast.info(`Сгенерировано ${results.length} Shorts — отображаются первые 5.`);
      } else {
        toast.success(`Успешно выделено ${results.length} Shorts с индивидуальными хуками!`);
      }

      const tooShort = results.filter((r) => {
        const m = String(r.duration || "").match(/(\d{1,4})/);
        return !m || parseInt(m[1], 10) < 60;
      });
      if (tooShort.length > 0) {
        toast.info("Некоторые Shorts были дополнены, чтобы достигать минимальной длительности 60 секунд.");
      }
    } catch (error) {
      onError(error, "Ошибка при умной нарезке сценария");
      const sourceWords = text.split(/\s+/).filter(Boolean);
      const fallbackParts = Math.min(3, Math.max(1, sourceWords.length));
      const fallbackChunkSize = Math.ceil(sourceWords.length / fallbackParts);
      const fallbackResults: CutShortItem[] = [];

      for (let index = 0; index < fallbackParts; index += 1) {
        const script = sourceWords
          .slice(index * fallbackChunkSize, (index + 1) * fallbackChunkSize)
          .join(" ")
          .trim();
        if (!script) continue;
        fallbackResults.push({
          title: `Shorts #${index + 1}`,
          hook: script.slice(0, 120),
          script,
          viral_potential: "Высокий потенциал удержания",
          duration: "60-90 сек",
        });
      }

      if (fallbackResults.length > 0) {
        setCutShortsResults(fallbackResults);
        toast.warning("Shorts созданы из исходного текста без ИИ-нарезки.");
      }
    } finally {
      setIsCuttingLongForm(false);
    }
  };

  const handleGenerateLoopForCard = async (idx: number, script: string) => {
    setGeneratingLoopForCard((prev) => ({ ...prev, [idx]: true }));
    setLoopErrorForCard((prev) => ({ ...prev, [idx]: null }));
    try {
      const result = await generateSeamlessLoopEnding(script);
      setCutShortsResults((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          loopEnding: result,
        };
        return updated;
      });
      toast.success(`Бесшовная концовка для Shorts #${idx + 1} успешно сгенерирована!`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setLoopErrorForCard((prev) => ({ ...prev, [idx]: errMsg }));
      onError(error, "Ошибка при генерации зацикленной концовки");
    } finally {
      setGeneratingLoopForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleGenerateShortsVisuals = async (shortText: string) => {
    if (!shortText.trim()) return;
    const voiceoverText = cleanShortsVoiceoverText(shortText);
    if (!voiceoverText) return;
    setSelectedShortForVisuals(shortText);
    setShortsActiveSubTab("visuals");
    setIsGeneratingShortsVisuals(true);
    setShortsVisuals([]);
    setShortsMusicPrompt("");
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";

      // Визуализация Shorts должна быть разбита на реальные 5-секундные сцены.
      // Не полагаемся на один большой JSON-ответ Gemini: при длинном сценарии
      // модель может вернуть только 1 сцену или обрезать массив по maxOutputTokens.
      const words = voiceoverText.split(/\s+/).filter(Boolean);
      const MAX_SCENES = 20;
      const MAX_WORDS_PER_SCENE = Math.max(12, Math.ceil(words.length / MAX_SCENES));
      const chunks: string[] = [];

      // Стараемся сохранять границы предложений, но никогда не превышаем ~5 секунд.
      const sentences = voiceoverText
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?…])\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      let current = "";
      const flushWords = (text: string) => {
        const partWords = text.split(/\s+/).filter(Boolean);
        for (let i = 0; i < partWords.length; i += MAX_WORDS_PER_SCENE) {
          chunks.push(partWords.slice(i, i + MAX_WORDS_PER_SCENE).join(" "));
          if (chunks.length >= MAX_SCENES) return;
        }
      };

      for (const sentence of sentences) {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.split(/\s+/).filter(Boolean).length <= MAX_WORDS_PER_SCENE) {
          current = candidate;
        } else {
          if (current) flushWords(current);
          current = sentence;
          if (current.split(/\s+/).filter(Boolean).length > MAX_WORDS_PER_SCENE) {
            flushWords(current);
            current = "";
          }
        }
        if (chunks.length >= MAX_SCENES) break;
      }
      if (current && chunks.length < MAX_SCENES) flushWords(current);

      // Защита от крайне короткого/нестандартного текста.
      if (chunks.length === 0 && words.length > 0) {
        for (let i = 0; i < words.length && chunks.length < MAX_SCENES; i += MAX_WORDS_PER_SCENE) {
          chunks.push(words.slice(i, i + MAX_WORDS_PER_SCENE).join(" "));
        }
      }

      const visualsOut: { text: string; prompt: string }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const style = {
          imageStyle:
            selectedBranding?.visualAestheticDescription ||
            "Ultra-realistic cinematic, photorealistic, vertical 9:16, optimized for Google Veo 3",
          animationType: "Dynamic cinematic camera movement with natural physical motion",
        };
        const sceneObj = {
          text: chunk,
          timecode: `${i * 5}-${(i + 1) * 5}s`,
          mood: "",
          audio: {},
        };

        try {
          const detailed = await generateDetailedPromptForScene(style, sceneObj, {
            model: selectedModel,
            customInstruction: activeCustomInstructions,
            branding: selectedBranding,
            veoSfxEnabled: true,
          } as any);

          const prompt =
            detailed.videoPrompt1 ||
            detailed.videoPrompt2 ||
            "";

          if (!prompt.trim()) {
            throw new Error("ИИ вернул пустой промпт сцены");
          }

          visualsOut.push({ text: chunk, prompt: prompt.trim() });
        } catch (sceneError) {
          logger.warn(`Ошибка генерации Veo 3 промпта для сцены ${i + 1}`, sceneError);
          // Не подменяем сцену исходным текстом: показываем понятную ошибку,
          // чтобы пользователь видел, какая именно сцена требует повторной генерации.
          visualsOut.push({
            text: chunk,
            prompt: `Veo 3 prompt generation failed for scene ${i + 1}. Please regenerate this visualization.`,
          });
        }
      }

      setShortsVisuals(visualsOut);

      // Музыка генерируется отдельно и остаётся одним общим промптом на весь Shorts.
      try {
          const mp = await generateShortsMusicPrompt(voiceoverText, {
          model: selectedModel,
          niche: nicheData,
          branding: selectedBranding,
          videoSEO: videoSEO,
          customInstructions: activeCustomInstructions,
        } as any);
        setShortsMusicPrompt(mp || "");
      } catch (errMusic) {
        logger.warn("generateShortsMusicPrompt failed:", errMusic);
        setShortsMusicPrompt("");
      }

      toast.success(`Сгенерировано ${visualsOut.length} сцен по ~5 секунд и один музыкальный промпт.`);
    } catch (error) {
      onError(error, "Ошибка при генерации промптов для сцен Shorts");
    } finally {
      setIsGeneratingShortsVisuals(false);
    }
  };

  const handleDeleteShort = (index: number) => {
    setCutShortsResults((prev) => {
      const targetItem = prev[index];
      const newResults = prev.filter((_, i) => i !== index);

      if (targetItem) {
        const targetScript = targetItem.loopEnding?.loopedFullScript || targetItem.script;
        if (selectedShortForSeo === targetScript || selectedShortForSeo === targetItem.script) {
          if (newResults.length > 0) {
            setSelectedShortForSeo(newResults[0].loopEnding?.loopedFullScript || newResults[0].script);
          } else {
            setSelectedShortForSeo("");
          }
        }
        if (selectedShortForVisuals === targetScript || selectedShortForVisuals === targetItem.script) {
          if (newResults.length > 0) {
            setSelectedShortForVisuals(newResults[0].loopEnding?.loopedFullScript || newResults[0].script);
          } else {
            setSelectedShortForVisuals("");
          }
        }
      }
      return newResults;
    });
    toast.success("Сценарий Shorts удален!");
  };

  const handleGenerateShortsSeo = async (shortText: string) => {
    if (!shortText.trim()) return;
    setSelectedShortForSeo(shortText);
    setShortsActiveSubTab("seo");
    setIsGeneratingShortsSeo(true);
    setShortsSeoResult(null);
    setShortsSeoError(null);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await generateShortsSEO(shortText, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsSeoResult(result);

      // Auto-populate CTR fields if empty
      if (result.titles && result.titles.length > 0 && !shortsCtrTitle.trim()) {
        setShortsCtrTitle(result.titles[0]);
      }
      if (result.description && !shortsCtrDescription.trim()) {
        setShortsCtrDescription(result.description);
      }

      // Map SEO results inside cut list if it matches
      setCutShortsResults((prev) => {
        return prev.map((item) => {
          const actualScript = item.loopEnding?.loopedFullScript || item.script;
          if (actualScript === shortText || item.script === shortText) {
            return { ...item, seo: result };
          }
          return item;
        });
      });
      toast.success("SEO для Shorts успешно сгенерировано!");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setShortsSeoError(errMsg);
      onError(error, "Ошибка при генерации SEO для Shorts");
    } finally {
      setIsGeneratingShortsSeo(false);
    }
  };

  const handleAnalyzeShortsCtr = async (title: string, description: string) => {
    if (!title.trim()) {
      toast.error("Пожалуйста, введите заголовок для анализа!");
      return;
    }
    setIsAnalyzingShortsCtr(true);
    setShortsCtrResult(null);
    setShortsCtrError(null);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await analyzeShortsCTR(title, description, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsCtrResult(result);
      toast.success("Анализ кликабельности (CTR) успешно выполнен!");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setShortsCtrError(errMsg);
      toast.error(`Не удалось проанализировать CTR: ${errMsg}`);
    } finally {
      setIsAnalyzingShortsCtr(false);
    }
  };

  const handleExportShortsZip = async () => {
    try {
      const zip = new JSZip();
      const scriptText = selectedShortForVisuals || selectedShortForSeo || "";
      if (!scriptText) {
        toast.error("Сначала сгенерируйте и выберите сценарий Shorts!");
        return;
      }

      let currentSeo = cutShortsResults.find(
        (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
      )?.seo || shortsSeoResult;

      if (shortsCtrTitle.trim() || shortsCtrDescription.trim()) {
        const baseSeo = currentSeo || {
          titles: [],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        const titles = [...(baseSeo.titles || [])];
        if (shortsCtrTitle.trim()) {
          if (titles.length > 0) {
            titles[0] = shortsCtrTitle.trim();
          } else {
            titles.push(shortsCtrTitle.trim());
          }
        }
        let description = baseSeo.description || "";
        if (shortsCtrDescription.trim()) {
          if (description) {
            const paragraphs = description.split("\n");
            paragraphs[0] = shortsCtrDescription.trim();
            description = paragraphs.join("\n");
          } else {
            description = shortsCtrDescription.trim();
          }
        }
        currentSeo = {
          ...baseSeo,
          titles,
          description,
        };
      }

      let folderName = "Shorts_Export";
      if (currentSeo && currentSeo.titles && currentSeo.titles.length > 0) {
        folderName = currentSeo.titles[0].replace(/[\\/:*?"<>|]/g, "_").trim();
      }

      const exportFolder = zip.folder(folderName);
      if (!exportFolder) throw new Error("Не удалось создать папку в ZIP архиве");

      exportFolder.file("1_script.txt", scriptText);

      if (shortsVisuals && shortsVisuals.length > 0) {
        let promptsText = "ВИЗУАЛЬНЫЕ ПРОМПТЫ (Google Veo 3):\n\n";
        shortsVisuals.forEach((scene, i) => {
          promptsText += `[СЦЕНА ${i + 1}]\nТекст: ${scene.text}\nПромпт: ${scene.prompt}\n\n`;
        });
        if (shortsMusicPrompt) {
          promptsText += `\nМУЗЫКАЛЬНЫЙ ПРОМПТ:\n${shortsMusicPrompt}\n`;
        }
        exportFolder.file("2_prompts.txt", promptsText);
      }

      if (currentSeo) {
        let seoText = "SEO УПАКОВКА SHORTS\n\n";
        if (currentSeo.titles && currentSeo.titles.length > 0) {
          seoText += "НАЗВАНИЯ:\n";
          currentSeo.titles.forEach((t: string) => (seoText += `- ${t}\n`));
        }
        if (currentSeo.description) {
          seoText += `\nОПИСАНИЕ:\n${currentSeo.description}\n\n`;
        }
        if (currentSeo.hashtags && currentSeo.hashtags.length > 0) {
          seoText += `ХЕШТЕГИ: ${currentSeo.hashtags.join(", ")}\n\n`;
        }
        if (currentSeo.keywords && currentSeo.keywords.length > 0) {
          seoText += `КЛЮЧЕВЫЕ СЛОВА: ${currentSeo.keywords.join(", ")}\n\n`;
        }
        if (currentSeo.pinnedComment) {
          seoText += `ЗАКРЕПЛЕННЫЙ КОММЕНТАРИЙ:\n${currentSeo.pinnedComment}\n`;
        }
        exportFolder.file("3_seo.txt", seoText);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ZIP архив со всеми материалами Shorts успешно скачан!");
    } catch (error) {
      onError(error, "Ошибка экспорта ZIP архива Shorts");
    }
  };

  return {
    shortsActiveSubTab,
    setShortsActiveSubTab,
    longFormScriptToCut,
    setLongFormScriptToCut,
    cutShortsResults,
    setCutShortsResults,
    isCuttingLongForm,
    selectedShortForVisuals,
    setSelectedShortForVisuals,
    shortsVisuals,
    setShortsVisuals,
    shortsMusicPrompt,
    setShortsMusicPrompt,
    isGeneratingShortsVisuals,
    selectedShortForSeo,
    setSelectedShortForSeo,
    shortsSeoResult,
    setShortsSeoResult,
    isGeneratingShortsSeo,
    generatingLoopForCard,
    shortsSeoError,
    loopErrorForCard,
    shortsCtrTitle,
    setShortsCtrTitle,
    shortsCtrDescription,
    setShortsCtrDescription,
    shortsCtrResult,
    setShortsCtrResult,
    isAnalyzingShortsCtr,
    shortsCtrError,
    isGeneratingShortsHashtags,
    shortsHashtagsResult,
    shortsHashtagsCopied,
    analyzingShortRetentionForCard,
    optimizingShortRetentionForCard,
    hiddenRetentionCards,
    setHiddenRetentionCards,
    longFormRetentionAnalysis,
    setLongFormRetentionAnalysis,
    isAnalyzingLongFormRetention,
    handleAnalyzeLongFormRetention,
    handleAnalyzeShortTopicRetention,
    handleOptimizeShortRetention,
    handleApplyTitleToSeo,
    handleApplyDescriptionToSeo,
    handleApplyLongFormSeoToShorts,
    handleGenerateShortsHashtags,
    handleCopyShortsHashtags,
    handleCutLongFormScript,
    handleGenerateLoopForCard,
    handleGenerateShortsVisuals,
    handleDeleteShort,
    handleGenerateShortsSeo,
    handleAnalyzeShortsCtr,
    handleExportShortsZip,
  };
}
