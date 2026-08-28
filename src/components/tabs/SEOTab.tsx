import { logger } from "../../config/logger";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollFadeIn } from '../ScrollFadeIn';
import { 
  Film, Sparkles, Loader2, Eye, Split, Bot, Quote, BarChart3, Download, Search, Check, X, Camera,
  Palette, Edit2, Save, Target, Copy, Trash2, RefreshCw, Upload, Clock, Layers, ArrowRight, Wand2,
  Plus, CheckCircle2, ChevronDown, ChevronUp, Tag, Zap, Sliders, AlertCircle, AlertTriangle, TrendingUp, LayoutTemplate
} from 'lucide-react';
import { toast } from 'sonner';
import { evaluateCTR, optimizeTitle } from '../../services/geminiService';
import { copyToClipboard, generateScriptBlockTimestamps, handleAppError } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

interface TextBackgroundPlateProps {
  bgStyle: string;
  bgColor: string;
  bgOpacity?: number;
  bgScale?: number;
  bgRotate?: number;
  bgOffsetX?: number;
  bgOffsetY?: number;
  customTexture?: string;
  plateAppearance?: string;
}

const TextBackgroundPlate: React.FC<TextBackgroundPlateProps> = ({ 
  bgStyle, 
  bgColor, 
  bgOpacity = 1, 
  bgScale = 1, 
  bgRotate = 0,
  bgOffsetX = 0,
  bgOffsetY = 0,
  customTexture,
  plateAppearance = 'fill'
}) => {
  if (!bgStyle || bgStyle === 'none') return null;

  const plateTransform = `translate(${bgOffsetX}px, ${bgOffsetY}px) rotate(${bgRotate}deg) scale(${bgScale})`;

  const isOutline = plateAppearance === 'outline';
  const isShadow = plateAppearance === 'shadow';

  // Fill and stroke attributes based on style appearance
  const fillVal = isOutline ? 'none' : bgColor;
  const strokeVal = isOutline ? bgColor : 'none';
  const strokeWidthVal = isOutline ? '2.5' : '0';
  const fillOpacityVal = isShadow ? 0.2 : 1;
  const filterVal = isShadow 
    ? `drop-shadow(0px 0px 16px ${bgColor}) drop-shadow(0px 4px 8px rgba(0,0,0,0.5))` 
    : 'drop-shadow(0px 4px 12px rgba(0,0,0,0.75))';

  if ((bgStyle === 'custom' || customTexture) && customTexture) {
    const customDropShadow = isShadow 
      ? `drop-shadow(0px 0px 16px ${bgColor}) drop-shadow(0px 4px 8px rgba(0,0,0,0.5))`
      : 'drop-shadow(0px 4px 10px rgba(0,0,0,0.75))';
    return (
      <div
        className="absolute inset-0 w-[calc(100%+32px)] h-[calc(100%+20px)] -left-[16px] -top-[10px] pointer-events-none z-0 overflow-visible flex items-center justify-center"
        style={{
          opacity: isShadow ? 0.35 : bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
          filter: customDropShadow,
        }}
      >
        <img
          src={customTexture}
          alt="Custom texture"
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    );
  }

  // Style 1: Wide Brush Stroke with Dry Streaks on Right/Bottom (matching user image 1)
  if (bgStyle === 'brush' || bgStyle === 'brush_wide') {
    return (
      <svg
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+32px)] h-[calc(100%+20px)] -left-[16px] -top-[10px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        {/* Solid center & left body */}
        <path
          d="M 12 36 Q 40 22, 100 20 T 200 18 C 240 18, 275 22, 290 25 Q 260 28, 240 30 C 270 32, 295 35, 305 38 C 280 40, 250 42, 220 44 L 285 46 C 255 49, 210 50, 180 52 C 240 54, 275 56, 280 58 C 230 60, 170 62, 120 62 L 190 65 L 140 68 Q 80 72, 25 64 C 8 60, 2 48, 12 36 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
        {/* Additional dense paint layering */}
        <path
          d="M 20 28 Q 90 14, 180 16 T 280 20 C 295 22, 310 26, 300 32 C 285 28, 260 26, 220 25 Q 120 22, 40 32 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
          opacity={isOutline ? 0.5 : 0.95}
        />
        {/* Horizontal dry bristle streak lines extending on right & bottom (Image 1 style) */}
        {!isOutline && (
          <g stroke={bgColor} strokeLinecap="round" opacity={isShadow ? 0.3 : 0.9}>
            <line x1="160" y1="22" x2="312" y2="24" strokeWidth="2.5" strokeDasharray="90 8 45 4 20" />
            <line x1="180" y1="27" x2="318" y2="28" strokeWidth="2" strokeDasharray="110 12 35" />
            <line x1="200" y1="33" x2="315" y2="34" strokeWidth="3" strokeDasharray="70 6 50 10 25" />
            <line x1="190" y1="39" x2="308" y2="40" strokeWidth="2" strokeDasharray="80 15 40 5 15" />
            <line x1="170" y1="45" x2="305" y2="46" strokeWidth="2.5" strokeDasharray="60 8 55 12" />
            <line x1="140" y1="51" x2="295" y2="52" strokeWidth="3" strokeDasharray="90 10 40 6" />
            <line x1="110" y1="57" x2="285" y2="58" strokeWidth="2" strokeDasharray="50 14 65 8 30" />
            <line x1="80" y1="62" x2="270" y2="63" strokeWidth="2.5" strokeDasharray="40 10 70 12 25" />
            <line x1="50" y1="67" x2="250" y2="68" strokeWidth="2" strokeDasharray="30 15 50 8 40" />
            <line x1="25" y1="71" x2="220" y2="72" strokeWidth="1.8" strokeDasharray="20 12 60 10 30" />
            <line x1="15" y1="75" x2="180" y2="76" strokeWidth="1.5" strokeDasharray="15 10 40 14 20" />
            <line x1="10" y1="78" x2="140" y2="79" strokeWidth="1.2" strokeDasharray="10 8 30 12" />
          </g>
        )}
      </svg>
    );
  }

  // Style 2: Tapered Dry Brush with Spiky Angular Edges & Splatters (matching user image 2)
  if (bgStyle === 'dry_brush' || bgStyle === 'brush_tapered') {
    return (
      <svg
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+36px)] h-[calc(100%+24px)] -left-[18px] -top-[12px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        {/* Main jagged tapered body */}
        <path
          d="M 125 12 L 140 22 L 165 14 L 180 20 L 210 16 L 235 24 L 260 18 L 280 28 L 305 38 L 290 48 L 310 56 L 285 64 L 255 58 L 230 66 L 190 60 L 160 68 L 120 62 L 90 70 L 60 58 L 35 64 L 15 52 L 30 42 L 8 34 L 35 26 L 65 32 L 95 20 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
        {/* Additional jagged texture cuts */}
        <path
          d="M 45 28 L 75 18 L 115 25 L 155 16 L 205 22 L 255 17 L 295 32 L 275 46 L 295 58 L 245 62 L 185 68 L 115 64 L 55 66 L 25 48 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
        {/* Spiky dry bristle ends and splatters (Image 2 style) */}
        {!isOutline && (
          <>
            <g stroke={bgColor} strokeLinecap="round" opacity={isShadow ? 0.3 : 0.95}>
              {/* Top/left dry spikes */}
              <line x1="120" y1="14" x2="135" y2="4" strokeWidth="2" />
              <line x1="130" y1="18" x2="145" y2="8" strokeWidth="1.5" />
              <line x1="110" y1="20" x2="128" y2="10" strokeWidth="1.8" />
              {/* Right jagged bristle fingers */}
              <line x1="280" y1="30" x2="318" y2="34" strokeWidth="2.5" />
              <line x1="270" y1="36" x2="315" y2="42" strokeWidth="2" />
              <line x1="285" y1="44" x2="320" y2="50" strokeWidth="3" />
              <line x1="275" y1="52" x2="312" y2="58" strokeWidth="2.2" />
              {/* Left dry tapered tip */}
              <line x1="40" y1="30" x2="2" y2="35" strokeWidth="2.5" />
              <line x1="45" y1="38" x2="5" y2="42" strokeWidth="2" />
              <line x1="50" y1="46" x2="10" y2="50" strokeWidth="1.8" />
              {/* Bottom jagged spikes */}
              <line x1="90" y1="65" x2="80" y2="78" strokeWidth="2" />
              <line x1="150" y1="66" x2="145" y2="82" strokeWidth="1.5" />
              <line x1="220" y1="64" x2="215" y2="78" strokeWidth="2.2" />
            </g>
            {/* Tiny dry paint specks */}
            <g fill={bgColor} opacity={isShadow ? 0.3 : 1}>
              <circle cx="128" cy="2" r="1.5" />
              <circle cx="138" cy="6" r="2" />
              <circle cx="316" cy="28" r="1.8" />
              <circle cx="322" cy="46" r="1.5" />
              <circle cx="4" cy="38" r="2" />
            </g>
          </>
        )}
      </svg>
    );
  }

  // Style 3: Smooth Horizontal Stroke with Dense Fine Bristles (matching user image 3)
  if (bgStyle === 'brush_bristle' || bgStyle === 'smooth_brush') {
    return (
      <svg
        viewBox="0 0 320 80"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+28px)] h-[calc(100%+16px)] -left-[14px] -top-[8px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        {/* Thick center paint core */}
        <path
          d="M 15 25 C 60 22, 140 20, 220 22 C 260 23, 290 26, 305 28 C 300 42, 302 52, 298 60 C 250 62, 150 64, 50 62 C 25 61, 12 55, 10 42 C 8 32, 10 27, 15 25 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
        {/* Layered fine horizontal bristle lines across top, middle, and bottom (Image 3 style) */}
        {!isOutline && (
          <g stroke={bgColor} strokeLinecap="round" opacity={isShadow ? 0.3 : 0.88}>
            {/* Top bristle fringe */}
            <line x1="10" y1="18" x2="310" y2="19" strokeWidth="1.2" strokeDasharray="120 10 80 15 60" />
            <line x1="15" y1="21" x2="312" y2="22" strokeWidth="1.5" strokeDasharray="90 8 110 12 40" />
            <line x1="8" y1="24" x2="308" y2="24" strokeWidth="1.8" strokeDasharray="140 12 100 8" />
            {/* Center bristle texture lines */}
            <line x1="5" y1="28" x2="315" y2="28" strokeWidth="2" strokeDasharray="200 15 80" />
            <line x1="12" y1="32" x2="314" y2="32" strokeWidth="1.2" strokeDasharray="80 10 150 12" />
            <line x1="6" y1="36" x2="316" y2="36" strokeWidth="1.5" strokeDasharray="160 8 120" />
            <line x1="14" y1="40" x2="312" y2="40" strokeWidth="1.2" strokeDasharray="110 14 140" />
            <line x1="8" y1="44" x2="315" y2="44" strokeWidth="1.6" strokeDasharray="130 10 120" />
            <line x1="10" y1="48" x2="311" y2="48" strokeWidth="1.4" strokeDasharray="90 12 170" />
            <line x1="15" y1="52" x2="313" y2="52" strokeWidth="1.8" strokeDasharray="150 15 100" />
            <line x1="7" y1="56" x2="310" y2="56" strokeWidth="1.3" strokeDasharray="100 8 160" />
            {/* Bottom bristle fringe */}
            <line x1="12" y1="60" x2="308" y2="60" strokeWidth="1.8" strokeDasharray="120 10 110 8" />
            <line x1="18" y1="63" x2="305" y2="63" strokeWidth="1.5" strokeDasharray="80 14 130 10" />
            <line x1="22" y1="66" x2="300" y2="66" strokeWidth="1.2" strokeDasharray="60 12 100 15 40" />
            <line x1="30" y1="69" x2="290" y2="69" strokeWidth="1.0" strokeDasharray="40 10 80 12 30" />
          </g>
        )}
      </svg>
    );
  }

  if (bgStyle === 'rough' || bgStyle === 'grunge') {
    return (
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+20px)] h-[calc(100%+12px)] -left-[10px] -top-[6px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        <path
          d="M 4 14 L 28 4 L 62 12 L 105 3 L 150 9 L 195 2 L 240 8 L 282 3 L 296 16 L 290 35 L 298 52 L 291 70 L 268 77 L 230 72 L 185 78 L 138 72 L 92 78 L 48 72 L 18 78 L 2 64 L 7 42 L 2 26 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
        {!isOutline && bgStyle === 'grunge' && (
          <g fill={bgColor} opacity={isShadow ? 0.3 : 1}>
            <circle cx="293" cy="14" r="3" />
            <circle cx="298" cy="24" r="1.5" />
            <circle cx="288" cy="72" r="2.5" />
            <circle cx="5" cy="70" r="3" />
            <circle cx="12" cy="76" r="1.5" />
            <circle cx="2" cy="18" r="2" />
          </g>
        )}
      </svg>
    );
  }

  if (bgStyle === 'tape') {
    return (
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+24px)] h-[calc(100%+10px)] -left-[12px] -top-[5px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        <path
          d="M 14 6 L 292 2 L 286 18 L 296 34 L 288 50 L 295 66 L 287 78 L 8 76 L 15 62 L 5 48 L 13 32 L 6 18 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
          opacity={isOutline ? 0.5 : 0.92}
        />
      </svg>
    );
  }

  if (bgStyle === 'skew') {
    return (
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="absolute inset-0 w-[calc(100%+24px)] h-[calc(100%+10px)] -left-[12px] -top-[5px] pointer-events-none z-0 overflow-visible"
        style={{
          filter: filterVal,
          opacity: bgOpacity,
          transform: plateTransform,
          transformOrigin: 'center center',
        }}
      >
        <path
          d="M 24 3 L 298 2 L 276 77 L 2 78 Z"
          fill={fillVal}
          stroke={strokeVal}
          strokeWidth={strokeWidthVal}
          fillOpacity={fillOpacityVal}
        />
      </svg>
    );
  }

  const borderRadius = bgStyle === 'pill' ? '9999px' : '6px';
  let divBgColor = bgColor;
  let divBorder = 'none';
  let divBoxShadow = '0 4px 12px rgba(0,0,0,0.6)';

  if (isOutline) {
    divBgColor = 'transparent';
    divBorder = `3px solid ${bgColor}`;
  } else if (isShadow) {
    divBgColor = 'rgba(0,0,0,0.15)';
    divBoxShadow = `0 0 24px 6px ${bgColor}, 0 4px 12px rgba(0,0,0,0.5)`;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundColor: divBgColor,
        border: divBorder,
        borderRadius,
        margin: '-4px -10px',
        boxShadow: divBoxShadow,
        opacity: bgOpacity,
        transform: plateTransform,
        transformOrigin: 'center center',
      }}
    />
  );
};

