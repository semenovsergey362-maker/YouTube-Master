import { logger } from "../config/logger";
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const sanitizeDocumentForHtml2Canvas = (clonedDoc: Document) => {
  try {
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((style) => {
      if (style.textContent && style.textContent.includes('oklch')) {
        style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#10b981');
      }
    });

    const elementsWithStyle = clonedDoc.querySelectorAll('[style*="oklch"]');
    elementsWithStyle.forEach((el) => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        el.setAttribute('style', styleAttr.replace(/oklch\([^)]+\)/g, '#10b981'));
      }
    });
  } catch (e) {
    logger.warn('Error sanitizing cloned document for PDF generation:', e);
  }
};

export const getFullScriptText = (blocks: Record<number, any>) => {
  if (!blocks) return '';
  return Object.keys(blocks)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => blocks[Number(k)]?.text || '')
    .filter(Boolean)
    .join('\n\n');
};

export const exportToPDF = (content: string, filename: string, title: string = 'Export') => {
  const sanitizedFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'export';
  
  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.color = '#000';
  element.style.backgroundColor = '#fff';
  element.style.fontFamily = 'Arial, sans-serif';
  
  const h1 = document.createElement('h1');
  h1.innerText = title;
  h1.style.marginBottom = '20px';
  h1.style.borderBottom = '1px solid #eee';
  h1.style.paddingBottom = '10px';
  element.appendChild(h1);
  
  const p = document.createElement('div');
  p.style.whiteSpace = 'pre-wrap';
  p.style.lineHeight = '1.6';
  p.innerText = content;
  element.appendChild(p);
  
  const opt = {
    margin: 10,
    filename: `${sanitizedFilename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      onclone: (clonedDoc: Document) => {
        sanitizeDocumentForHtml2Canvas(clonedDoc);
      }
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };
  
  html2pdf().set(opt).from(element).save();
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  
  try {
    // Try the modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    logger.warn('Modern clipboard copy failed, falling back to execCommand:', err);
  }

  // Fallback to document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return !!successful;
  } catch (err) {
    logger.error('Fallback clipboard copy failed:', err);
    return false;
  }
};

export const exportToFile = (content: string, filename: string, extension: string) => {
  const sanitizedFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'export';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedFilename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToTxt = (content: string, filename: string) => {
  exportToFile(content, filename, 'txt');
};

export const exportToSrt = (content: string, filename: string) => {
  exportToFile(content, filename, 'srt');
};

export const exportToMarkdown = (content: string, filename: string) => {
  exportToFile(content, filename, 'md');
};

export const exportToZip = async (files: { name: string; content: string | Blob }[], zipName: string) => {
  const zip = new JSZip();
  const toastId = toast.loading('Создание архива...');
  
  try {
    for (const file of files) {
      if (typeof file.content === 'string' && file.content.startsWith('http')) {
        // Try fetching normally, fallback to server download proxy if CORS / network failure occurs
        try {
          let response = await fetch(file.content);
          if (!response.ok) {
            // Force proxy fallback
            throw new Error(`Direct fetch status: ${response.status}`);
          }
          const blob = await response.blob();
          zip.file(file.name, blob);
        } catch (e) {
          try {
            logger.info('Direct fetch failed, trying proxy for:', file.name);
            const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(file.content as string)}&filename=${encodeURIComponent(file.name)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
            const blob = await response.blob();
            zip.file(file.name, blob);
          } catch (proxyError) {
            logger.error('Failed to fetch file for zip even with proxy:', file.name, proxyError);
            zip.file(`${file.name}.txt`, `Failed to download original. URL: ${file.content}`);
          }
        }
      } else {
        zip.file(file.name, file.content);
      }
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${zipName}.zip`);
    toast.success('Архив успешно создан', { id: toastId });
  } catch (error) {
    logger.error('ZIP export failed:', error);
    toast.error('Ошибка при создании архива', { id: toastId });
  }
};

