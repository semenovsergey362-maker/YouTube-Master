import { useApp } from "../context/AppContext";
import { toast } from "sonner";
import { logger } from "../config/logger";
import { exportToTxt, handleAppError } from "../utils/helpers";
import {
  generateVideoSEO,
  analyzeSEOAndSuggestImprovements,
  applySEORecommendationToAllFields,
  analyzeTitlesUniqueness,
  type NicheData,
  type ScriptBlockStructure,
  type GeneratedBlock,
  type AnalysisOptions,
  type GeneratedIdea,
  type VideoSEO,
  type SEOAnalysis,
} from "../services/geminiService";

export interface UseSeoGenerationProps {
  scriptTopic: string;
  selectedIdea: string | GeneratedIdea;
  selectedNiche: string;
  customNiche: string;
  nicheData: NicheData | null;
  selectedRegion: string;
  scriptStructure: ScriptBlockStructure[];
  generatedBlocks: Record<number, GeneratedBlock>;
  deepResearch: boolean;
  getCommonAnalysisOptions: (extraOptions?: AnalysisOptions) => AnalysisOptions;
  handleGeminiError?: (error: any, defaultMessage: string) => void;
}

export function useSeoGeneration(props: UseSeoGenerationProps) {
  const {
    videoSEO,
    setVideoSEO,
    seoAnalysis,
    setSeoAnalysis,
    isGeneratingVideoSEO,
    setIsGeneratingVideoSEO,
    isAnalyzingSEO,
    setIsAnalyzingSEO,
    setTitleAnalysis,
    setIsAnalyzingTitles,
  } = useApp();

  const {
    scriptTopic,
    selectedIdea,
    selectedNiche,
    customNiche,
    nicheData,
    selectedRegion,
    scriptStructure,
    generatedBlocks,
    deepResearch,
    getCommonAnalysisOptions,
    handleGeminiError,
  } = props;

  const getTopicToUse = () => {
    if (scriptTopic && scriptTopic.trim()) return scriptTopic;
    if (typeof selectedIdea === "string") return selectedIdea;
    if (selectedIdea && typeof selectedIdea === "object" && "title" in selectedIdea) {
      return selectedIdea.title || "";
    }
    return "";
  };

  const handleGenerateVideoSEO = async () => {
    const topicToUse = getTopicToUse();
    if (!topicToUse || !nicheData) {
      toast.error("Сначала выберите идею");
      return;
    }
    setIsGeneratingVideoSEO(true);
    try {
      const seo = await generateVideoSEO(
        topicToUse,
        selectedNiche || customNiche,
        typeof nicheData.branding?.names?.[0] === "string" ? nicheData.branding.names[0] : (nicheData.branding?.names?.[0]?.name || ""),
        (nicheData.competitors || []).map((c) => c.weakness),
        selectedRegion,
        scriptStructure.length > 0 ? scriptStructure : undefined,
        getCommonAnalysisOptions({ deepResearch }),
        generatedBlocks
      );
      setVideoSEO(seo);
      toast.success("SEO оптимизация готова!");

      // Auto-analyze titles after generation
      if (seo.title) {
        setIsAnalyzingTitles(true);
        analyzeTitlesUniqueness(
          [seo.title],
          topicToUse,
          selectedNiche || customNiche,
          getCommonAnalysisOptions()
        )
          .then((analysis) => setTitleAnalysis(analysis))
          .catch((err) => logger.error("Error auto-analyzing titles:", err))
          .finally(() => setIsAnalyzingTitles(false));
      }
    } catch (error) {
      if (handleGeminiError) {
        handleGeminiError(error, "Ошибка при генерации SEO");
      } else {
        handleAppError(error, "Генерация SEO");
      }
    } finally {
      setIsGeneratingVideoSEO(false);
    }
  };

  const handleAnalyzeSEO = async () => {
    const topicToUse = getTopicToUse();
    if (!topicToUse || !videoSEO) {
      toast.error("Сначала сгенерируйте SEO для видео");
      return;
    }
    setIsAnalyzingSEO(true);
    try {
      const analysis = await analyzeSEOAndSuggestImprovements(
        topicToUse,
        selectedNiche || customNiche,
        videoSEO,
        getCommonAnalysisOptions({ deepResearch })
      );
      setSeoAnalysis(analysis);
      toast.success("SEO анализ завершен!");
    } catch (error) {
      if (handleGeminiError) {
        handleGeminiError(error, "Ошибка при анализе SEO");
      } else {
        handleAppError(error, "Анализ SEO");
      }
    } finally {
      setIsAnalyzingSEO(false);
    }
  };

  const handleExportSEO = () => {
    if (!videoSEO) return;
    const content = `Заголовок: ${videoSEO.title}\n\nОписание:\n${videoSEO.description}\n\nКлючевые слова:\n${videoSEO.keywords}\n\nХештеги:\n${(videoSEO.hashtags || []).map((t) => "#" + t).join(" ")}\n\nЗакрепленный комментарий:\n${videoSEO.pinnedComment || ""}`;
    exportToTxt(content, `SEO_${videoSEO.title.substring(0, 20)}`);
    toast.success("SEO данные экспортированы");
  };

  const applyBroadSEOChange = (area: string, value: string) => {
    if (!videoSEO) return;

    const lowerArea = area.toLowerCase();
    const updatedSEO = { ...videoSEO };
    const changesApplied: string[] = [];

    // 1. Handle Titles
    if (lowerArea.includes("title") || lowerArea.includes("заголов")) {
      const oldTitle = updatedSEO.title;
      updatedSEO.title = value;
      changesApplied.push("Заголовок");

      // Update description if it starts with the old title (common SEO pattern)
      if (updatedSEO.description.startsWith(oldTitle)) {
        updatedSEO.description = updatedSEO.description.replace(
          oldTitle,
          value
        );
        changesApplied.push("Описание (начало)");
      }

      // Update pinned comment if it mentions the old title
      if (updatedSEO.pinnedComment.includes(oldTitle)) {
        updatedSEO.pinnedComment = updatedSEO.pinnedComment.replaceAll(
          oldTitle,
          value
        );
        changesApplied.push("Закрепленный комментарий");
      }
    }

    // 2. Handle Descriptions
    if (lowerArea.includes("description") || lowerArea.includes("описан")) {
      updatedSEO.description = value;
      changesApplied.push("Описание");
    }

    // 3. Handle Keywords & Tags (always synced)
    if (
      lowerArea.includes("keyword") ||
      lowerArea.includes("ключев") ||
      lowerArea.includes("tag") ||
      lowerArea.includes("тег")
    ) {
      const tags = value
        .split(/[,#\s]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.replace(/^#/, ""));
      const keywordString = Array.from(
        new Set([
          ...updatedSEO.keywords.split(",").map((k) => k.trim()),
          ...tags,
        ])
      ).join(", ");

      updatedSEO.keywords = keywordString;
      updatedSEO.hashtags = Array.from(
        new Set([...updatedSEO.hashtags, ...tags])
      );
      changesApplied.push("Ключевые слова", "Теги");
    }

    // 4. Handle Thumbnails
    if (
      lowerArea.includes("thumbnail") ||
      lowerArea.includes("превью") ||
      lowerArea.includes("обложк")
    ) {
      changesApplied.push(
        "Рекомендация по обложке (требует ручного обновления промпта)"
      );
    }

    setVideoSEO(updatedSEO);
    if (changesApplied.length > 0) {
      toast.success(
        `Изменения применены к: ${Array.from(new Set(changesApplied)).join(", ")}`
      );
    }
  };

  const handleApplySEOImprovement = async (
    improvement: {
      area: string;
      suggestedValue: string;
      impact: string;
      suggestion: string;
    },
    index: number
  ) => {
    if (!videoSEO) return;
    const toastId = toast.loading(
      "Применяем рекомендацию ко всем полям(AI)..."
    );
    try {
      const updatedSEO = await applySEORecommendationToAllFields(
        videoSEO,
        improvement,
        getCommonAnalysisOptions()
      );
      setVideoSEO(updatedSEO);

      if (seoAnalysis && seoAnalysis.improvements) {
        const updatedImprovements = [...seoAnalysis.improvements];
        updatedImprovements.splice(index, 1);
        setSeoAnalysis({
          ...seoAnalysis,
          improvements: updatedImprovements,
        });
      }

      toast.success(
        `Улучшение "${improvement.suggestion}" успешно применено ко всем полям SEO!`,
        { id: toastId }
      );
    } catch (error) {
      if (handleGeminiError) {
        handleGeminiError(error, "Ошибка при умном применении SEO");
      } else {
        logger.error("Ошибка при умном применении SEO:", error);
      }
      // Fallback
      applyBroadSEOChange(improvement.area, improvement.suggestedValue);

      if (seoAnalysis && seoAnalysis.improvements) {
        const updatedImprovements = [...seoAnalysis.improvements];
        updatedImprovements.splice(index, 1);
        setSeoAnalysis({
          ...seoAnalysis,
          improvements: updatedImprovements,
        });
      }
    }
  };

  return {
    videoSEO,
    setVideoSEO,
    seoAnalysis,
    setSeoAnalysis,
    isGeneratingVideoSEO,
    isAnalyzingSEO,
    handleGenerateVideoSEO,
    handleAnalyzeSEO,
    handleExportSEO,
    applyBroadSEOChange,
    handleApplySEOImprovement,
  };
}