export const SEOTab = (props: any) => {
  const { 
    trendingIdeas, 
    setSelectedIdea,
    thumbnailReference,
    setThumbnailReference,
    thumbnailReferenceStyle,
    setThumbnailReferenceStyle
  } = useApp();

  const [isAnalyzingReferenceStyle, setIsAnalyzingReferenceStyle] = useState(false);

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setThumbnailReference(base64Data);
      setIsAnalyzingReferenceStyle(true);
      const toastId = toast.loading("Анализируем визуальный стиль вашего референса...");
      
      try {
        const response = await fetch("/api/youtube/analyze-reference-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64Data,
            mimeType: file.type
          })
        });

        if (response.ok) {
          const data = await response.json();
          setThumbnailReferenceStyle(data.styleDescription);
          toast.success("Визуальный стиль успешно определен и зафиксирован в референсах!", { id: toastId });
        } else {
          throw new Error("Не удалось получить описание стиля");
        }
      } catch (error: any) {
        logger.error("Error analyzing style:", error);
        toast.error("Ошибка при анализе стиля референса. Используем локальное представление.", { id: toastId });
        setThumbnailReferenceStyle("Контрастные цвета, современный динамичный дизайн YouTube, яркое освещение");
      } finally {
        setIsAnalyzingReferenceStyle(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [editingImprovementIndex, setEditingImprovementIndex] = useState<number | null>(null);
  const [editImprovementValue, setEditImprovementValue] = useState('');

  const [ctrPrediction, setCtrPrediction] = useState<{ ctr: string; reasoning: string; score: number; estimatedCTR: string; feedback: string; suggestions: string[] } | null>(null);
  const [isEvaluatingCTR, setIsEvaluatingCTR] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');

  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editedKeywords, setEditedKeywords] = useState('');

  // AI Generator states
  const [isGeneratingAITitle, setIsGeneratingAITitle] = useState(false);
  const [isGeneratingAIDesc, setIsGeneratingAIDesc] = useState(false);
  const [isGeneratingAIKeywords, setIsGeneratingAIKeywords] = useState(false);

  // Visual Editor State
  const [thumbnailTexts, setThumbnailTexts] = useState<any[]>([]);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [previewEditorTab, setPreviewEditorTab] = useState<'layers' | 'plate' | 'style'>('layers');
  const [activeLayoutTemplate, setActiveLayoutTemplate] = useState<string | undefined>(undefined);
  const [bgDim, setBgDim] = useState<number>(20);
  const [fontStyle, setFontStyle] = useState<string>('default');

  const [customTemplates, setCustomTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('yt_card_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveCustomTemplateInSEO = (newTmpl: any) => {
    const tmplWithLayers = {
      ...newTmpl,
      layers: thumbnailTexts.map(layer => ({ ...layer })),
    };

    const updated = [tmplWithLayers, ...customTemplates.filter(t => t.id !== newTmpl.id)];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('yt_card_custom_templates', JSON.stringify(updated));
    } catch (err) {
      logger.error('Error saving template:', err);
    }
  };

  const handleApplyCustomTemplateInSEO = (tmpl: any) => {
    if (tmpl.layers && Array.isArray(tmpl.layers) && tmpl.layers.length > 0) {
      setThumbnailTexts(tmpl.layers.map((l: any) => ({ ...l })));
    }
    if (tmpl.fontStyle) {
      setFontStyle(tmpl.fontStyle);
    }
  };

  const handleApplyLayoutTemplate = (templateId: string) => {
    setActiveLayoutTemplate(templateId);
    let current = [...thumbnailTexts];
    
    // If no text layers exist yet, populate with 2 sample layers
    if (current.length === 0) {
      current = [
        {
          text: "ГЛАВНЫЙ ЗАГОЛОВОК",
          x: '50%',
          y: '40%',
          fontSize: 38,
          rotate: 0,
          opacity: 1,
          color: '#ffffff',
          bgStyle: 'brush',
          bgColor: '#e11d48',
          bgOpacity: 1,
          bgScale: 1.1,
          fontFamily: "'Bebas Neue', sans-serif"
        },
        {
          text: "КЛЮЧЕВОЙ АКЦЕНТ",
          x: '50%',
          y: '60%',
          fontSize: 30,
          rotate: 0,
          opacity: 1,
          color: '#fbbf24',
          bgStyle: 'rectangle',
          bgColor: '#000000',
          bgOpacity: 0.9,
          bgScale: 1,
          fontFamily: "'Bebas Neue', sans-serif"
        }
      ];
    }

    const updated = current.map((item, idx) => {
      let x = item.x;
      let y = item.y;
      let rotate = item.rotate || 0;

      switch (templateId) {
        case 'left':
          x = '28%';
          y = `${28 + idx * 22}%`;
          rotate = 0;
          break;
        case 'center':
          x = '50%';
          y = `${30 + idx * 22}%`;
          rotate = 0;
          break;
        case 'right':
          x = '72%';
          y = `${28 + idx * 22}%`;
          rotate = 0;
          break;
        case 'top':
          x = '50%';
          y = `${18 + idx * 18}%`;
          rotate = 0;
          break;
        case 'bottom':
          x = '50%';
          y = `${68 + idx * 16}%`;
          rotate = 0;
          break;
        case 'diagonal':
          x = `${25 + idx * 24}%`;
          y = `${25 + idx * 22}%`;
          rotate = idx % 2 === 0 ? -4 : 4;
          break;
        case 'corners':
          if (idx === 0) {
            x = '28%';
            y = '25%';
          } else if (idx === 1) {
            x = '72%';
            y = '72%';
          } else {
            x = `${30 + (idx % 2) * 40}%`;
            y = `${30 + idx * 18}%`;
          }
          rotate = 0;
          break;
        default:
          break;
      }

      return {
        ...item,
        x,
        y,
        rotate
      };
    });

    setThumbnailTexts(updated);
    toast.success("Макет расположения применен!");
  };

  const {
    nicheData,
    renderIdeaBanner,
    videoSEO,
    setVideoSEO,
    handleExportSEO,
    handleGenerateVideoSEO,
    isGeneratingVideoSEO,
    selectedIdea,
    scriptStructure = [],
    generatedBlocks = {},
    handleAnalyzeTitles,
    isAnalyzingTitles,
    titleAnalysis,
    applyBroadSEOChange,
    handleAnalyzeSEO,
    isAnalyzingSEO,
    seoAnalysis,
    setSeoAnalysis,
    handleApplySEOImprovement,
    previewThumbnail,
    handleDownloadPreview,
    handleGeneratePreviewThumbnail,
    isPreviewLoading,
    YouTubeCardPreview,
    selectedBranding,
    thumbnailVariants = [],
    setPreviewThumbnail,
    downloadImage,
    setThumbnailVariants,
    previewBorderColor,
    setPreviewBorderColor,
    previewChannelColor,
    setPreviewChannelColor,
    renderExportDropdown,
    handleForceRegenerateThumbnailStyle,
    customInstructions = "",
    isCustomInstructionsEnabled = false
  } = props;

  if (!nicheData) return null;

  // Timestamps calculation aligned with script structure & generated blocks
  const blockTimestamps = generateScriptBlockTimestamps(scriptStructure, generatedBlocks);

  const handleCustomThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Пожалуйста, выберите изображение превью (PNG, JPG)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (setPreviewThumbnail) {
          setPreviewThumbnail(dataUrl);
        }
        toast.success("Своё превью успешно загружено!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedTextIndex === null) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Пожалуйста, выберите изображение текстуры (PNG, JPG)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = [...thumbnailTexts];
        updated[selectedTextIndex].bgStyle = 'custom';
        updated[selectedTextIndex].customTexture = dataUrl;
        if (!updated[selectedTextIndex].bgScale) updated[selectedTextIndex].bgScale = 1;
        if (updated[selectedTextIndex].bgOpacity === undefined) updated[selectedTextIndex].bgOpacity = 1;
        setThumbnailTexts(updated);
        toast.success("Текстура мазка успешно загружена!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddStandalonePlate = (bgStylePreset: string = 'brush') => {
    const newPlate = {
      text: "",
      isPlateOnly: true,
      x: '50%',
      y: '50%',
      fontSize: 32,
      rotate: 0,
      bgRotate: 0,
      bgOffsetX: 0,
      bgOffsetY: 0,
      opacity: 1,
      color: '#ffffff',
      bgStyle: bgStylePreset,
      bgColor: '#000000',
      bgOpacity: 1,
      bgScale: 1.3,
    };
    setThumbnailTexts([...thumbnailTexts, newPlate]);
    setSelectedTextIndex(thumbnailTexts.length);
    toast.success("Добавлена отдельная подложка (плашка)");
  };

  const handleAddPlateOnly = () => handleAddStandalonePlate();

  const handleAddThumbnailText = () => {
    const newText = {
      text: "НОВЫЙ ТЕКСТ",
      x: '50%',
      y: '50%',
      fontSize: 32,
      rotate: 0,
      bgRotate: 0,
      bgOffsetX: 0,
      bgOffsetY: 0,
      opacity: 1,
      color: '#ffffff',
      bgStyle: 'none',
      bgColor: '#000000',
      bgOpacity: 1,
      bgScale: 1,
      fontFamily: "'Bebas Neue', sans-serif"
    };
    setThumbnailTexts([...thumbnailTexts, newText]);
    setSelectedTextIndex(thumbnailTexts.length);
    toast.success("Добавлен новый текстовый слой");
  };

  const handleRemoveThumbnailText = (indexToRemove: number) => {
    const updated = thumbnailTexts.filter((_, i) => i !== indexToRemove);
    setThumbnailTexts(updated);
    if (selectedTextIndex === indexToRemove) {
      setSelectedTextIndex(null);
    } else if (selectedTextIndex !== null && selectedTextIndex > indexToRemove) {
      setSelectedTextIndex(selectedTextIndex - 1);
    }
    toast.success("Слой удален");
  };

  const handleSeparatePlate = () => {
    if (selectedTextIndex === null || !thumbnailTexts[selectedTextIndex]) return;
    const current = thumbnailTexts[selectedTextIndex];
    if (!current.bgStyle || current.bgStyle === 'none') {
      toast.error("У выбранного слоя нет подложки для отделения");
      return;
    }

    const updated = [...thumbnailTexts];
    const plateInfo = {
      text: "",
      isPlateOnly: true,
      x: current.x || '50%',
      y: current.y || '50%',
      fontSize: current.fontSize || 32,
      rotate: current.bgRotate || 0,
      bgRotate: current.bgRotate || 0,
      bgOffsetX: current.bgOffsetX || 0,
      bgOffsetY: current.bgOffsetY || 0,
      opacity: 1,
      color: '#ffffff',
      bgStyle: current.bgStyle,
      bgColor: current.bgColor || '#000000',
      bgOpacity: current.bgOpacity ?? 1,
      bgScale: current.bgScale ?? 1,
      customTexture: current.customTexture,
      plateAppearance: current.plateAppearance || 'fill',
    };

    updated[selectedTextIndex] = {
      ...current,
      bgStyle: 'none',
    };

    // Insert plate layer right BEFORE the text layer so it sits visually underneath the text
    updated.splice(selectedTextIndex, 0, plateInfo);
    setThumbnailTexts(updated);
    setSelectedTextIndex(selectedTextIndex + 1); // select the text layer
    toast.success("Подложка вынесена на отдельный слой!");
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index < thumbnailTexts.length - 1) {
      const updated = [...thumbnailTexts];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      setThumbnailTexts(updated);
      setSelectedTextIndex(index + 1);
    } else if (direction === 'down' && index > 0) {
      const updated = [...thumbnailTexts];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      setThumbnailTexts(updated);
      setSelectedTextIndex(index - 1);
    }
  };

  const handleEvaluateCTR = async () => {
    const title = videoSEO?.title || selectedIdea;
    if (!title) {
      toast.error("Не указан заголовок видео");
      return;
    }
    setIsEvaluatingCTR(true);
    try {
      const result = await evaluateCTR(title, previewThumbnail);
      setCtrPrediction(result);
      toast.success("CTR успешно оценен!");
    } catch (e) {
      handleAppError(e, "Оценка CTR");
    } finally {
      setIsEvaluatingCTR(false);
    }
  };

  // Requirement 3: Include pinned comment when copying for YouTube Studio
  const handleCopyAllTags = () => {
    if (!videoSEO) {
      toast.error("Нет данных SEO для копирования");
      return;
    }
    const kwList = videoSEO.keywords ? videoSEO.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const htList = videoSEO.hashtags ? videoSEO.hashtags.map((s: string) => s.trim().replace(/^#/, '')).filter(Boolean) : [];
    const tagsFormatted = Array.from(new Set([...kwList, ...htList])).join(', ');
    const hashtagsFormatted = htList.map((t: string) => `#${t}`).join(' ');

    const fullBlock = `ЗАГОЛОВОК ВИДЕО:
${videoSEO.title || ''}

ОПИСАНИЕ ВИДЕО:
${videoSEO.description || ''}

ЗАКРЕПЛЕННЫЙ КОММЕНТАРИЙ:
${videoSEO.pinnedComment || ''}

ХЭШТЕГИ:
${hashtagsFormatted}

ТЕГИ ДЛЯ YOUTUBE STUDIO:
${tagsFormatted}`;

    copyToClipboard(fullBlock);
    toast.success("Заголовок, описание, закрепленный комментарий, теги и хэштеги скопированы для YouTube Studio!");
  };

  const handleClearAllTags = () => {
    if (!videoSEO) return;
    setVideoSEO({
      ...videoSEO,
      keywords: '',
      hashtags: []
    });
    toast.success("Все теги успешно очищены");
  };

  const addKeywordToTags = (kw: string) => {
    if (!videoSEO) return;
    const currentKeywords = videoSEO.keywords ? videoSEO.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    if (!currentKeywords.includes(kw)) {
      const updated = [...currentKeywords, kw].join(', ');
      setVideoSEO({ ...videoSEO, keywords: updated });
      toast.success(`Ключевое слово "${kw}" добавлено в теги`);
    } else {
      toast.info(`Ключевое слово "${kw}" уже есть в тегах`);
    }
  };

  const addAllKeywordsToTags = (list: string[], typeName: string) => {
    if (!videoSEO) return;
    const currentKeywords = videoSEO.keywords ? videoSEO.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const newItems = list.filter(kw => !currentKeywords.includes(kw));
    if (newItems.length === 0) {
      toast.info(`Все ${typeName} ключевые слова уже добавлены в теги`);
      return;
    }
    const updated = [...currentKeywords, ...newItems].join(', ');
    setVideoSEO({ ...videoSEO, keywords: updated });
    toast.success(`Добавлено ${newItems.length} ключевых слов (${typeName}) в теги`);
  };

  // Synchronize Scene Cues & Timestamps into Description
  const handleSyncScriptTimestampsToDescription = () => {
    if (!videoSEO) return;
    const lines = blockTimestamps.map(item => `${item.timeCode} - ${item.title}`);
    const computedTimestampsText = `\n\nТаймкоды и сцены:\n${lines.join('\n')}`;

    let desc = videoSEO.description || "";
    if (/Таймкоды[\s\S]*/i.test(desc)) {
      desc = desc.replace(/Таймкоды[\s\S]*/i, `Таймкоды и сцены:\n${lines.join('\n')}`);
    } else {
      desc += computedTimestampsText;
    }

    setVideoSEO({ ...videoSEO, description: desc.trim() });
    toast.success(`Таймкоды сценария (${blockTimestamps.length} блоков) успешно синхронизированы в описании!`);
  };

  // Remove individual Audit improvement recommendation without applying
  const handleRemoveAuditImprovement = (index: number) => {
    if (!seoAnalysis || !seoAnalysis.improvements) return;
    const updated = [...seoAnalysis.improvements];
    const removedItem = updated.splice(index, 1)[0];
    setSeoAnalysis({
      ...seoAnalysis,
      improvements: updated
    });
    toast.info(`Рекомендация "${removedItem?.area || 'аудита'}" удалена из списка.`);
  };

  // Apply Google Search Tip to Description
  const handleApplyGoogleTipToDesc = (tipText: string, index: number) => {
    if (!videoSEO) return;
    const currentDesc = videoSEO.description || "";
    const updatedDesc = `${currentDesc}\n\n• ${tipText}`.trim();
    setVideoSEO({ ...videoSEO, description: updatedDesc });

    handleRemoveGoogleTip(index);
    toast.success("Совет Google Search успешно добавлен в описание!");
  };

  // Apply Google Search Tip to Keywords/Tags
  const handleApplyGoogleTipToTags = (tipText: string, index: number) => {
    if (!videoSEO) return;
    const keywordsToAdd = tipText
      .replace(/[^a-zA-Zа-яА-Я0-9\s,]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4)
      .join(' ');

    if (keywordsToAdd) {
      addKeywordToTags(keywordsToAdd);
    }
    handleRemoveGoogleTip(index);
    toast.success("Ключевые фразы из совета добавлены в теги!");
  };

  // Remove individual Google Search Tip
  const handleRemoveGoogleTip = (index: number) => {
    if (!seoAnalysis || !seoAnalysis.googleSearchTips) return;
    const updated = [...seoAnalysis.googleSearchTips];
    updated.splice(index, 1);
    setSeoAnalysis({
      ...seoAnalysis,
      googleSearchTips: updated
    });
  };

  // Apply ALL Google Search Tips to Description and clear
  const handleApplyAllGoogleTips = () => {
    if (!videoSEO || !seoAnalysis?.googleSearchTips?.length) return;
    const tipsFormatted = seoAnalysis.googleSearchTips.map((tip: string) => `• ${tip}`).join('\n');
    const updatedDesc = `${videoSEO.description || ''}\n\nРекомендации Google Search:\n${tipsFormatted}`.trim();
    setVideoSEO({ ...videoSEO, description: updatedDesc });
    setSeoAnalysis({ ...seoAnalysis, googleSearchTips: [] });
    toast.success("Все рекомендации Google Search применены к описанию!");
  };

  // Requirement 4: Title Quality Indicator Calculation
  const getTitleQualityMetrics = (titleStr: string, keywordsStr: string) => {
    const trimmedTitle = (titleStr || "").trim();
    const len = trimmedTitle.length;
    
    const keywords = keywordsStr
      ? keywordsStr.split(',').map(s => s.trim()).filter(s => s.length > 2)
      : [];

    const lowerTitle = trimmedTitle.toLowerCase();
    const matchedKeywords = keywords.filter(kw => lowerTitle.includes(kw.toLowerCase()));

    let lenStatus: 'optimal' | 'warning' | 'danger' | 'empty' = 'optimal';
    let lenLabel = "";
    let lenScore = 0;

    if (len === 0) {
      lenStatus = 'empty';
      lenLabel = 'Заголовок не заполнен';
      lenScore = 0;
    } else if (len < 20) {
      lenStatus = 'warning';
      lenLabel = `Слишком короткий (${len} симв.) — мало контекста для поиска YouTube`;
      lenScore = 40;
    } else if (len >= 40 && len <= 70) {
      lenStatus = 'optimal';
      lenLabel = `Идеальная длина (${len} симв.) — полностью виден на мобильных и ПК`;
      lenScore = 100;
    } else if (len > 20 && len < 40) {
      lenStatus = 'optimal';
      lenLabel = `Хорошая длина (${len} симв.) — рекомендуем добавить еще 1 ключевое слово`;
      lenScore = 80;
    } else if (len > 70 && len <= 90) {
      lenStatus = 'warning';
      lenLabel = `Длинный заголовок (${len} симв.) — может частично обрезаться на смартфонах`;
      lenScore = 60;
    } else {
      lenStatus = 'danger';
      lenLabel = `Слишком длинный (${len} симв.) — YouTube обрезает заголовки длиннее 70-90 символов`;
      lenScore = 20;
    }

    const kwScore = keywords.length === 0 ? 50 : Math.min(100, Math.round((matchedKeywords.length / Math.min(keywords.length, 3)) * 100));
    const hasHook = /(как|топ|почему|секрет|ошибка|лучший|правда|новый|быстрый|пошагово|обзор|\d+|\!|\?)/i.test(trimmedTitle);
    const hookScore = hasHook ? 100 : 40;

    const totalScore = Math.round((lenScore * 0.4) + (kwScore * 0.4) + (hookScore * 0.2));

    return {
      len,
      lenStatus,
      lenLabel,
      matchedKeywords,
      hasHook,
      totalScore
    };
  };

  // Requirement 2: Extended AI Generators for Title, Description & Keywords
  const handleEnhanceTitleAI = async (style: 'ctr' | 'seo' | 'short') => {
    if (!videoSEO) return;
    setIsGeneratingAITitle(true);
    const toastId = toast.loading("ИИ с генерирует улучшенный вариант заголовка...");
    try {
      const baseTitle = videoSEO.title || selectedIdea || "";
      if (style === 'ctr') {
        const opt = await optimizeTitle(baseTitle);
        setVideoSEO({ ...videoSEO, title: opt });
        toast.success("Заголовок оптимизирован для максимального CTR!", { id: toastId });
      } else if (style === 'seo') {
        const keywordsStr = videoSEO.keywords ? videoSEO.keywords.split(',')[0] : '';
        const seoTitle = `${baseTitle} — ${keywordsStr ? keywordsStr.trim() : 'Пошаговый разбор'} (2026)`;
        setVideoSEO({ ...videoSEO, title: seoTitle });
        toast.success("Заголовок оптимизирован под поисковый интент!", { id: toastId });
      } else if (style === 'short') {
        const shortTitle = baseTitle.length > 50 ? baseTitle.substring(0, 47) + '...' : baseTitle;
        setVideoSEO({ ...videoSEO, title: shortTitle });
        toast.success("Заголовок укорочен для отличной видимости на мобильных!", { id: toastId });
      }
    } catch (e) {
      handleAppError(e, "Генерация заголовка");
      toast.dismiss(toastId);
    } finally {
      setIsGeneratingAITitle(false);
    }
  };

  const handleExpandDescriptionAI = async () => {
    if (!videoSEO) return;
    setIsGeneratingAIDesc(true);
    const toastId = toast.loading("ИИ структурирует и расширяет описание...");
    try {
      const baseDesc = videoSEO.description || "";
      const baseTitle = videoSEO.title || selectedIdea || "";
      const timestampsStr = blockTimestamps.map(b => `${b.timeCode} - ${b.title}`).join('\n');

      const expandedDesc = `📌 О ЧЕМ ЭТО ВИДЕО:
${baseTitle}
В этом выпуске мы подробно разберем ключевые аспекты, практические примеры и проверенные решения.

⏱️ ТАЙМКОДЫ И ГЛАВЫ:
${timestampsStr}

💡 КЛЮЧЕВЫЕ ВЫВОДЫ И ССЫЛКИ:
• Поделитесь этим видео с друзьями, кому актуальна тема!
• Подписывайтесь на канал, чтобы не пропустить следующие полезные разборы.
• Пишите ваше мнение и вопросы в комментариях ниже!

🔍 ТЕГИ И ПОИСКОВЫЕ ЗАПРОСЫ:
${videoSEO.keywords || ''}`;

      setVideoSEO({ ...videoSEO, description: expandedDesc.trim() });
      toast.success("Описание расширено и структурировано с таймкодами!", { id: toastId });
    } catch (e) {
      handleAppError(e, "Расширение описания");
      toast.dismiss(toastId);
    } finally {
      setIsGeneratingAIDesc(false);
    }
  };

  const handleExpandKeywordsAI = async () => {
    if (!videoSEO) return;
    setIsGeneratingAIKeywords(true);
    const toastId = toast.loading("ИИ генерирует LSI ключевые фразы...");
    try {
      const currentKeywords = videoSEO.keywords ? videoSEO.keywords.split(',').map(s => s.trim()).filter(Boolean) : [];
      const baseTopic = selectedIdea || videoSEO.title || "видео";
      const lsiAdditions = [
        `${baseTopic} 2026`,
        `как сделать ${baseTopic}`,
        `пошаговая инструкция`,
        `полезные советы`,
        `обзор и разбор`,
        `секреты и фишки`,
        `топ ошибок`
      ];

      const merged = Array.from(new Set([...currentKeywords, ...lsiAdditions])).join(', ');
      setVideoSEO({ ...videoSEO, keywords: merged });
      toast.success("LSI ключевые слова успешно добавлены в теги!", { id: toastId });
    } catch (e) {
      handleAppError(e, "Добавление тегов");
      toast.dismiss(toastId);
    } finally {
      setIsGeneratingAIKeywords(false);
    }
  };

  // Detect active Brandbook & Custom Instructions status
  const brandName = selectedBranding?.name || nicheData?.branding?.names?.[0]?.name;
  const brandColors = selectedBranding?.colorPalette || nicheData?.branding?.colors;

  return (
    <div className="space-y-5">
      <ScrollFadeIn>
        {renderIdeaBanner()}
      </ScrollFadeIn>

      <div className="space-y-6 w-full">
        {/* Main Column: SEO Data & Script Sync */}
        <div className="w-full space-y-5">
          <ScrollFadeIn delay={0.1}>
            <div className="p-5 bg-neutral-900/70 rounded-xl border border-neutral-800 space-y-5 shadow-sm">
              {/* Header & Main Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Film className="text-accent shrink-0" size={18} />
                  <h4 className="text-base font-bold text-white">
                    SEO для видео
                  </h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={handleCopyAllTags}
                    disabled={!videoSEO}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 hover:text-white rounded-lg transition-all text-xs font-bold border border-neutral-700 shadow-sm"
                    title="Скопировать заголовок, описание, комментарий, теги и хэштеги для YouTube Studio"
                  >
                    <Copy size={13} className="text-accent" />
                    <span>Для YouTube Studio</span>
                  </button>
                  <button 
                    onClick={handleGenerateVideoSEO}
                    disabled={isGeneratingVideoSEO || !selectedIdea}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-primary hover:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg transition-all text-xs font-bold shadow-sm"
                  >
                    {isGeneratingVideoSEO ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    {(scriptStructure?.length ?? 0) > 0 ? 'Сгенерировать SEO по сценарию' : 'Сгенерировать SEO'}
                  </button>
                </div>
              </div>

              {/* Active Instructions / Brandbook Indicator */}
              {(isCustomInstructionsEnabled || Boolean(customInstructions?.trim()) || Boolean(brandName)) && (
                <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={13} className="animate-pulse text-emerald-400 shrink-0" />
                    <span className="truncate">
                      <strong>Синхронизация с брендбуком:</strong> {brandName ? `Канал "${brandName}"` : 'Пользовательские правила ИИ активны'}
                    </span>
                  </div>
                  {brandColors && (
                    <div className="flex items-center gap-1">
                      {Array.isArray(brandColors) && brandColors.slice(0, 3).map((c: string, idx: number) => (
                        <span key={`brand-color-${c}-${idx}`} className="w-2.5 h-2.5 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Idea Preview Card */}
              {selectedIdea ? (
                <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Тема / Идея видео</span>
                    <p className="text-xs text-white font-semibold truncate italic mt-0.5">"{selectedIdea}"</p>
                  </div>
                  <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold uppercase rounded shrink-0">
                    Активна
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-neutral-950/40 rounded-lg border border-dashed border-neutral-800 text-center">
                  <p className="text-xs text-neutral-500">Сначала выберите идею на вкладке "Идеи"</p>
                </div>
              )}

              {videoSEO && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 rounded-[28px] border border-neutral-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_28%),linear-gradient(135deg,_rgba(12,12,12,1)_0%,_rgba(17,17,17,1)_48%,_rgba(8,20,16,1)_100%)] p-3.5 shadow-[0_22px_50px_rgba(0,0,0,0.28)]"
                >
                  {/* Title Section */}
                  <div className="space-y-2 rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-neutral-950 via-neutral-950 to-emerald-950/10 p-3 shadow-[0_12px_28px_rgba(16,185,129,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-400">Title</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Оптимизированный заголовок</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditingTitle ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (!editedTitle.trim()) {
                                  toast.error("Заголовок не может быть пустым");
                                  return;
                                }
                                setVideoSEO({ ...videoSEO, title: editedTitle.trim() });
                                setIsEditingTitle(false);
                                toast.success("Заголовок сохранен");
                              }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-bold flex items-center gap-1"
                            >
                              <Check size={11} /> Сохранить
                            </button>
                            <button 
                              onClick={() => setIsEditingTitle(false)}
                              className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold flex items-center gap-1"
                            >
                              <X size={11} /> Отмена
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditedTitle(videoSEO.title);
                              setIsEditingTitle(true);
                            }}
                            className="text-[10px] text-neutral-400 hover:text-white uppercase font-bold flex items-center gap-1"
                          >
                            <Edit2 size={10} /> Изменить
                          </button>
                        )}
                        <button 
                          onClick={handleAnalyzeTitles}
                          disabled={isAnalyzingTitles}
                          className="text-[10px] text-yellow-500 hover:text-yellow-400 uppercase font-bold flex items-center gap-1"
                        >
                          {isAnalyzingTitles ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                          Уникальность
                        </button>
                      </div>
                    </div>
                    {isEditingTitle ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full p-3 bg-neutral-950 rounded-lg border border-accent text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    ) : (
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-sm font-bold text-white leading-snug">
                        {videoSEO.title}
                      </div>
                    )}

                    {/* REQUIREMENT 4: Title Quality Indicator Widget */}
                    {(() => {
                      const metrics = getTitleQualityMetrics(videoSEO.title, videoSEO.keywords);
                      return (
                        <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Target size={14} className={metrics.totalScore >= 75 ? "text-emerald-400" : metrics.totalScore >= 50 ? "text-yellow-400" : "text-red-400"} />
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                Индикатор качества заголовка
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                metrics.lenStatus === 'optimal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                metrics.lenStatus === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                {metrics.len} / 100 симв.
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                metrics.totalScore >= 75 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                metrics.totalScore >= 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                Оценка: {metrics.totalScore}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                metrics.totalScore >= 75 ? 'bg-emerald-400' : metrics.totalScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${metrics.totalScore}%` }}
                            />
                          </div>

                          <p className="text-[11px] text-neutral-300 leading-snug">
                            • {metrics.lenLabel}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-neutral-800/60 text-[10px]">
                            <span className="text-neutral-500 font-bold uppercase text-[9px]">Теги в заголовке:</span>
                            {metrics.matchedKeywords.length > 0 ? (
                              metrics.matchedKeywords.map((kw: string, i: number) => (
                                <span key={`matched-kw-${kw}-${i}`} className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                                  ✓ {kw}
                                </span>
                              ))
                            ) : (
                              <span className="text-red-400/80 italic text-[10px]">
                                ⚠️ Ключевые фразы из списка тегов не найдены в заголовке
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* REQUIREMENT 2: Quick AI Title Enhancers */}
                    <div className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800 space-y-1.5">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap size={10} className="text-yellow-400" /> Быстрые ИИ-усилители заголовка:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleEnhanceTitleAI('ctr')}
                          disabled={isGeneratingAITitle}
                          className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 rounded text-[9px] font-bold transition-all text-center"
                        >
                          ⚡ CTR / Кликабельный
                        </button>
                        <button
                          onClick={() => handleEnhanceTitleAI('seo')}
                          disabled={isGeneratingAITitle}
                          className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded text-[9px] font-bold transition-all text-center"
                        >
                          🔍 Поисковый / LSI
                        </button>
                        <button
                          onClick={() => handleEnhanceTitleAI('short')}
                          disabled={isGeneratingAITitle}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded text-[9px] font-bold transition-all text-center"
                        >
                          📱 Мобильный / Короткий
                        </button>
                      </div>
                    </div>

                    {/* A/B Testing Variants for Titles */}
                    {videoSEO.titleVariants && videoSEO.titleVariants.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                          <Split size={9} className="text-accent" /> Варианты для A/B теста:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {videoSEO.titleVariants.map((variant: string, idx: number) => (
                            <button
                              key={`title-variant-${variant}-${idx}`}
                              onClick={() => {
                                setVideoSEO({ ...videoSEO, title: variant });
                                toast.success('Заголовок обновлен!');
                              }}
                              className="text-left p-2 bg-neutral-950/50 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white hover:border-accent/50 transition-all group relative flex items-center justify-between"
                            >
                              <span className="truncate pr-16">{variant}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded shrink-0">Применить</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {titleAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 p-3 bg-neutral-950 rounded-lg border border-yellow-500/30 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <Bot className="text-yellow-500 shrink-0 mt-0.5" size={14} />
                          <p className="text-xs text-neutral-300 italic leading-snug">{titleAnalysis.analysis}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Альтернативы:</p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {titleAnalysis.alternatives.map((alt: string, idx: number) => (
                              <button
                                key={`title-analysis-alt-${alt}-${idx}`}
                                onClick={() => applyBroadSEOChange('title', alt)}
                                className="text-left p-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-300 hover:text-white hover:border-yellow-500/50 transition-all flex items-center justify-between group"
                              >
                                <span className="truncate pr-12">{alt}</span>
                                <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-yellow-500 uppercase shrink-0">Выбрать</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Description Section */}
                  <div className="space-y-2 rounded-[20px] border border-neutral-800/80 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/10 p-3 shadow-[0_10px_22px_rgba(245,158,11,0.04)]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">Desc</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Описание видео</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleExpandDescriptionAI}
                          disabled={isGeneratingAIDesc}
                          className="text-[9px] text-purple-300 hover:text-white uppercase font-bold flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                        >
                          <Wand2 size={10} /> ИИ-структура описания
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncScriptTimestampsToDescription}
                          className="text-[9px] text-amber-400 hover:text-amber-300 uppercase font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                          title="Пересчитать и применить таймкоды сценария строго с 00:00"
                        >
                          <Clock size={10} /> ⏱️ Пересчитать таймкоды
                        </button>
                        {isEditingDesc ? (
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                setVideoSEO({ ...videoSEO, description: editedDesc });
                                setIsEditingDesc(false);
                                toast.success("Описание сохранено");
                              }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-bold flex items-center gap-1"
                            >
                              <Check size={11} /> Сохранить
                            </button>
                            <button 
                              onClick={() => setIsEditingDesc(false)}
                              className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold flex items-center gap-1"
                            >
                              <X size={11} /> Отмена
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditedDesc(videoSEO.description);
                              setIsEditingDesc(true);
                            }}
                            className="text-[10px] text-neutral-400 hover:text-white uppercase font-bold flex items-center gap-1"
                          >
                            <Edit2 size={10} /> Изменить
                          </button>
                        )}
                        <button 
                          onClick={() => { copyToClipboard(videoSEO.description); toast.success('Описание скопировано'); }}
                          className="text-[10px] text-accent hover:text-emerald-300 uppercase font-bold"
                        >
                          Копировать
                        </button>
                      </div>
                    </div>
                    {isEditingDesc ? (
                      <textarea
                        value={editedDesc}
                        onChange={(e) => setEditedDesc(e.target.value)}
                        rows={7}
                        className="w-full p-3 bg-neutral-950 rounded-lg border border-accent text-xs text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent font-sans whitespace-pre-wrap"
                      />
                    ) : (
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto font-sans">
                        {videoSEO.description}
                      </div>
                    )}
                  </div>

                  {/* YouTube Studio Tags & Keywords */}
                  <div className="space-y-2 rounded-[20px] border border-neutral-800/80 bg-neutral-950/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-md border border-blue-500/20 bg-blue-500/10 text-[9px] font-black uppercase tracking-[0.16em] text-blue-400">Tags</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Теги и ключевые слова (Studio)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleExpandKeywordsAI}
                          disabled={isGeneratingAIKeywords}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded border border-purple-500/20 text-[10px] font-semibold transition-all"
                        >
                          <Zap size={11} /> + LSI ключи
                        </button>
                        <button
                          onClick={handleCopyAllTags}
                          className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded border border-neutral-700 text-[10px] font-semibold transition-all"
                        >
                          <Copy size={11} className="text-accent" /> Скопировать теги
                        </button>
                        <button
                          onClick={handleClearAllTags}
                          className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 text-[10px] font-semibold transition-all"
                        >
                          <Trash2 size={11} /> Очистить
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[9px] text-neutral-500 uppercase font-bold">Ключевые фразы</span>
                          {isEditingKeywords ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setVideoSEO({ ...videoSEO, keywords: editedKeywords });
                                  setIsEditingKeywords(false);
                                  toast.success("Теги сохранены");
                                }}
                                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold"
                              >
                                Сохранить
                              </button>
                              <button onClick={() => setIsEditingKeywords(false)} className="text-[9px] text-red-400 font-bold">Отмена</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setEditedKeywords(videoSEO.keywords);
                                setIsEditingKeywords(true);
                              }}
                              className="text-[9px] text-neutral-400 hover:text-white font-bold flex items-center gap-1"
                            >
                              <Edit2 size={9} /> Изменить
                            </button>
                          )}
                        </div>
                        {isEditingKeywords ? (
                          <textarea
                            value={editedKeywords}
                            onChange={(e) => setEditedKeywords(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 bg-neutral-950 rounded-lg border border-accent text-[10px] text-white font-mono focus:outline-none"
                          />
                        ) : (
                          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-[10px] text-neutral-400 font-mono break-all leading-relaxed min-h-[70px] max-h-28 overflow-y-auto">
                            {videoSEO.keywords || "Нет ключевых слов"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-2.5">
                        <span className="text-[9px] text-neutral-500 uppercase font-bold">Хештеги</span>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 min-h-[70px] max-h-28 overflow-y-auto content-start">
                          {videoSEO.hashtags && videoSEO.hashtags.length > 0 ? (
                            videoSEO.hashtags.map((tag: string, i: number) => (
                              <span key={`seo-ht-item-${i}`} className="px-2 py-0.5 bg-accent/10 text-accent rounded border border-accent/20 text-[10px] font-medium">
                                #{tag.replace(/^#/, '')}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-neutral-600">Нет хештегов</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pinned Comment Block */}
                  <div className="p-3 rounded-[20px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-neutral-950 to-neutral-950 space-y-1.5 shadow-[0_12px_28px_rgba(16,185,129,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h5 className="text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1 tracking-wider">
                        <Quote size={10} /> Закрепленный комментарий
                      </h5>
                      {videoSEO.pinnedComment && (
                        <button 
                          onClick={() => { copyToClipboard(videoSEO.pinnedComment); toast.success('Комментарий скопирован'); }}
                          className="text-[9px] text-accent hover:underline font-bold"
                        >
                          Копировать
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed italic bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/80">
                      {videoSEO.pinnedComment || "Нажмите 'Сгенерировать SEO', чтобы создать комментарий для сбора вовлеченности."}
                    </p>
                  </div>

                  {/* SEO Audit Button */}
                  <div className="pt-2 border-t border-neutral-800 relative">
                    <button
                      onClick={handleAnalyzeSEO}
                      disabled={isAnalyzingSEO}
                      className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isAnalyzingSEO 
                          ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40 animate-pulse' 
                          : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                      }`}
                    >
                      {isAnalyzingSEO ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          ИИ выполняет SEO-аудит...
                        </>
                      ) : (
                        <>
                          <BarChart3 size={14} />
                          Запустить SEO-аудит и получить рекомендации
                        </>
                      )}
                    </button>
                  </div>

                  {/* SEO AUDIT & RECOMMENDATIONS PANEL */}
                  {seoAnalysis && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-neutral-950 rounded-xl border border-yellow-500/30 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 size={14} className="text-yellow-500" /> Результаты SEO-аудита
                        </h5>
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          seoAnalysis.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          seoAnalysis.score >= 50 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          Счет: {seoAnalysis.score}/100
                        </div>
                      </div>
                      
                      {seoAnalysis.analysis && (
                        <p className="text-xs text-neutral-300 italic leading-relaxed">
                          {seoAnalysis.analysis}
                        </p>
                      )}

                      {/* SEO Audit Improvements List - Dynamic Apply & Remove */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Замечания аудита ({seoAnalysis.improvements?.length || 0})
                        </span>

                        {seoAnalysis.improvements && seoAnalysis.improvements.length > 0 ? (
                          seoAnalysis.improvements.map((imp: any, i: number) => (
                            <div key={`seo-audit-item-${i}`} className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 space-y-2 relative group hover:border-yellow-500/40 transition-colors">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-white uppercase flex items-center gap-1.5">
                                  <Sparkles size={11} className="text-yellow-500 shrink-0" />
                                  {imp.area}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                    imp.impact === 'high' ? 'bg-red-500/10 text-red-400' :
                                    imp.impact === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-blue-500/10 text-blue-400'
                                  }`}>
                                    {imp.impact} Impact
                                  </span>
                                  <button
                                    onClick={() => handleRemoveAuditImprovement(i)}
                                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition-colors"
                                    title="Удалить замечание из списка"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-xs text-neutral-300 leading-snug">{imp.suggestion}</p>

                              {imp.suggestedValue && (
                                <div className="p-2 bg-neutral-950 rounded border border-neutral-800 text-[10px] text-neutral-400 font-mono">
                                  Предлагаемый вариант: {imp.suggestedValue && imp.suggestedValue.length > 90 ? imp.suggestedValue.substring(0, 90) + '...' : (imp.suggestedValue || '')}
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <button 
                                  onClick={() => handleApplySEOImprovement({ ...imp }, i)}
                                  className="w-full py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase rounded-lg transition-colors border border-yellow-500/20 flex items-center justify-center gap-1.5"
                                >
                                  <Check size={12} /> Применить и убрать из списка
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center space-y-1">
                            <CheckCircle2 className="mx-auto text-emerald-400" size={18} />
                            <p className="text-xs font-bold text-emerald-300 uppercase">Все замечания аудита успешно применены!</p>
                            <p className="text-[10px] text-neutral-400">Заголовок, описание и ключевые слова максимально оптимизированы.</p>
                          </div>
                        )}

                        {/* Keywords Recommendations */}
                        {seoAnalysis.keywords && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <h6 className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
                                  <BarChart3 size={11} /> Высокочастотные
                                </h6>
                                <button
                                  onClick={() => addAllKeywordsToTags(seoAnalysis.keywords.highFrequency, "высокочастотные")}
                                  className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 font-semibold"
                                >
                                  + Все в теги
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {seoAnalysis.keywords.highFrequency.map((kw: string, idx: number) => (
                                  <button key={`seo-kw-hi-${idx}`} onClick={() => addKeywordToTags(kw)} className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 rounded text-[9px] transition-all"
                                  >
                                    + {kw}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <h6 className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1">
                                  <Target size={11} /> Низкочастотные
                                </h6>
                                <button
                                  onClick={() => addAllKeywordsToTags(seoAnalysis.keywords.lowFrequency, "низкочастотные")}
                                  className="text-[9px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 font-semibold"
                                >
                                  + Все в теги
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {seoAnalysis.keywords.lowFrequency.map((kw: string, idx: number) => (
                                  <button key={`seo-kw-lo-${idx}`} onClick={() => addKeywordToTags(kw)} className="px-1.5 py-0.5 bg-purple-500/10 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 rounded text-[9px] transition-all"
                                  >
                                    + {kw}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* GOOGLE SEARCH TIPS SECTION */}
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2.5 mt-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h6 className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                              <Search size={12} /> Рекомендации Google Search
                            </h6>
                            {seoAnalysis.googleSearchTips && seoAnalysis.googleSearchTips.length > 0 && (
                              <button
                                onClick={handleApplyAllGoogleTips}
                                className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/20 rounded transition-all"
                              >
                                Применить все советы в описание
                              </button>
                            )}
                          </div>

                          {seoAnalysis.googleSearchTips && seoAnalysis.googleSearchTips.length > 0 ? (
                            <div className="space-y-2">
                              {seoAnalysis.googleSearchTips.map((tip: string, idx: number) => (
                                <div key={`seo-google-tip-${idx}`} className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] text-neutral-300 leading-relaxed flex items-start gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      <span>{tip}</span>
                                    </p>
                                    <button
                                      onClick={() => handleRemoveGoogleTip(idx)}
                                      className="text-neutral-500 hover:text-red-400 transition-colors shrink-0 p-0.5"
                                      title="Удалить совет"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-neutral-800/60">
                                    <button
                                      onClick={() => handleApplyGoogleTipToDesc(tip, idx)}
                                      className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded border border-emerald-500/20"
                                    >
                                      + В описание
                                    </button>
                                    <button
                                      onClick={() => handleApplyGoogleTipToTags(tip, idx)}
                                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded border border-neutral-700"
                                    >
                                      + В теги
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2 text-center text-[10px] text-emerald-400 font-semibold">
                              ✓ Все рекомендации Google Search применены.
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </ScrollFadeIn>
        </div>

        {/* Secondary Section: YouTube Card Preview & Compact Visual Editor */}
        <div className="w-full space-y-5">
          <ScrollFadeIn delay={0.1}>
            <div className="p-5 bg-neutral-900/70 rounded-xl border border-neutral-800 space-y-4 shadow-sm">
              {/* Top Header Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-neutral-800">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="text-accent" size={18} /> Превью на YouTube
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCustomThumbnailUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title="Загрузить своё превью (PNG/JPG)"
                    />
                    <button 
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-lg text-xs font-bold border border-neutral-700 transition-all group"
                    >
                      <Upload size={13} className="text-accent group-hover:scale-110 transition-transform shrink-0" />
                      <span>Загрузить фото</span>
                    </button>
                  </div>

                  <button 
                    onClick={handleForceRegenerateThumbnailStyle}
                    disabled={isPreviewLoading || !selectedIdea}
                    className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 text-xs font-bold transition-all"
                    title="Принудительно перегенерировать стиль"
                  >
                    {isPreviewLoading ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} className="text-accent" />}
                  </button>
                  <button 
                    onClick={handleGeneratePreviewThumbnail}
                    disabled={isPreviewLoading || !selectedIdea}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-xs font-bold border border-accent/20"
                  >
                    {isPreviewLoading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
                    Сгенерировать (ИИ)
                  </button>
                </div>
              </div>

              {/* Grid 2-columns: Preview Left, Tabbed Editor Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left Column: Preview Display + CTR + Variants */}
                <div className="lg:col-span-5 flex flex-col items-center gap-3">
                  <div className="w-full flex justify-center">
                    <YouTubeCardPreview 
                      title={videoSEO?.title || selectedIdea || ""}
                      channelName={selectedBranding?.name || brandName || "Ваш Канал"}
                      thumbnail={previewThumbnail}
                      borderColor={previewBorderColor}
                      channelColor={previewChannelColor}
                      thumbnailOverlay={
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          {thumbnailTexts.map((txt, idx) => {
                            const bgStyle = txt.bgStyle || (txt.bgColor && txt.bgColor !== 'transparent' ? 'rectangle' : 'none');
                            const bgColor = txt.bgColor || '#000000';
                            const isSelected = selectedTextIndex === idx;

                            return (
                              <motion.div
                                key={`thumb-txt-layer-${idx}`}
                                drag
                                dragConstraints={{ left: -100, right: 300, top: -100, bottom: 200 }}
                                dragElastic={0}
                                dragMomentum={false}
                                className={`absolute cursor-move pointer-events-auto select-none ${
                                  isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-black/50' : ''
                                }`}
                                style={{
                                   top: txt.y || '40%', 
                                   left: txt.x || '50%',
                                   x: "-50%",
                                   y: "-50%",
                                   zIndex: 10 + idx,
                                   opacity: txt.opacity !== undefined ? txt.opacity : 1,
                                   color: txt.color || '#ffffff',
                                   fontFamily: txt.fontFamily || 'sans-serif',
                                   fontSize: `${txt.fontSize || 32}px`,
                                   fontWeight: '900',
                                   textShadow: bgStyle !== 'none' ? '1px 1px 3px rgba(0,0,0,0.9)' : '3px 3px 6px rgba(0,0,0,0.9), 0px 0px 10px rgba(0,0,0,0.5)',
                                   whiteSpace: 'pre-wrap',
                                   textAlign: 'center',
                                   lineHeight: '1.1',
                                   letterSpacing: '-0.02em',
                                   textTransform: 'uppercase',
                                   padding: txt.isPlateOnly ? '12px 24px' : '6px 16px',
                                   display: 'inline-flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   position: 'absolute',
                                   minWidth: txt.isPlateOnly ? '100px' : 'auto',
                                   minHeight: txt.isPlateOnly ? '36px' : 'auto',
                                }}
                                onClick={(e: any) => {
                                   e.stopPropagation();
                                   setSelectedTextIndex(idx);
                                }}
                              >
                                <TextBackgroundPlate 
                                  bgStyle={bgStyle} 
                                  bgColor={bgColor} 
                                  bgOpacity={txt.bgOpacity !== undefined ? txt.bgOpacity : 1}
                                  bgScale={txt.bgScale !== undefined ? txt.bgScale : 1}
                                  bgRotate={txt.bgRotate !== undefined ? txt.bgRotate : 0}
                                  bgOffsetX={txt.bgOffsetX !== undefined ? txt.bgOffsetX : 0}
                                  bgOffsetY={txt.bgOffsetY !== undefined ? txt.bgOffsetY : 0}
                                  customTexture={txt.customTexture}
                                  plateAppearance={txt.plateAppearance || 'fill'}
                                />
                                {!txt.isPlateOnly && txt.text && (
                                  <span 
                                    className="relative z-10 block"
                                    style={{
                                      transform: `rotate(${txt.rotate || 0}deg)`,
                                      transformOrigin: 'center center'
                                    }}
                                  >
                                    {txt.text}
                                  </span>
                                )}
                                {txt.isPlateOnly && (
                                  <span className="relative z-10 block text-[9px] text-white/30 font-mono pointer-events-none select-none uppercase tracking-wider">
                                    {txt.bgStyle === 'custom' ? '[PNG Плашка]' : '[Плашка]'}
                                  </span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      }
                      onTitleChange={(newTitle: string) => {
                        if (videoSEO) {
                          setVideoSEO({ ...videoSEO, title: newTitle });
                        }
                      }}
                      onOptimizeTitle={async (currentTitle: string) => {
                        const optimized = await optimizeTitle(currentTitle);
                        return optimized;
                      }}
                      onApplyLayoutTemplate={handleApplyLayoutTemplate}
                      activeLayoutTemplate={activeLayoutTemplate}
                      bgDim={bgDim}
                      onBgDimChange={setBgDim}
                      fontStyle={fontStyle}
                      onFontStyleChange={setFontStyle}
                      onBorderColorChange={setPreviewBorderColor}
                      onChannelColorChange={setPreviewChannelColor}
                      customTemplates={customTemplates}
                      onSaveCustomTemplate={handleSaveCustomTemplateInSEO}
                      onApplyCustomTemplate={handleApplyCustomTemplateInSEO}
                      onDeleteCustomTemplate={(id) => {
                        const updated = customTemplates.filter(t => t.id !== id);
                        setCustomTemplates(updated);
                        try {
                          localStorage.setItem('yt_card_custom_templates', JSON.stringify(updated));
                        } catch (err) {
                          logger.error(err);
                        }
                      }}
                    />
                  </div>

                  {/* Quick Layout Templates Bar */}
                  <div className="w-full flex flex-col gap-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <LayoutTemplate size={12} className="text-amber-400" />
                        Быстрые макеты расположения
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                      {[
                        { id: 'left', label: 'Слева', icon: '⬅️' },
                        { id: 'center', label: 'Центр', icon: '🎯' },
                        { id: 'right', label: 'Справа', icon: '➡️' },
                        { id: 'top', label: 'Сверху', icon: '⬆️' },
                        { id: 'bottom', label: 'Снизу', icon: '⬇️' },
                        { id: 'diagonal', label: 'Диагональ', icon: '🔀' },
                        { id: 'corners', label: 'Углы', icon: '🔲' },
                      ].map((tmpl, tIdx) => (
                        <button
                          key={`seo-tmpl-${tmpl.id}-${tIdx}`}
                          onClick={() => handleApplyLayoutTemplate(tmpl.id)}
                          className={`px-1 py-1.5 text-[10px] rounded-lg border font-medium flex flex-col items-center gap-0.5 transition-all ${
                            activeLayoutTemplate === tmpl.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                          }`}
                          title={`Применить макет: ${tmpl.label}`}
                        >
                          <span className="text-xs">{tmpl.icon}</span>
                          <span className="truncate max-w-full text-[9px]">{tmpl.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compact CTR Evaluation Bar */}
                  <div className="w-full">
                    {!ctrPrediction ? (
                      <button 
                        onClick={handleEvaluateCTR}
                        disabled={isEvaluatingCTR}
                        className="w-full bg-neutral-950 hover:bg-black border border-neutral-800 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isEvaluatingCTR ? <Loader2 size={13} className="animate-spin text-accent" /> : <BarChart3 size={13} className="text-accent" />}
                        {isEvaluatingCTR ? "Оценка CTR..." : "Оценить CTR (Gemini AI)"}
                      </button>
                    ) : (
                      <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg animate-fade-in relative space-y-1.5">
                        <button 
                          onClick={() => setCtrPrediction(null)}
                          className="absolute top-2 right-2 text-neutral-500 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-accent/20 text-accent rounded">
                            <BarChart3 size={14} />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-neutral-400 uppercase">Прогноз CTR</span>
                            <h4 className="text-base font-black text-white leading-none">{ctrPrediction.ctr}</h4>
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-relaxed border-t border-neutral-800 pt-1.5">
                          {ctrPrediction.reasoning}
                        </p>
                        <button 
                          onClick={handleEvaluateCTR}
                          disabled={isEvaluatingCTR}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-1 px-2 rounded text-[9px] font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          {isEvaluatingCTR ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                          Переоценить CTR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* A/B Thumbnail Variants */}
                  {Array.isArray(thumbnailVariants) && thumbnailVariants.length > 0 && (
                    <div className="w-full space-y-2 pt-2 border-t border-neutral-800">
                      <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                        <Split size={9} className="text-accent" /> A/B варианты ({thumbnailVariants.length}):
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {thumbnailVariants.map((url: string, idx: number) => (
                          <div key={`thumb-ab-var-${idx}-${url.slice(0, 15)}`} className="relative group aspect-video rounded border overflow-hidden bg-neutral-950 cursor-pointer">
                            <img 
                              src={url} 
                              alt={`Variant ${idx + 1}`} 
                              onClick={() => setPreviewThumbnail(url)}
                              className={`w-full h-full object-cover transition-all ${
                                previewThumbnail === url ? 'ring-2 ring-accent' : 'opacity-80 hover:opacity-100'
                              }`} 
                            />
                            <button 
                              onClick={() => downloadImage(url, `thumbnail_variant_${idx+1}.png`)}
                              className="absolute top-1 left-1 p-1 bg-black/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Скачать"
                            >
                              <Download size={10} />
                            </button>
                            <button
                              onClick={() => {
                                const newVariants = thumbnailVariants.filter((_: any, i: number) => i !== idx);
                                setThumbnailVariants(newVariants);
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Удалить"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Compact Tabbed Editor Panel */}
                <div className="lg:col-span-7 bg-neutral-950/80 rounded-xl border border-neutral-800 p-4 space-y-3">
                  
                  {/* Editor Tabs Header */}
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                      <button
                        onClick={() => setPreviewEditorTab('layers')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                          previewEditorTab === 'layers'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Layers size={13} />
                        <span>Слои и Текст ({thumbnailTexts.length})</span>
                      </button>
                      <button
                        onClick={() => setPreviewEditorTab('plate')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                          previewEditorTab === 'plate'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Sparkles size={13} />
                        <span>Плашка</span>
                      </button>
                      <button
                        onClick={() => setPreviewEditorTab('style')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                          previewEditorTab === 'style'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Palette size={13} />
                        <span>Цвета и Стили</span>
                      </button>
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleAddThumbnailText}
                        className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-[11px] font-bold border border-accent/30 flex items-center gap-1 transition-all"
                      >
                        <Plus size={11} /> +Текст
                      </button>
                      <button
                        onClick={() => handleAddStandalonePlate('brush')}
                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-all"
                        title="Добавить отдельную подложку"
                      >
                        <Plus size={11} /> +Плашка
                      </button>
                      {thumbnailTexts.length > 0 && (
                        <button
                          onClick={() => {
                            setThumbnailTexts([]);
                            setSelectedTextIndex(null);
                          }}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[11px] font-bold transition-all"
                          title="Очистить все слои"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TAB 1: LAYERS & TEXT */}
                  {previewEditorTab === 'layers' && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Elegant Vertical Layers Stack Panel */}
                      {thumbnailTexts.length > 0 ? (
                        <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                            Список слоев (Сверху вниз)
                          </label>
                          {/* List them in reverse order (top of stack first) to match visual ordering of layers */}
                          {[...thumbnailTexts].reverse().map((layer, revIdx) => {
                            const i = thumbnailTexts.length - 1 - revIdx;
                            const active = selectedTextIndex === i;
                            const label = layer.isPlateOnly
                              ? `🖌️ Плашка (Слой #${i + 1})`
                              : `T: ${layer.text ? layer.text.slice(0, 30) + (layer.text.length > 30 ? '…' : '') : `Текст ${i + 1}`}`;
                            
                            return (
                              <div 
                                key={`thumb-layer-item-${i}`}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                  active
                                    ? 'bg-accent/15 border-accent text-white shadow-sm font-semibold'
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedTextIndex(i)}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                >
                                  <span className="text-[10px] font-mono text-neutral-600 w-3 text-right">#{i + 1}</span>
                                  <span className="truncate pr-2">{label}</span>
                                </button>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Order Buttons */}
                                  <button
                                    type="button"
                                    onClick={() => moveLayer(i, 'up')}
                                    disabled={i === thumbnailTexts.length - 1}
                                    className="p-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-neutral-300 rounded border border-neutral-800 transition-colors"
                                    title="Переместить выше (Вперед)"
                                  >
                                    <ChevronUp size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveLayer(i, 'down')}
                                    disabled={i === 0}
                                    className="p-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-neutral-300 rounded border border-neutral-800 transition-colors"
                                    title="Переместить ниже (Назад)"
                                  >
                                    <ChevronDown size={11} />
                                  </button>
                                  
                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveThumbnailText(i)}
                                    className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition-colors ml-1"
                                    title="Удалить слой"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-neutral-900/50 rounded-lg border border-dashed border-neutral-800">
                          <p className="text-xs text-neutral-400">Нажмите <strong className="text-accent">+Текст</strong> или <strong className="text-emerald-400">+Плашка</strong>, чтобы добавить слои на превью.</p>
                        </div>
                      )}

                      {/* Selected Layer Properties */}
                      {selectedTextIndex !== null && thumbnailTexts[selectedTextIndex] && (
                        <div className="space-y-3 pt-2 border-t border-neutral-800">
                          {!thumbnailTexts[selectedTextIndex].isPlateOnly && (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Текст надписи</label>
                                <input
                                  type="text"
                                  value={thumbnailTexts[selectedTextIndex].text}
                                  onChange={(e) => {
                                    const updated = [...thumbnailTexts];
                                    updated[selectedTextIndex].text = e.target.value;
                                    setThumbnailTexts(updated);
                                  }}
                                  className="w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                                  placeholder="Введите text надписи..."
                                />
                              </div>
                              
                              {thumbnailTexts[selectedTextIndex].bgStyle && thumbnailTexts[selectedTextIndex].bgStyle !== 'none' && (
                                <button
                                  type="button"
                                  onClick={handleSeparatePlate}
                                  className="w-full py-1.5 px-3 bg-accent/20 hover:bg-accent/30 text-accent hover:text-white rounded-lg text-xs font-bold border border-accent/30 flex items-center justify-center gap-1.5 transition-all"
                                  title="Переносит плашку текущего слоя на самостоятельный фоновый слой"
                                >
                                  <span>🔓 Разделить: Текст и плашка на свои слои</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Position & Size Controls Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                <span>Позиция X</span>
                                <span className="text-accent">{thumbnailTexts[selectedTextIndex].x}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={parseInt(thumbnailTexts[selectedTextIndex].x) || 50}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].x = `${e.target.value}%`;
                                  setThumbnailTexts(updated);
                                }}
                                className="w-full accent-accent h-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                <span>Позиция Y</span>
                                <span className="text-accent">{thumbnailTexts[selectedTextIndex].y}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={parseInt(thumbnailTexts[selectedTextIndex].y) || 40}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].y = `${e.target.value}%`;
                                  setThumbnailTexts(updated);
                                }}
                                className="w-full accent-accent h-1.5"
                              />
                            </div>

                            {!thumbnailTexts[selectedTextIndex].isPlateOnly && (
                              <>
                                <div>
                                  <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                    <span>Размер шрифта</span>
                                    <span className="text-accent">{thumbnailTexts[selectedTextIndex].fontSize}px</span>
                                  </label>
                                  <input
                                    type="range"
                                    min="10"
                                    max="150"
                                    value={thumbnailTexts[selectedTextIndex].fontSize}
                                    onChange={(e) => {
                                      const updated = [...thumbnailTexts];
                                      updated[selectedTextIndex].fontSize = Number(e.target.value);
                                      setThumbnailTexts(updated);
                                    }}
                                    className="w-full accent-accent h-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                    <span>Поворот текста</span>
                                    <span className="text-accent">{thumbnailTexts[selectedTextIndex].rotate || 0}°</span>
                                  </label>
                                  <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    value={thumbnailTexts[selectedTextIndex].rotate || 0}
                                    onChange={(e) => {
                                      const updated = [...thumbnailTexts];
                                      updated[selectedTextIndex].rotate = Number(e.target.value);
                                      setThumbnailTexts(updated);
                                    }}
                                    className="w-full accent-accent h-1.5"
                                  />
                                </div>
                              </>
                            )}

                            <div>
                              <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                <span>Прозрачность</span>
                                <span className="text-accent">{Math.round((thumbnailTexts[selectedTextIndex].opacity ?? 1) * 100)}%</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={thumbnailTexts[selectedTextIndex].opacity ?? 1}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].opacity = Number(e.target.value);
                                  setThumbnailTexts(updated);
                                }}
                                className="w-full accent-accent h-1.5"
                              />
                            </div>

                            {!thumbnailTexts[selectedTextIndex].isPlateOnly && (
                              <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Цвет текста</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="color"
                                    value={thumbnailTexts[selectedTextIndex].color}
                                    onChange={(e) => {
                                      const updated = [...thumbnailTexts];
                                      updated[selectedTextIndex].color = e.target.value;
                                      setThumbnailTexts(updated);
                                    }}
                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                                  />
                                  <span className="text-xs text-neutral-300 font-mono">{thumbnailTexts[selectedTextIndex].color}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Font Selector & Brand Colors */}
                          {!thumbnailTexts[selectedTextIndex].isPlateOnly && (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Шрифт</label>
                                <select
                                  value={thumbnailTexts[selectedTextIndex].fontFamily || "'Bebas Neue', sans-serif"}
                                  onChange={(e) => {
                                    const updated = [...thumbnailTexts];
                                    updated[selectedTextIndex].fontFamily = e.target.value;
                                    setThumbnailTexts(updated);
                                  }}
                                  className="w-full mt-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                                  style={{ fontFamily: thumbnailTexts[selectedTextIndex].fontFamily }}
                                >
                                  <option value="system-ui" style={{ fontFamily: "system-ui" }}>System Default</option>
                                  <option value="Impact, sans-serif" style={{ fontFamily: "Impact, sans-serif" }}>Impact (Classic)</option>
                                  <option value="'Bebas Neue', sans-serif" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Bebas Neue</option>
                                  <option value="'Montserrat', sans-serif" style={{ fontFamily: "'Montserrat', sans-serif" }}>Montserrat</option>
                                  <option value="'Oswald', sans-serif" style={{ fontFamily: "'Oswald', sans-serif" }}>Oswald</option>
                                  <option value="'Roboto Condensed', sans-serif" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>Roboto Condensed</option>
                                  <option value="'Russo One', sans-serif" style={{ fontFamily: "'Russo One', sans-serif" }}>Russo One</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Палитра</label>
                                <div className="flex items-center gap-1 mt-1">
                                  {['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6', '#22c55e'].map((c, idx) => (
                                    <button
                                      key={`clr1-${c}-${idx}`}
                                      type="button"
                                      onClick={() => {
                                        const updated = [...thumbnailTexts];
                                        updated[selectedTextIndex].color = c;
                                        setThumbnailTexts(updated);
                                      }}
                                      className="w-4 h-4 rounded-full border border-neutral-700 hover:scale-110 transition-transform"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Order & Remove Controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveLayer(selectedTextIndex, 'down')}
                                disabled={selectedTextIndex === 0}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 rounded border border-neutral-800 text-[10px] font-bold"
                              >
                                ↓ Назад
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLayer(selectedTextIndex, 'up')}
                                disabled={selectedTextIndex === thumbnailTexts.length - 1}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 rounded border border-neutral-800 text-[10px] font-bold"
                              >
                                ↑ Вперед
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveThumbnailText(selectedTextIndex)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] font-bold border border-red-500/20 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={11} /> Удалить слой
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PLATE & TEXTURE */}
                  {previewEditorTab === 'plate' && (
                    <div className="space-y-3 animate-fade-in">
                      {selectedTextIndex !== null && thumbnailTexts[selectedTextIndex] ? (
                        <div className="space-y-3">
                          {/* Separate layers warning/button */}
                          {!thumbnailTexts[selectedTextIndex].isPlateOnly && thumbnailTexts[selectedTextIndex].bgStyle && thumbnailTexts[selectedTextIndex].bgStyle !== 'none' && (
                            <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2.5">
                              <div className="text-left">
                                <p className="text-xs font-bold text-white flex items-center gap-1">
                                  <span>🔓 Раздельные слои (Рекомендуется)</span>
                                </p>
                                <p className="text-[10px] text-neutral-400 mt-0.5">Разделите текст и подложку на два независимых слоя, чтобы свободно менять их порядок и поместить плашку строго ПОД текст.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSeparatePlate}
                                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0"
                              >
                                Разделить слои
                              </button>
                            </div>
                          )}

                          {/* Внешний вид плашки */}
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                              Стиль отображения плашки
                            </label>
                            <select
                              value={thumbnailTexts[selectedTextIndex].plateAppearance || 'fill'}
                              onChange={(e) => {
                                const updated = [...thumbnailTexts];
                                updated[selectedTextIndex].plateAppearance = e.target.value;
                                setThumbnailTexts(updated);
                              }}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                            >
                              <option value="fill">⬛ Подложка (Заливка цветом)</option>
                              <option value="outline">🔳 Рамка (Контурная линия)</option>
                              <option value="shadow">✨ Тень (Мягкое свечение)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Стиль текстурной подложки</label>
                            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                              {[
                                ...(!thumbnailTexts[selectedTextIndex].isPlateOnly ? [{ id: 'none', label: 'Без плашки', icon: '∅' }] : []),
                                { id: 'brush', label: 'Широкий мазок', icon: '🖌️' },
                                { id: 'dry_brush', label: 'Сухая кисть', icon: '🖊️' },
                                { id: 'brush_bristle', label: 'Волокна кисти', icon: '📜' },
                                { id: 'rough', label: 'Грубый разрыв', icon: '✂️' },
                                { id: 'grunge', label: 'Гранж спрей', icon: '💥' },
                                { id: 'tape', label: 'Лента скотч', icon: '🩹' },
                                { id: 'skew', label: 'Наклонная', icon: '📐' },
                                { id: 'rectangle', label: 'Прямоугольник', icon: '🔲' },
                                { id: 'pill', label: 'Овал', icon: '💊' },
                                ...(thumbnailTexts[selectedTextIndex]?.customTexture ? [{ id: 'custom', label: 'Своя PNG', icon: '🖼️' }] : [])
                              ].map((preset, pIdx) => {
                                const active = (thumbnailTexts[selectedTextIndex].bgStyle || 'none') === preset.id;
                                return (
                                  <button
                                    key={`seo-preset-${preset.id}-${pIdx}`}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...thumbnailTexts];
                                      updated[selectedTextIndex].bgStyle = preset.id;
                                      if (!updated[selectedTextIndex].bgColor || updated[selectedTextIndex].bgColor === 'transparent') {
                                        updated[selectedTextIndex].bgColor = '#000000';
                                      }
                                      setThumbnailTexts(updated);
                                    }}
                                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                      active 
                                        ? 'border-accent bg-accent/20 text-white font-bold shadow-sm' 
                                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                                    }`}
                                  >
                                    <span className="text-sm">{preset.icon}</span>
                                    <span className="text-[10px] truncate w-full text-center mt-0.5">{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Custom Texture Upload */}
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCustomTextureUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              title="Загрузить свою текстуру (PNG)"
                            />
                            <button
                              type="button"
                              className="w-full py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-accent hover:text-white border border-neutral-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Upload size={13} />
                              <span>Загрузить свою PNG текстуру</span>
                            </button>
                          </div>

                          {/* Color & Controls */}
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Цвет плашки</label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="color"
                                value={thumbnailTexts[selectedTextIndex].bgColor || '#000000'}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].bgColor = e.target.value;
                                  setThumbnailTexts(updated);
                                }}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                              />
                              <div className="flex items-center gap-1">
                                {['#000000', '#dc2626', '#eab308', '#2563eb', '#16a34a', '#ffffff'].map((color, idx) => (
                                  <button
                                    key={`clr2-${color}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...thumbnailTexts];
                                      updated[selectedTextIndex].bgColor = color;
                                      setThumbnailTexts(updated);
                                    }}
                                    className="w-4 h-4 rounded-full border border-neutral-700 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Plate Sliders */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[10px] font-bold text-amber-400 uppercase flex justify-between">
                                <span>Поворот плашки</span>
                                <span>{thumbnailTexts[selectedTextIndex].bgRotate || 0}°</span>
                              </label>
                              <input
                                type="range"
                                min="-180"
                                max="180"
                                value={thumbnailTexts[selectedTextIndex].bgRotate || 0}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].bgRotate = Number(e.target.value);
                                  setThumbnailTexts(updated);
                                }}
                                className="w-full accent-amber-500 h-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-neutral-400 uppercase flex justify-between">
                                <span>Размер мазка</span>
                                <span>{Math.round((thumbnailTexts[selectedTextIndex].bgScale ?? 1) * 100)}%</span>
                              </label>
                              <input
                                type="range"
                                min="0.2"
                                max="8.0"
                                step="0.05"
                                value={thumbnailTexts[selectedTextIndex].bgScale ?? 1}
                                onChange={(e) => {
                                  const updated = [...thumbnailTexts];
                                  updated[selectedTextIndex].bgScale = Number(e.target.value);
                                  setThumbnailTexts(updated);
                                }}
                                className="w-full accent-accent h-1.5"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-neutral-900/50 rounded-lg border border-dashed border-neutral-800">
                          <p className="text-xs text-neutral-400">Выберите текстовый слой или плашку в меню «Слои и Текст» для изменения подложки.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: STYLE & REFERENCE */}
                  {previewEditorTab === 'style' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Frame & Channel Color Pickers */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                            <Palette size={11} className="text-accent" /> Цвет рамки
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={previewBorderColor} 
                              onChange={(e) => setPreviewBorderColor(e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                            />
                            <span className="text-xs font-mono text-neutral-300 uppercase">{previewBorderColor}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                            <Palette size={11} className="text-accent" /> Цвет названия
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={previewChannelColor} 
                              onChange={(e) => setPreviewChannelColor(e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                            />
                            <span className="text-xs font-mono text-neutral-300 uppercase">{previewChannelColor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reference Style Uploader */}
                      <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase flex items-center gap-1">
                            <Sparkles size={11} className="text-accent" /> Референс стиля (ИИ)
                          </label>
                          {thumbnailReference && (
                            <button 
                              onClick={() => { setThumbnailReference(null); setThumbnailReferenceStyle(null); }}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Удалить
                            </button>
                          )}
                        </div>

                        {!thumbnailReference ? (
                          <div className="relative border border-dashed border-neutral-800 hover:border-neutral-700 rounded-lg p-2.5 text-center transition-colors">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleReferenceUpload}
                              disabled={isAnalyzingReferenceStyle}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            />
                            <div className="flex items-center justify-center gap-2 text-neutral-400">
                              {isAnalyzingReferenceStyle ? (
                                <Loader2 size={13} className="animate-spin text-accent" />
                              ) : (
                                <Upload size={13} className="text-neutral-500" />
                              )}
                              <span className="text-xs">
                                {isAnalyzingReferenceStyle ? "Анализ стиля..." : "Загрузить пример дизайна превью"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 p-2 bg-neutral-950 rounded border border-neutral-800">
                            <img src={thumbnailReference} alt="Reference" className="w-14 h-9 object-cover rounded border border-neutral-700" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-neutral-200 font-medium truncate">Референс загружен</p>
                              <p className="text-[10px] text-neutral-500">Стиль будет учитываться при генерации ИИ</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CTR Tips */}
                      <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/80 space-y-1.5">
                        <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Советы по кликабельности</h5>
                        <ul className="space-y-1 text-xs text-neutral-400">
                          <li className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                            <span>Крупные лица и ярко выраженные эмоции повышают CTR на 30%+.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                            <span>Пишите 2-4 коротких, контрастных слова, дополняющих заголовок.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </div>
    </div>
  );
};