export const downloadImage = async (url: string, filename: string) => {
  if (!url) return;
  const toastId = toast.loading('Подготовка к скачиванию...');
  try {
    let downloadUrl = url;
    if (url.startsWith('http')) {
      downloadUrl = `/api/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    } else if (url.startsWith('data:image')) {
      const response = await fetch(url);
      const blob = await response.blob();
      downloadUrl = window.URL.createObjectURL(blob);
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      if (downloadUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    }, 150);

    toast.success('Файл успешно скачан', { id: toastId });
  } catch (error) {
    logger.error('Download failed:', error);
    try {
      window.open(url, '_blank');
      toast.info('Изображение открыто в новой вкладке для сохранения вручную', { id: toastId });
    } catch (openErr) {
      toast.error('Ошибка при скачивании файла', { id: toastId });
    }
  }
};

export const exportScriptAndPlanToPDF = (
  scriptTopic: string,
  channelName: string,
  generatedBlocks: any[],
  logoUrl?: string
) => {
  const element = document.createElement('div');
  element.style.padding = '35px';
  element.style.color = '#1f2937';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.maxWidth = '800px';
  element.style.margin = '0 auto';

  // Beautiful header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.borderBottom = '3px solid #10b981';
  header.style.paddingBottom = '20px';
  header.style.marginBottom = '30px';

  const headerLeft = document.createElement('div');
  const channelTitle = document.createElement('div');
  channelTitle.innerText = channelName.toUpperCase();
  channelTitle.style.fontSize = '12px';
  channelTitle.style.fontWeight = 'bold';
  channelTitle.style.color = '#10b981';
  channelTitle.style.letterSpacing = '1.5px';
  channelTitle.style.marginBottom = '4px';

  const docTitle = document.createElement('h1');
  docTitle.innerText = 'СЦЕНАРИЙ И ТЕХНИЧЕСКИЙ ПЛАН';
  docTitle.style.fontSize = '24px';
  docTitle.style.fontWeight = '800';
  docTitle.style.color = '#111827';
  docTitle.style.margin = '0';
  docTitle.style.letterSpacing = '-0.5px';

  const topicSubtitle = document.createElement('div');
  topicSubtitle.innerText = `Тема: ${scriptTopic}`;
  topicSubtitle.style.fontSize = '14px';
  topicSubtitle.style.color = '#4b5563';
  topicSubtitle.style.marginTop = '6px';
  topicSubtitle.style.fontWeight = '500';

  headerLeft.appendChild(channelTitle);
  headerLeft.appendChild(docTitle);
  headerLeft.appendChild(topicSubtitle);

  const headerRight = document.createElement('div');
  if (logoUrl) {
    const img = document.createElement('img');
    img.src = logoUrl;
    img.crossOrigin = 'anonymous';
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.borderRadius = '50%';
    img.style.objectFit = 'cover';
    img.style.border = '2px solid #10b981';
    headerRight.appendChild(img);
  } else {
    const logoPlaceholder = document.createElement('div');
    logoPlaceholder.style.width = '60px';
    logoPlaceholder.style.height = '60px';
    logoPlaceholder.style.borderRadius = '50%';
    logoPlaceholder.style.backgroundColor = '#10b981';
    logoPlaceholder.style.display = 'flex';
    logoPlaceholder.style.alignItems = 'center';
    logoPlaceholder.style.justifyContent = 'center';
    logoPlaceholder.style.color = '#ffffff';
    logoPlaceholder.style.fontWeight = '800';
    logoPlaceholder.style.fontSize = '20px';
    logoPlaceholder.innerText = channelName.substring(0, 2).toUpperCase();
    headerRight.appendChild(logoPlaceholder);
  }

  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  element.appendChild(header);

  // Metadata container
  const metaContainer = document.createElement('div');
  metaContainer.style.display = 'grid';
  metaContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
  metaContainer.style.gap = '15px';
  metaContainer.style.marginBottom = '35px';
  metaContainer.style.backgroundColor = '#f9fafb';
  metaContainer.style.padding = '15px';
  metaContainer.style.borderRadius = '12px';
  metaContainer.style.border = '1px solid #e5e7eb';

  const createMetaBox = (label: string, value: string) => {
    const box = document.createElement('div');
    const lbl = document.createElement('div');
    lbl.innerText = label.toUpperCase();
    lbl.style.fontSize = '9px';
    lbl.style.fontWeight = 'bold';
    lbl.style.color = '#9ca3af';
    lbl.style.letterSpacing = '1px';
    lbl.style.marginBottom = '4px';

    const val = document.createElement('div');
    val.innerText = value;
    val.style.fontSize = '12px';
    val.style.fontWeight = 'bold';
    val.style.color = '#374151';

    box.appendChild(lbl);
    box.appendChild(val);
    return box;
  };

  metaContainer.appendChild(createMetaBox('Канал', channelName));
  metaContainer.appendChild(createMetaBox('Формат', 'YouTube Сценарий'));
  metaContainer.appendChild(createMetaBox('Дата экспорта', new Date().toLocaleDateString('ru-RU')));
  element.appendChild(metaContainer);

  // Blocks
  generatedBlocks.forEach((block, index) => {
    const blockSection = document.createElement('div');
    blockSection.style.marginBottom = '40px';
    blockSection.style.pageBreakInside = 'avoid';

    const blockHeader = document.createElement('div');
    blockHeader.style.display = 'flex';
    blockHeader.style.alignItems = 'center';
    blockHeader.style.gap = '10px';
    blockHeader.style.borderBottom = '2px solid #f3f4f6';
    blockHeader.style.paddingBottom = '8px';
    blockHeader.style.marginBottom = '15px';

    const blockNumber = document.createElement('span');
    blockNumber.innerText = `${index + 1}`;
    blockNumber.style.backgroundColor = '#111827';
    blockNumber.style.color = '#ffffff';
    blockNumber.style.borderRadius = '50%';
    blockNumber.style.width = '24px';
    blockNumber.style.height = '24px';
    blockNumber.style.display = 'inline-flex';
    blockNumber.style.alignItems = 'center';
    blockNumber.style.justifyContent = 'center';
    blockNumber.style.fontSize = '12px';
    blockNumber.style.fontWeight = 'bold';

    const blockTitle = document.createElement('h3');
    blockTitle.innerText = `${block.title}`.toUpperCase();
    blockTitle.style.fontSize = '14px';
    blockTitle.style.fontWeight = 'bold';
    blockTitle.style.color = '#111827';
    blockTitle.style.margin = '0';
    blockTitle.style.flex = '1';

    const blockTime = document.createElement('span');
    blockTime.innerText = block.estimatedTime || '';
    blockTime.style.fontFamily = 'monospace';
    blockTime.style.fontSize = '12px';
    blockTime.style.color = '#6b7280';

    blockHeader.appendChild(blockNumber);
    blockHeader.appendChild(blockTitle);
    blockHeader.appendChild(blockTime);
    blockSection.appendChild(blockHeader);

    if (block.text) {
      const blockText = document.createElement('div');
      blockText.style.fontSize = '12px';
      blockText.style.lineHeight = '1.6';
      blockText.style.color = '#374151';
      blockText.style.marginBottom = '20px';
      blockText.style.whiteSpace = 'pre-wrap';
      blockText.innerText = block.text;
      blockSection.appendChild(blockText);
    }

    if (block.scenes && block.scenes.length > 0) {
      const tableTitle = document.createElement('h4');
      tableTitle.innerText = 'ТЕХНИЧЕСКИЙ ПЛАН СЦЕН';
      tableTitle.style.fontSize = '10px';
      tableTitle.style.fontWeight = 'bold';
      tableTitle.style.color = '#059669';
      tableTitle.style.letterSpacing = '1px';
      tableTitle.style.marginBottom = '10px';
      tableTitle.style.marginTop = '15px';
      blockSection.appendChild(tableTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '11px';
      table.style.marginBottom = '15px';
      table.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      table.style.borderRadius = '8px';
      table.style.overflow = 'hidden';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#1f2937';
      headerRow.style.color = '#ffffff';

      const cols = ['Сцена & Время', 'Текст & Озвучка', 'Визуальный ряд & Стоки', 'Звук & Музыка'];
      const widths = ['15%', '35%', '35%', '15%'];

      cols.forEach((colName, idx) => {
        const th = document.createElement('th');
        th.innerText = colName;
        th.style.padding = '8px 12px';
        th.style.textAlign = 'left';
        th.style.fontSize = '10px';
        th.style.fontWeight = 'bold';
        th.style.width = widths[idx];
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      block.scenes.forEach((scene: any, sceneIdx: number) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = sceneIdx % 2 === 0 ? '#ffffff' : '#f9fafb';
        row.style.borderBottom = '1px solid #e5e7eb';

        const td1 = document.createElement('td');
        td1.style.padding = '10px 12px';
        td1.style.verticalAlign = 'top';
        td1.style.fontWeight = 'bold';
        td1.innerHTML = `<span style="color:#10b981">Сцена ${sceneIdx + 1}</span><br/><span style="color:#6b7280; font-size:10px; font-family:monospace">${scene.timeRange || ''}</span>`;
        row.appendChild(td1);

        const td2 = document.createElement('td');
        td2.style.padding = '10px 12px';
        td2.style.verticalAlign = 'top';
        td2.style.lineHeight = '1.4';
        
        let voiceInfo = '';
        if (scene.voiceover) {
          voiceInfo = `<div style="margin-top: 6px; font-size: 9px; color: #4b5563; background: #f3f4f6; padding: 4px 6px; border-radius: 4px; display: inline-block;">
            <b>Голос:</b> ${scene.voiceover.voiceName || ''} | <b>Настроение:</b> ${scene.voiceover.mood || ''}
          </div>`;
        }
        td2.innerHTML = `<div style="color:#374151">${scene.text || ''}</div>${voiceInfo}`;
        row.appendChild(td2);

        const td3 = document.createElement('td');
        td3.style.padding = '10px 12px';
        td3.style.verticalAlign = 'top';
        td3.style.lineHeight = '1.4';
        
        let stockSearch = '';
        if (scene.visuals?.searchQuery) {
          stockSearch = `<div style="margin-top: 6px; font-size: 9px; color: #059669; font-family:monospace; background: #ecfdf5; padding: 4px 6px; border-radius: 4px; display: inline-block; word-break: break-all;">
            <b>Кадр стока:</b> ${scene.visuals?.searchQuery}
          </div>`;
        }
        td3.innerHTML = `<div style="color:#4b5563; font-style:italic">"${getSceneVisualText(scene) || 'Визуальный ряд кадра'}"</div>${stockSearch}`;
        row.appendChild(td3);

        const td4 = document.createElement('td');
        td4.style.padding = '10px 12px';
        td4.style.verticalAlign = 'top';
        td4.style.lineHeight = '1.4';
        td4.style.color = '#4b5563';
        
        let audioHTML = '';
        if (scene.audio) {
          if (scene.audio.soundsAndNoises) {
            audioHTML += `<div style="margin-bottom: 4px;"><b>SFX:</b> ${scene.audio.soundsAndNoises}</div>`;
          }
          if (scene.audio.backgroundMusic) {
            audioHTML += `<div><b>Музыка:</b> ${scene.audio.backgroundMusic}</div>`;
          }
        }
        td4.innerHTML = audioHTML || '<span style="color:#d1d5db">-</span>';
        row.appendChild(td4);

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      blockSection.appendChild(table);
    }

    if (block.intrigue) {
      const intrigueBox = document.createElement('div');
      intrigueBox.style.fontSize = '11px';
      intrigueBox.style.color = '#374151';
      intrigueBox.style.background = '#fffbeb';
      intrigueBox.style.padding = '8px 12px';
      intrigueBox.style.borderRadius = '8px';
      intrigueBox.style.borderLeft = '4px solid #f59e0b';
      intrigueBox.innerHTML = `<b>Интрига блока:</b> ${block.intrigue}`;
      blockSection.appendChild(intrigueBox);
    }

    element.appendChild(blockSection);
  });

  const footer = document.createElement('div');
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.paddingTop = '15px';
  footer.style.marginTop = '40px';
  footer.style.textAlign = 'center';
  footer.style.fontSize = '10px';
  footer.style.color = '#9ca3af';
  footer.innerHTML = `Сгенерировано в <b>YouTube AI Studio</b> — Профессиональный ИИ-ассистент для YouTube-креаторов`;
  element.appendChild(footer);

  const opt = {
    margin: 10,
    filename: `Script_and_Plan_${scriptTopic.replace(/[/\\?%*:|"<>]/g, '-').trim()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      onclone: (clonedDoc: Document) => {
        sanitizeDocumentForHtml2Canvas(clonedDoc);
      }
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  const toastId = toast.loading('Генерация профессионального PDF...');
  html2pdf().set(opt).from(element).save().then(() => {
    toast.success('Экспорт завершен успешно!', { id: toastId });
  }).catch((err: any) => {
    logger.error('PDF generation failed:', err);
    toast.error('Ошибка экспорта в PDF', { id: toastId });
  });
};

export const BLOCK_COLOR_SCHEMES = [
  {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    accentBorder: "border-l-emerald-500",
    dotBg: "bg-emerald-500",
    ring: "ring-emerald-500/30"
  },
  {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    accentBorder: "border-l-blue-500",
    dotBg: "bg-blue-500",
    ring: "ring-blue-500/30"
  },
  {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    accentBorder: "border-l-purple-500",
    dotBg: "bg-purple-500",
    ring: "ring-purple-500/30"
  },
  {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    accentBorder: "border-l-amber-500",
    dotBg: "bg-amber-500",
    ring: "ring-amber-500/30"
  },
  {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    accentBorder: "border-l-rose-500",
    dotBg: "bg-rose-500",
    ring: "ring-rose-500/30"
  },
  {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300",
    accentBorder: "border-l-cyan-500",
    dotBg: "bg-cyan-500",
    ring: "ring-cyan-500/30"
  },
  {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-300",
    accentBorder: "border-l-indigo-500",
    dotBg: "bg-indigo-500",
    ring: "ring-indigo-500/30"
  }
];

export const getBlockColorScheme = (blockIndex: number) => {
  const safeIndex = Math.max(0, blockIndex || 0);
  return BLOCK_COLOR_SCHEMES[safeIndex % BLOCK_COLOR_SCHEMES.length];
};

export const getSceneVisualText = (sc: any): string => {
  if (!sc) return '';

  const isGeneric = (str?: any): boolean => {
    if (!str || typeof str !== 'string') return true;
    const clean = str.trim().toLowerCase().replace(/[.\s\-_,;:]/g, '');
    return [
      '',
      'визуальныйряд',
      'визуальныйрядкадра',
      'визуализация',
      'неуказано',
      'видеоряд',
      'кадр',
      'описаниевизуальногоряда',
      'визуальныйряддляпромо',
      'описаниедлявизуалу'
    ].includes(clean);
  };

  let candidate = '';

  if (typeof sc.visuals === 'string' && !isGeneric(sc.visuals)) {
    candidate = sc.visuals.trim();
  } else if (sc.visuals && typeof sc.visuals === 'object') {
    if (typeof sc.visuals.description === 'string' && !isGeneric(sc.visuals.description)) {
      candidate = sc.visuals.description.trim();
    } else if (typeof sc.visuals.prompt === 'string' && !isGeneric(sc.visuals.prompt)) {
      candidate = sc.visuals.prompt.trim();
    }
  }

  if (!candidate && typeof sc.description === 'string' && !isGeneric(sc.description)) {
    candidate = sc.description.trim();
  }
  if (!candidate && typeof sc.visual === 'string' && !isGeneric(sc.visual)) {
    candidate = sc.visual.trim();
  }
  if (!candidate && typeof sc.visualPrompt === 'string' && !isGeneric(sc.visualPrompt)) {
    candidate = sc.visualPrompt.trim();
  }
  if (!candidate && typeof sc.imagePrompt === 'string' && !isGeneric(sc.imagePrompt)) {
    candidate = sc.imagePrompt.trim();
  }
  if (!candidate && typeof sc.videoIdea === 'string' && !isGeneric(sc.videoIdea)) {
    candidate = sc.videoIdea.trim();
  }
  if (!candidate && typeof sc.details === 'string' && !isGeneric(sc.details)) {
    candidate = sc.details.trim();
  }
  if (!candidate && typeof sc.scene === 'string' && !isGeneric(sc.scene) && sc.scene !== sc.text) {
    candidate = sc.scene.trim();
  }

  if (candidate) return candidate;

  // Fallback: Construct a clear visual idea from scene text / voiceover
  const textContent = (sc.text || sc.voiceover?.text || sc.voiceover || '').toString().trim();
  if (textContent) {
    const cleanText = textContent.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
    if (cleanText) {
      const shotType = sc.shotType || sc.visuals?.shotType || 'Средний план';
      return `${shotType}: Визуализация действий под текст — "${cleanText.slice(0, 75)}${cleanText.length > 75 ? '...' : ''}"`;
    }
  }

  if (sc.blockTitle) {
    return `Динамичный видеоряд для блока "${sc.blockTitle}"`;
  }

  if (sc.sfx) {
    return `Атмосферный кадр: ${sc.sfx}`;
  }

  return 'Динамичный кадр с крупным планом ключевого объекта';
};

export const getUnifiedScriptScenes = (
  scriptBreakdown?: any[],
  generatedBlocks?: Record<number, any>,
  scriptStructure?: any[]
): any[] => {
  if (scriptBreakdown && scriptBreakdown.length > 0) {
    const totalScenes = scriptBreakdown.length;
    
    const orderedIndices = generatedBlocks
      ? Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b)
      : [];
    const structLen = scriptStructure && scriptStructure.length > 0
      ? scriptStructure.length
      : (orderedIndices.length > 0 ? orderedIndices[orderedIndices.length - 1] + 1 : 0);

    const cleanTextForMatching = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/\[[^\]]*\]/g, '') // remove brackets like [шепот]
        .replace(/\([^)]*\)/g, '') // remove parentheses like (1s)
        .replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '') // remove all non-alphanumeric characters
        .toLowerCase();
    };

    // Precalculate block ranges in the cumulative text
    const blockRanges: { start: number; end: number; index: number }[] = [];
    let cumulativeText = "";
    if (generatedBlocks && orderedIndices.length > 0) {
      orderedIndices.forEach((i) => {
        const blockText = generatedBlocks[i]?.text || '';
        const cleanedBlockText = cleanTextForMatching(blockText);
        const start = cumulativeText.length;
        cumulativeText += cleanedBlockText;
        const end = cumulativeText.length;
        blockRanges.push({ start, end, index: i });
      });
    }

    let searchStartOffset = 0;
    
    let cumulativeSec = 0;
    const formatSecToTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return scriptBreakdown.map((sc, idx) => {
      let bIdx = -1;
      let bTitle = '';

      if (structLen > 0) {
        if (generatedBlocks && cumulativeText.length > 0) {
          const cleanedScene = cleanTextForMatching(sc.text || '');
          if (cleanedScene.length > 2) {
            let matchIndex = cumulativeText.indexOf(cleanedScene, searchStartOffset);
            if (matchIndex === -1) {
              matchIndex = cumulativeText.indexOf(cleanedScene);
            }
            if (matchIndex === -1 && cleanedScene.length > 15) {
              const prefix = cleanedScene.slice(0, 15);
              matchIndex = cumulativeText.indexOf(prefix, searchStartOffset);
              if (matchIndex === -1) {
                matchIndex = cumulativeText.indexOf(prefix);
              }
            }

            if (matchIndex !== -1) {
              const matchedRange = blockRanges.find(r => matchIndex >= r.start && matchIndex < r.end) 
                || blockRanges.find(r => matchIndex <= r.end);
              if (matchedRange) {
                bIdx = matchedRange.index;
                searchStartOffset = Math.max(searchStartOffset, matchIndex + Math.min(cleanedScene.length, 10));
              }
            }
          }
        }
        
        if (bIdx < 0) {
          bIdx = Math.min(Math.floor((idx / totalScenes) * structLen), structLen - 1);
        }
      }

      if (!bTitle && bIdx >= 0 && scriptStructure && scriptStructure[bIdx]) {
        bTitle = scriptStructure[bIdx].title;
      }
      if (!bTitle && bIdx >= 0) {
        bTitle = `Блок ${bIdx + 1}`;
      }

      const dur = Math.min(10, Math.max(1, Number(sc.duration) || 5));
      const startSec = cumulativeSec;
      const endSec = cumulativeSec + dur;
      cumulativeSec = endSec;

      const visText = getSceneVisualText(sc) || 'Визуальный ряд кадра';
      const searchQuery = (typeof sc.visuals === 'object' && sc.visuals?.searchQuery) || sc.searchQuery || 'cinematic background';

      return {
        ...sc,
        id: `sc-break-${bIdx}-${idx}`,
        description: visText,
        visual: visText,
        visuals: {
          description: visText,
          searchQuery,
          shotType: sc.shotType || sc.visuals?.shotType || 'Средний план',
          resourceLinks: (typeof sc.visuals === 'object' && sc.visuals?.resourceLinks) || []
        },
        duration: dur,
        shotType: sc.shotType || sc.visuals?.shotType || 'Средний план',
        timecode: formatSecToTime(startSec),
        timeRange: `${formatSecToTime(startSec)} - ${formatSecToTime(endSec)}`,
        blockIndex: bIdx >= 0 ? bIdx : 0,
        blockTitle: bTitle || 'Блок 1'
      };
    });
  }

  if (!generatedBlocks || Object.keys(generatedBlocks).length === 0) {
    return [];
  }

  const orderedIndices = Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b);
  const scenesFromBlocks: any[] = [];

  orderedIndices.forEach((i) => {
    const b = generatedBlocks[i];
    const bTitle = scriptStructure?.[i]?.title || b?.title || `Блок ${i + 1}`;
    if (b && Array.isArray(b.scenes) && b.scenes.length > 0) {
      b.scenes.forEach((sc: any, scIdx: number) => {
        const visText = getSceneVisualText(sc) || 'Визуальный ряд кадра';
        const searchQuery = (typeof sc.visuals === 'object' && sc.visuals?.searchQuery) || sc.searchQuery || 'cinematic background';

        scenesFromBlocks.push({
          ...sc,
          id: `sc-blk-${i}-${scIdx}`,
          description: visText,
          visual: visText,
          visuals: {
            description: visText,
            searchQuery,
            shotType: sc.shotType || sc.visuals?.shotType || 'Средний план',
            resourceLinks: (typeof sc.visuals === 'object' && sc.visuals?.resourceLinks) || []
          },
          duration: Math.min(10, Math.max(1, Number(sc.duration) || 5)),
          shotType: sc.shotType || sc.visuals?.shotType || 'Средний план',
          blockIndex: i,
          blockTitle: bTitle,
          blockContext: scriptStructure?.[i]?.context || ''
        });
      });
    }
  });

  if (scenesFromBlocks.length > 0) {
    return scenesFromBlocks;
  }

  return orderedIndices
    .filter(i => generatedBlocks[i] && generatedBlocks[i].text && generatedBlocks[i].text.trim().length > 0)
    .map((i) => {
      const b = generatedBlocks[i];
      const bTitle = scriptStructure?.[i]?.title || b?.title || `Блок ${i + 1}`;
      const visText = b.sfx ? `Атмосфера: ${b.sfx}` : (b.mood ? `Настроение: ${b.mood}` : 'Визуальный ряд кадра');
      return {
        id: `sc-fb-${i}`,
        sceneNumber: i + 1,
        scene: bTitle,
        text: b.text || '',
        description: visText,
        visual: visText,
        visuals: {
          description: visText,
          searchQuery: 'cinematic background',
          shotType: 'Средний план',
          resourceLinks: []
        },
        duration: b.estimatedTime || '00:15',
        sfx: b.sfx || '',
        blockIndex: i,
        blockTitle: bTitle,
        blockContext: scriptStructure?.[i]?.context || ''
      };
    });
};

