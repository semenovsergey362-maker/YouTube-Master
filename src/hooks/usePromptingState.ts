import { useState, useCallback } from "react";
import { PromptingState, PinnedStyles, TransitionPrompt } from "../types";

export function usePromptingState() {
  const [promptImageStyle, setPromptImageStyle] = useState<string>("Cinematic, Hyper-detailed 3D Unreal Engine 5");
  const [promptAnimationType, setPromptAnimationType] = useState<string>("Smooth cinematic camera pan, 24fps");
  const [promptMusicMood, setPromptMusicMood] = useState<string>("Epic dark synthwave with rising tension");
  const [generalAudioPrompt, setGeneralAudioPrompt] = useState<string>("");
  const [musicContinuityEnabled, setMusicContinuityEnabled] = useState<boolean>(true);
  const [veoSfxEnabled, setVeoSfxEnabled] = useState<boolean>(false);
  
  const [scenePrompts, setScenePrompts] = useState<Record<string, string>>({});
  const [transitionPrompts, setTransitionPrompts] = useState<Record<string, TransitionPrompt>>({});
  const [generatingTransitions, setGeneratingTransitions] = useState<Record<string, boolean>>({});
  const [promoImages, setPromoImages] = useState<Record<string, string>>({});
  const [isGeneratingPromoImages, setIsGeneratingPromoImages] = useState<boolean>(false);
  const [isGeneratingGlobalProduction, setIsGeneratingGlobalProduction] = useState<boolean>(false);

  const [isStylePinned, setIsStylePinned] = useState<boolean>(false);
  const [pinnedStyles, setPinnedStyles] = useState<PinnedStyles>({
    imageStyle: true,
    animationType: true,
    audioEnvironment: true,
  });

  const clearPromptingData = useCallback(() => {
    setScenePrompts({});
    setTransitionPrompts({});
    setPromoImages({});
  }, []);

  return {
    promptImageStyle,
    setPromptImageStyle,
    promptAnimationType,
    setPromptAnimationType,
    promptMusicMood,
    setPromptMusicMood,
    generalAudioPrompt,
    setGeneralAudioPrompt,
    musicContinuityEnabled,
    setMusicContinuityEnabled,
    veoSfxEnabled,
    setVeoSfxEnabled,
    scenePrompts,
    setScenePrompts,
    transitionPrompts,
    setTransitionPrompts,
    generatingTransitions,
    setGeneratingTransitions,
    promoImages,
    setPromoImages,
    isGeneratingPromoImages,
    setIsGeneratingPromoImages,
    isGeneratingGlobalProduction,
    setIsGeneratingGlobalProduction,
    isStylePinned,
    setIsStylePinned,
    pinnedStyles,
    setPinnedStyles,
    clearPromptingData,
  };
}
