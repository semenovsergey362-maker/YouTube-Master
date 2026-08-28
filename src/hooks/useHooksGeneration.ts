import { useState } from "react";
import { toast } from "sonner";
import { generateHooks } from "../services/geminiService";
import { handleAppError } from "../utils/helpers";

interface UseHooksGenerationProps {
  scriptTopic?: string;
  scriptMode?: string;
}

export function useHooksGeneration(props?: UseHooksGenerationProps) {
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState<boolean>(false);

  const handleGenerateHooks = async (overrideTopic?: string | React.MouseEvent | unknown, overrideMode?: string) => {
    const topic = (typeof overrideTopic === "string" && overrideTopic.trim() !== "")
      ? overrideTopic
      : (props?.scriptTopic ?? "");
    const mode = (typeof overrideMode === "string" && overrideMode.trim() !== "")
      ? overrideMode
      : (props?.scriptMode ?? "");

    if (!topic.trim()) {
      toast.error("Сначала введите тему видео");
      return;
    }

    setIsGeneratingHooks(true);
    try {
      const hooks = await generateHooks(topic, mode);
      setGeneratedHooks(hooks);
    } catch (e) {
      handleAppError(e, "Генерация хуков");
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  const clearHooks = () => {
    setGeneratedHooks([]);
  };

  return {
    generatedHooks,
    setGeneratedHooks,
    isGeneratingHooks,
    handleGenerateHooks,
    clearHooks
  };
}