export interface BlockTimestampItem {
  timeCode: string;
  title: string;
  blockIndex: number;
}

export const generateScriptBlockTimestamps = (
  scriptStructure?: any[],
  generatedBlocks?: Record<number, any> | any[]
): BlockTimestampItem[] => {
  let genBlocksArray: any[] = [];
  if (generatedBlocks) {
    if (Array.isArray(generatedBlocks)) {
      genBlocksArray = generatedBlocks;
    } else {
      const keys = Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b);
      genBlocksArray = keys.map(k => (generatedBlocks as any)[k]);
    }
  }

  const structLength = scriptStructure && scriptStructure.length > 0 ? scriptStructure.length : 0;
  const count = Math.max(structLength, genBlocksArray.length);

  if (count === 0) {
    return [
      { timeCode: "00:00", title: "Введение и завязка", blockIndex: 0 },
      { timeCode: "00:45", title: "Основная часть", blockIndex: 1 },
      { timeCode: "02:15", title: "Заключение и выводы", blockIndex: 2 },
    ];
  }

  const blocksList: { title: string; text?: string; estimatedTime?: string; estimatedChars?: number }[] = [];

  for (let i = 0; i < count; i++) {
    const structItem = scriptStructure?.[i];
    const genItem = genBlocksArray[i] || (typeof generatedBlocks === 'object' && generatedBlocks ? (generatedBlocks as any)[i] : undefined);

    let rawTitle = structItem?.title || genItem?.blockTitle || genItem?.title;
    if (!rawTitle || rawTitle.trim() === "" || /^Блок\s*\d+$/i.test(rawTitle.trim())) {
      if (structItem?.type) {
        rawTitle = structItem.type;
      } else if (structItem?.description) {
        rawTitle = structItem.description.slice(0, 40);
      } else if (genItem?.text) {
        const firstLine = genItem.text.split('\n')[0].replace(/^#+\s*/, '').trim();
        rawTitle = firstLine.slice(0, 45);
      } else {
        rawTitle = `Блок ${i + 1}`;
      }
    }

    const cleanTitle = rawTitle.replace(/^#+\s*/, '').replace(/^"|"$/g, '').trim();

    blocksList.push({
      title: cleanTitle,
      text: genItem?.text || structItem?.description || "",
      estimatedTime: structItem?.estimatedTime || genItem?.estimatedTime,
      estimatedChars: structItem?.estimatedChars,
    });
  }

  let currentSeconds = 0;
  const result: BlockTimestampItem[] = [];

  blocksList.forEach((item, idx) => {
    const hours = Math.floor(currentSeconds / 3600);
    const mins = Math.floor((currentSeconds % 3600) / 60);
    const secs = currentSeconds % 60;

    let timeCode = "";
    if (hours > 0) {
      timeCode = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      timeCode = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    result.push({
      timeCode,
      title: item.title,
      blockIndex: idx
    });

    let durationInSecs = 30;
    if (item.text && item.text.trim().length > 0) {
      const clean = item.text
        .replace(/\[[^\]]+\]/g, "")
        .replace(/\([^)]+\)/g, "")
        .replace(/^[A-Za-zА-Яа-я0-9\s_-]+:\s*/gm, "")
        .replace(/[#*_\`~]/g, "")
        .trim();
      const spokenLength = clean.length > 10 ? clean.length : Math.round(item.text.length * 0.7);
      durationInSecs = Math.max(15, Math.round(spokenLength / 17.5));
    } else if (item.estimatedChars && item.estimatedChars > 0) {
      durationInSecs = Math.max(15, Math.round(item.estimatedChars / 17.5));
    } else if (item.estimatedTime) {
      const text = item.estimatedTime.toLowerCase();
      if (text.includes(':')) {
        const parts = text.split(':').map(p => parseInt(p, 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          durationInSecs = parts[0] * 60 + parts[1];
        }
      } else {
        const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
          durationInSecs = text.includes('мин') ? num * 60 : num;
        }
      }
    }

    currentSeconds += Math.max(10, durationInSecs);
  });

  return result;
};

/**
 * Formats narrator script text to "breathe":
 * - Separates quotes onto distinct lines with proper pauses and solemn tags.
 * - Splits long solid walls of text into rhythmic paragraphs (1-3 sentences).
 * - Structures lists and questions (e.g. "Первый: ... Второй: ...") into bullet lines with "— ".
 * - Cleans up clashing tags (e.g., duplicate ellipsis and pauses, redundant exclamation marks).
 * - Ensures tags [emotion] sit comfortably before their respective phrases.
 */
export function formatBreathingScriptText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText.trim();

  // 1. Normalize spaces and linebreaks
  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // 2. Fix cluttered tags: e.g., "[тепло] (!) всё" -> "[тепло] всё"
  text = text.replace(/\[([^\]]+)\]\s*\(!\)\s*/g, "[$1] ");
  text = text.replace(/\(!\)\s*\[([^\]]+)\]/g, "[$1] ");

  // 3. Fix double pauses or collision between ellipsis and pause: "... (500ms)" -> "... (500ms)" or "(500ms)"
  text = text.replace(/\.{3,}\s*\(([\d]+(?:ms|s))\)/gi, "... ($1)");

  // 4. Ensure space after emotional tags if missing: "[интрига]Текст" -> "[интрига] Текст"
  text = text.replace(/\[([A-Za-zА-Яа-яЁё\s/_-]+)\]([^\s\n])/g, "[$1] $2");

  // 5. Ensure quotes like [торжественно] *«...»* are nicely isolated
  // Replace: ": (500ms) [торжественно] *«" -> ": (600ms)\n\n[торжественно]\n*«"
  text = text.replace(/:\s*(\(\d+\s*(?:ms|s)\))?\s*(\[[^\]]+\])?\s*(\*?«[^»]+»\*?)/g, (_m, pause, tag, quote) => {
    const p = pause ? `${pause.trim()}\n\n` : "\n\n";
    const t = tag ? `${tag.trim()}\n` : "";
    return `:${p ? " " + p : "\n\n"}${t}${quote.trim()}\n\n`;
  });

  // Also standalone quotes without colon preceding them
  text = text.replace(/([.!?])\s*(\[[^\]]+\])?\s*(\*?«[^»]{10,}»\*?)/g, (_m, punct, tag, quote) => {
    const t = tag ? `\n\n${tag.trim()}\n` : "\n\n";
    return `${punct}${t}${quote.trim()}\n\n`;
  });

  // 6. Separate structured question/numbered lists: "Первый: (300ms) ... Второй: (300ms) ... Третий: (300ms) ..."
  text = text.replace(/(?:^|\s)([—–-]\s*)?(Первый|Второй|Третий|Четвертый|Пятый|Во-первых|Во-вторых|В-третьих):\s*/gi, (_m, _dash, word) => {
    const cleanWord = word.charAt(0).toUpperCase() + word.slice(1);
    return `\n— ${cleanWord}: `;
  });

  // 7. Break long monolithic blocks by punctuation + emotional tags or pauses
  // If an emotional tag sits in the middle of a sentence after a period/pause:
  text = text.replace(/([.!?])\s*(\(\d+\s*(?:ms|s)\))?\s*(\[[А-Яа-яA-Za-z\s_-]+\])/g, (_m, punct, pause, tag) => {
    const p = pause ? ` ${pause.trim()}` : "";
    return `${punct}${p}\n\n${tag.trim()} `;
  });

  // 8. Split long paragraphs into 2-3 sentences max
  const lines = text.split("\n");
  const formattedBlocks: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // If it's a list item (starts with —) or a standalone tag or a short line, keep as is
    if (trimmed.startsWith("—") || trimmed.startsWith("*«") || trimmed.startsWith("«") || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      formattedBlocks.push(trimmed);
      continue;
    }

    // Split paragraphs that have more than 3 complete sentences
    const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s*\(\d+\s*(?:ms|s)\))?|\S+$/g);
    if (sentences && sentences.length > 3) {
      let chunk: string[] = [];
      for (let i = 0; i < sentences.length; i++) {
        chunk.push(sentences[i].trim());
        if (chunk.length >= 2 || (i === sentences.length - 1 && chunk.length > 0)) {
          formattedBlocks.push(chunk.join(" "));
          chunk = [];
        }
      }
      if (chunk.length > 0) {
        formattedBlocks.push(chunk.join(" "));
      }
    } else {
      formattedBlocks.push(trimmed);
    }
  }

  // 9. Rejoin with clean double linebreaks, ensuring no more than 2 consecutive newlines
  return formattedBlocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ParsedAppError {
  title: string;
  description: string;
  type: 'rate_limit' | 'quota_exhausted' | 'auth' | 'network' | 'validation' | 'unknown';
  canRetry: boolean;
}

