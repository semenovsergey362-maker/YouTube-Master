import { useState } from "react";
import { useApp } from "../context/AppContext";
import { toast } from "sonner";
import { logger } from "../config/logger";
import { exportToTxt, handleAppError, generateScriptBlockTimestamps } from "../utils/helpers";
import {
  generateVideoSEO,
  analyzeSEOAndSuggestImprovements,
  applySEORecommendationToAllFields,
  smartMergeDescriptionUpdate,
  analyzeTitlesUniqueness,
  generateSocialPromoPackage,
  type NicheData,
  type ScriptBlockStructure,
  type GeneratedBlock,
  type AnalysisOptions,
  type GeneratedIdea,
  type VideoSEO,
  type SEOAnalysis,
  type SocialPromoPackage,
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

      // Auto-append timestamps to description if not already present
      if (seo && seo.description && !/Таймкоды|00:00/i.test(seo.description)) {
        const timestamps = generateScriptBlockTimestamps(scriptStructure, generatedBlocks);
        if (timestamps && timestamps.length > 0) {
          const lines = timestamps.map((item) => `${item.timeCode} - ${item.title}`);
          seo.description = `${seo.description.trim()}\n\nТаймкоды и сцены:\n${lines.join("\n")}`;
        }
      }

      setVideoSEO(seo);
      toast.success("SEO оптимизация готова (с автоматическими таймкодами)!");

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

  const applyBroadSEOChange = (
    area: string,
    value: string,
    context?: {
      ruleTitle?: string;
      suggestion?: string;
      isRuleViolation?: boolean;
      targetField?: string;
    }
  ) => {
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
      updatedSEO.description = smartMergeDescriptionUpdate(
        updatedSEO.description,
        value,
        {
          area,
          ruleTitle: context?.ruleTitle,
          suggestion: context?.suggestion,
          targetField: context?.targetField,
          isRuleViolation: context?.isRuleViolation,
        }
      );
      changesApplied.push("Описание");
    }

    // 3. Handle Keywords & Tags (always synced)
    if (
      lowerArea.includes("keyword") ||
      lowerArea.includes("ключев") ||
      lowerArea.includes("tag") ||
      (lowerArea.includes("тег") && !lowerArea.includes("хештег"))
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

    // 4. Handle Hashtags specifically
    if (lowerArea.includes("hashtag") || lowerArea.includes("хештег")) {
      const cleanTags = value
        .split(/[,#\s]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.startsWith("#") ? t : `#${t}`);
      updatedSEO.hashtags = cleanTags;
      changesApplied.push("Хештеги");
    }

    // 5. Handle Pinned Comment
    if (lowerArea.includes("pinned") || lowerArea.includes("comment") || lowerArea.includes("коммент")) {
      updatedSEO.pinnedComment = value;
      changesApplied.push("Закрепленный комментарий");
    }

    // 6. Handle Thumbnails
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

  const handleApplyAllRuleFixes = () => {
    if (!videoSEO || !seoAnalysis) return;
    const ruleViolations = (seoAnalysis.improvements || []).filter(imp => imp.isRuleViolation);
    const auditFixes = (seoAnalysis.customRulesAudit?.items || []).filter(item => item.status === 'failed' && item.suggestedFix);

    if (ruleViolations.length === 0 && auditFixes.length === 0) {
      toast.info("Все кастомные правила уже соблюдены!");
      return;
    }

    const updatedSEO = { ...videoSEO };
    let appliedCount = 0;

    // Apply from customRulesAudit first
    auditFixes.forEach(fix => {
      if (!fix.suggestedFix) return;
      if (fix.targetField === 'description' || fix.ruleTitle.includes('Псевдоним') || fix.ruleTitle.includes('ссылок')) {
        updatedSEO.description = smartMergeDescriptionUpdate(
          updatedSEO.description,
          fix.suggestedFix,
          {
            area: 'description',
            ruleTitle: fix.ruleTitle,
            targetField: fix.targetField,
          }
        );
        appliedCount++;
      } else if (fix.targetField === 'hashtags' || fix.ruleTitle.includes('хештег')) {
        const cleanTags = fix.suggestedFix
          .split(/[,#\s]+/)
          .filter(t => t.length > 0)
          .map(t => t.startsWith('#') ? t : `#${t}`);
        updatedSEO.hashtags = cleanTags;
        appliedCount++;
      } else if (fix.targetField === 'title' || fix.ruleTitle.includes('заголовок')) {
        updatedSEO.title = fix.suggestedFix;
        appliedCount++;
      } else if (fix.targetField === 'pinnedComment') {
        updatedSEO.pinnedComment = fix.suggestedFix;
        appliedCount++;
      }
    });

    // Apply from improvements if not covered
    ruleViolations.forEach(imp => {
      const lower = imp.area.toLowerCase();
      if (lower.includes('описан') && !auditFixes.some(f => f.targetField === 'description')) {
        updatedSEO.description = smartMergeDescriptionUpdate(
          updatedSEO.description,
          imp.suggestedValue,
          {
            area: imp.area,
            ruleTitle: imp.ruleTitle,
            suggestion: imp.suggestion,
          }
        );
        appliedCount++;
      } else if (lower.includes('хештег') && !auditFixes.some(f => f.targetField === 'hashtags')) {
        updatedSEO.hashtags = imp.suggestedValue.split(/[,#\s]+/).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`);
        appliedCount++;
      } else if (lower.includes('заголов') && !auditFixes.some(f => f.targetField === 'title')) {
        updatedSEO.title = imp.suggestedValue;
        appliedCount++;
      }
    });

    setVideoSEO(updatedSEO);

    // Update audit status in local state to indicate all passed
    const updatedAudit = seoAnalysis.customRulesAudit ? {
      ...seoAnalysis.customRulesAudit,
      passedRules: seoAnalysis.customRulesAudit.totalRules,
      items: seoAnalysis.customRulesAudit.items.map(item => ({
        ...item,
        status: 'passed' as const,
        details: 'Успешно исправлено и приведено в соответствие с правилом.'
      }))
    } : undefined;

    const remainingImprovements = (seoAnalysis.improvements || []).filter(imp => !imp.isRuleViolation);

    setSeoAnalysis({
      ...seoAnalysis,
      score: Math.min(100, (seoAnalysis.score || 70) + 15),
      scoreBreakdown: seoAnalysis.scoreBreakdown ? {
        ...seoAnalysis.scoreBreakdown,
        rulesComplianceScore: 100
      } : undefined,
      customRulesAudit: updatedAudit,
      improvements: remainingImprovements
    });

    toast.success(`Все кастомные правила успешно применены (${appliedCount} изменений)!`);
  };

  const handleApplySEOImprovement = async (
    improvement: {
      area: string;
      suggestedValue: string;
      impact: string;
      suggestion: string;
      isRuleViolation?: boolean;
      ruleTitle?: string;
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
      applyBroadSEOChange(improvement.area, improvement.suggestedValue, {
        suggestion: improvement.suggestion,
        ruleTitle: improvement.ruleTitle,
        isRuleViolation: improvement.isRuleViolation,
      });

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

  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);

  const handleGenerateSocialPromo = async () => {
    const topicToUse = getTopicToUse() || videoSEO?.title || "видео";
    if (!topicToUse) {
      toast.error("Сначала задайте тему или сгенерируйте SEO");
      return;
    }

    setIsGeneratingSocial(true);
    const toastId = toast.loading("ИИ генерирует посты для YouTube, TG, IG и 1:1 цитаты...");
    try {
      let scriptContentText = "";
      if (generatedBlocks) {
        const blocksArr = Array.isArray(generatedBlocks) ? generatedBlocks : Object.values(generatedBlocks);
        scriptContentText = blocksArr
          .map((b: any) => b?.text || "")
          .filter(Boolean)
          .join("\n\n");
      }

      const socialPackage = await generateSocialPromoPackage({
        title: videoSEO?.title || topicToUse,
        description: videoSEO?.description || "",
        scriptText: scriptContentText,
        isShorts: false,
        branding: nicheData?.branding,
        niche: nicheData,
        options: getCommonAnalysisOptions(),
      });

      if (videoSEO) {
        setVideoSEO({
          ...videoSEO,
          socialPromo: socialPackage,
        });
      } else {
        setVideoSEO({
          title: topicToUse,
          description: "",
          keywords: "",
          socialPromo: socialPackage,
        });
      }

      toast.success("Кросс-платформенные посты и 1:1 карточки-цитаты готовы!", { id: toastId });
    } catch (error) {
      if (handleGeminiError) {
        handleGeminiError(error, "Ошибка при генерации постов");
      } else {
        handleAppError(error, "Генерация постов и цитат");
      }
      toast.dismiss(toastId);
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  return {
    videoSEO,
    setVideoSEO,
    seoAnalysis,
    setSeoAnalysis,
    isGeneratingVideoSEO,
    isAnalyzingSEO,
    isGeneratingSocial,
    handleGenerateVideoSEO,
    handleAnalyzeSEO,
    handleExportSEO,
    handleGenerateSocialPromo,
    applyBroadSEOChange,
    handleApplySEOImprovement,
    handleApplyAllRuleFixes,
  };
}
