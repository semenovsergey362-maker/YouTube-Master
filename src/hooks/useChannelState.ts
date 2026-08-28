import { useState, useCallback } from "react";
import { NicheData, GeneratedIdea, BrandProfile, AudiencePortrait } from "../types";

export function useChannelState() {
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [customNiche, setCustomNiche] = useState<string>("");
  const [isCustomNiche, setIsCustomNiche] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<string>("RU");
  const [nicheData, setNicheData] = useState<NicheData | null>(null);
  const [isAnalyzingNiche, setIsAnalyzingNiche] = useState<boolean>(false);
  const [selectedBranding, setSelectedBranding] = useState<any>(null);
  const [isGeneratingBranding, setIsGeneratingBranding] = useState<boolean>(false);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [audiencePortrait, setAudiencePortrait] = useState<AudiencePortrait | null>(null);
  const [customCompetitorInsights, setCustomCompetitorInsights] = useState<string>("");
  const [selectedIdeasForSeries, setSelectedIdeasForSeries] = useState<GeneratedIdea[]>([]);

  const selectBrandingVariant = useCallback((branding: any) => {
    setSelectedBranding(branding);
  }, []);

  return {
    selectedNiche,
    setSelectedNiche,
    customNiche,
    setCustomNiche,
    isCustomNiche,
    setIsCustomNiche,
    selectedRegion,
    setSelectedRegion,
    nicheData,
    setNicheData,
    isAnalyzingNiche,
    setIsAnalyzingNiche,
    selectedBranding,
    setSelectedBranding,
    selectBrandingVariant,
    isGeneratingBranding,
    setIsGeneratingBranding,
    brandProfile,
    setBrandProfile,
    audiencePortrait,
    setAudiencePortrait,
    customCompetitorInsights,
    setCustomCompetitorInsights,
    selectedIdeasForSeries,
    setSelectedIdeasForSeries,
  };
}