/**
 * Parses arbitrary errors into user-friendly Russian messages with helpful guidance.
 */
export function parseAppError(error: unknown): ParsedAppError {
  const errStr = error instanceof Error ? error.message : String(error || '');
  const errName = error instanceof Error ? error.name : '';

  // 1. Quota Exhausted / Rate Limit
  if (
    errStr.includes('429') ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('quota') ||
    errStr.includes('Quota exceeded') ||
    errStr.includes('rate limit')
  ) {
    return {
      title: 'Превышен лимит запросов ИИ (Gemini)',
      description: 'Исчерпан минутный или суточный лимит запросов к Gemini. Подождите 30–60 секунд или укажите собственный API ключ в Настройках.',
      type: 'rate_limit',
      canRetry: true,
    };
  }

  // 2. Missing or invalid API key / Auth
  if (
    errStr.includes('API key') ||
    errStr.includes('UNAUTHENTICATED') ||
    errStr.includes('401') ||
    errStr.includes('403') ||
    errStr.includes('permission denied')
  ) {
    return {
      title: 'Ошибка авторизации API',
      description: 'Не найден или недействителен ключ Gemini API. Проверьте настройки в верхнем меню.',
      type: 'auth',
      canRetry: false,
    };
  }

  // 3. Network & Connectivity issues
  if (
    errStr.includes('Failed to fetch') ||
    errStr.includes('NetworkError') ||
    errStr.includes('ERR_INTERNET_DISCONNECTED') ||
    errStr.includes('Load failed')
  ) {
    return {
      title: 'Проблема с подключением к сети',
      description: 'Не удалось связаться с сервером. Проверьте интернет-соединение.',
      type: 'network',
      canRetry: true,
    };
  }

  // 4. Server overload (500 / 503)
  if (
    errStr.includes('500') ||
    errStr.includes('503') ||
    errStr.includes('overloaded') ||
    errStr.includes('INTERNAL')
  ) {
    return {
      title: 'Сервис Gemini временно перегружен',
      description: 'Серверы Google испытывают высокую нагрузку. Попробуйте повторить действие через несколько секунд.',
      type: 'rate_limit',
      canRetry: true,
    };
  }

  // 5. Abort / Cancel
  if (errName === 'AbortError' || errStr.includes('aborted') || errStr.includes('cancelled')) {
    return {
      title: 'Запрос отменён',
      description: 'Операция была отменена пользователем.',
      type: 'unknown',
      canRetry: true,
    };
  }

  // Fallback
  return {
    title: 'Ошибка выполнения',
    description: errStr.length > 200 ? `${errStr.substring(0, 200)}...` : (errStr || 'Произошла непредвиденная ошибка при обработке данных.'),
    type: 'unknown',
    canRetry: true,
  };
}

/**
 * Shows an informative, stylish toast notification when an error occurs.
 */
export function handleAppError(error: unknown, fallbackContextTitle?: string): ParsedAppError {
  logger.error(`[AppErrorHandler] ${fallbackContextTitle || 'Operation failed'}:`, error);
  const parsed = parseAppError(error);

  toast.error(fallbackContextTitle ? `${fallbackContextTitle}: ${parsed.title}` : parsed.title, {
    description: parsed.description,
    duration: parsed.type === 'rate_limit' ? 7000 : 5000,
  });

  return parsed;
}

/**
 * Standardized success toast
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3500,
  });
}

/**
 * Standardized info / warning toast
 */
export function showInfoToast(title: string, description?: string) {
  toast.info(title, {
    description,
    duration: 4000,
  });
}

export function showWarningToast(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 5000,
  });
}


