import { useState, useCallback, useEffect } from "react";
import {
  ScriptBlockStructure,
  ScriptScene,
  SceneBreakdown,
  ScriptBlock,
  GeneratedBlock,
  SentimentPoint,
  RetentionPoint,
  VideoSEO,
  SEOAnalysis,
  TextVariation,
} from "../types";

export function useScriptState() {
  const [scriptTopic, setScriptTopic] = useState<string>("");
  const [selectedIdea, setSelectedIdea] = useState<string>("");
  const [scriptStructure, setScriptStructure] = useState<ScriptBlockStructure[]>([]);
  const [generatedBlocks, setGeneratedBlocks] = useState<Record<number, GeneratedBlock>>({});
  const [isGeneratingBlock, setIsGeneratingBlock] = useState<Record<number, boolean>>({});
  const [isGeneratingFullScript, setIsGeneratingFullScript] = useState<boolean>(false);
  const [scriptDuration, setScriptDuration] = useState<string>("8-10 минут");
  const [toneOfVoice, setToneOfVoice] = useState<string>("Захватывающий / Динамичный");
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);
  const [scriptBreakdown, setScriptBreakdown] = useState<SceneBreakdown[]>([]);
  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState<boolean>(false);

  // Undo / Redo history for script blocks
  const [blockHistory, setBlockHistory] = useState<Record<number, GeneratedBlock[]>>({});

  const recordBlockState = useCallback((blockIndex: number, block: GeneratedBlock) => {
    setBlockHistory((prev) => {
      const currentList = prev[blockIndex] || [];
      return {
        ...prev,
        [blockIndex]: [...currentList.slice(-10), block],
      };
    });
  }, []);

  const updateBlockContent = useCallback((blockIndex: number, newText: string) => {
    setGeneratedBlocks((prev) => {
      const current = prev[blockIndex];
      if (!current) return prev;
      return {
        ...prev,
        [blockIndex]: {
          ...current,
          text: newText,
          estimatedChars: newText.length,
        },
      };
    });
  }, []);

  const clearScript = useCallback(() => {
    setScriptStructure([]);
    setGeneratedBlocks({});
    setScriptBreakdown([]);
    setSelectedBlockIndex(0);
  }, []);

  return {
    scriptTopic,
    setScriptTopic,
    selectedIdea,
    setSelectedIdea,
    scriptStructure,
    setScriptStructure,
    generatedBlocks,
    setGeneratedBlocks,
    isGeneratingBlock,
    setIsGeneratingBlock,
    isGeneratingFullScript,
    setIsGeneratingFullScript,
    scriptDuration,
    setScriptDuration,
    toneOfVoice,
    setToneOfVoice,
    selectedBlockIndex,
    setSelectedBlockIndex,
    scriptBreakdown,
    setScriptBreakdown,
    isGeneratingBreakdown,
    setIsGeneratingBreakdown,
    blockHistory,
    recordBlockState,
    updateBlockContent,
    clearScript,
  };
}
