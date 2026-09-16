import html2pdf from 'html2pdf.js';
import { exportToCSV, exportToMarkdown, exportToTxt, copyToClipboard } from './helpers';
import { type ShortsOutlierIdea, type CutShortItem } from '../services/geminiService';

export interface ShortsIdeasExportOptions {
  niche?: string;
  channelName?: string;
  framework?: string;
  includeHooks?: boolean;
  includeWhyItWorks?: boolean;
  includeVisuals?: boolean;
  includeScripts?: boolean;
  includeFramework?: boolean;
}

function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Format 10 outlier ideas to CSV format (Excel & Google Sheets compatible)
 */
export function formatShortsIdeasToCSV(
  ideas: ShortsOutlierIdea[],
  options: ShortsIdeasExportOptions = {}
): string {
  const headers = [
    '№',
    'Название идеи',
    'Хук первых 3 сек',
    'Почему сработает (на основе аутлаеров)',
    'Что в кадре (визуал)',
    'Хронометраж',
    'Триггер эмоций',
    'Статус сценария',
  ];

  if (options.includeScripts) {
    headers.push('Текст сценария');
  }

  const rows = ideas.map((idea, idx) => {
    const row = [
      escapeCsv(idx + 1),
      escapeCsv(idea.title || `Идея #${idx + 1}`),
      escapeCsv(idea.hook || ''),
      escapeCsv(idea.whyItWorks || ''),
      escapeCsv((idea.visualTypes || idea.visualContent || []).join('; ')),
      escapeCsv(idea.estimatedDuration || '30-45 сек'),
      escapeCsv(idea.emotionalTrigger || idea.trigger || ''),
      escapeCsv(idea.isGenerated ? 'Сценарий создан' : 'Идея'),
    ];

    if (options.includeScripts) {
      row.push(escapeCsv(idea.fullScript || ''));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Format 10 outlier ideas to Markdown format
 */
export function formatShortsIdeasToMarkdown(
  ideas: ShortsOutlierIdea[],
  options: ShortsIdeasExportOptions = {}
): string {
  const parts: string[] = [];

  parts.push('# 🎬 Список идей для YouTube Shorts & Reels');
  if (options.niche) {
    parts.push(`**Ниша:** ${options.niche}`);
  }
  if (options.channelName) {
    parts.push(`**Канал:** ${options.channelName}`);
  }
  parts.push(`**Дата формирования:** ${new Date().toLocaleDateString('ru-RU')}`);
  parts.push(`**Всего идей:** ${ideas.length}`);
  parts.push('');

  if (options.includeFramework !== false && options.framework) {
    parts.push('---');
    parts.push('### 🎯 Формула успеха ниши (на основе вирусных аутлаеров):');
    parts.push(`> *«${options.framework}»*`);
    parts.push('');
  }

  parts.push('---');
  parts.push('## 💡 Готовые идеи к съемке:');
  parts.push('');

  ideas.forEach((idea, idx) => {
    parts.push(`### #${idx + 1}. ${idea.title}`);
    
    if (idea.estimatedDuration) {
      parts.push(`- ⏱ **Хронометраж:** ${idea.estimatedDuration}`);
    }
    if (idea.emotionalTrigger || idea.trigger) {
      parts.push(`- ❤️ **Триггер эмоций:** ${idea.emotionalTrigger || idea.trigger}`);
    }
    if (options.includeHooks !== false && idea.hook) {
      parts.push(`- ⚡ **Хук (первые 3 секунды):** «${idea.hook}»`);
    }
    if (options.includeWhyItWorks !== false && idea.whyItWorks) {
      parts.push(`- 🔥 **Почему сработает:** ${idea.whyItWorks}`);
    }
    const visuals = idea.visualTypes || idea.visualContent;
    if (options.includeVisuals !== false && visuals && visuals.length > 0) {
      parts.push(`- 🎥 **Что в кадре:** ${visuals.join(', ')}`);
    }

    if (options.includeScripts !== false && idea.fullScript) {
      parts.push('');
      parts.push('**Сценарий ролика:**');
      parts.push('```text');
      parts.push(idea.fullScript);
      parts.push('```');
    }

    parts.push('');
  });

  return parts.join('\n');
}

/**
 * Format 10 outlier ideas to readable plain text
 */
export function formatShortsIdeasToPlainText(
  ideas: ShortsOutlierIdea[],
  options: ShortsIdeasExportOptions = {}
): string {
  const parts: string[] = [];

  parts.push('СПИСОК ИДЕЙ ДЛЯ SHORTS & REELS');
  if (options.niche) parts.push(`Ниша: ${options.niche}`);
  if (options.channelName) parts.push(`Канал: ${options.channelName}`);
  parts.push(`Дата: ${new Date().toLocaleDateString('ru-RU')}`);
  parts.push(`Количество идей: ${ideas.length}`);
  parts.push('='.repeat(50));
  parts.push('');

  if (options.includeFramework !== false && options.framework) {
    parts.push('ФОРМУЛА УСПЕХА НИШИ:');
    parts.push(options.framework);
    parts.push('-'.repeat(50));
    parts.push('');
  }

  ideas.forEach((idea, idx) => {
    parts.push(`[ИДЕЯ #${idx + 1}] ${idea.title}`);
    if (idea.estimatedDuration) parts.push(`• Хронометраж: ${idea.estimatedDuration}`);
    if (idea.emotionalTrigger || idea.trigger) parts.push(`• Эмоциональный триггер: ${idea.emotionalTrigger || idea.trigger}`);
    if (options.includeHooks !== false && idea.hook) parts.push(`• Хук (0-3 сек): ${idea.hook}`);
    if (options.includeWhyItWorks !== false && idea.whyItWorks) parts.push(`• Почему сработает: ${idea.whyItWorks}`);
    const visuals = idea.visualTypes || idea.visualContent;
    if (options.includeVisuals !== false && visuals && visuals.length > 0) {
      parts.push(`• Что в кадре: ${visuals.join(', ')}`);
    }
    if (options.includeScripts !== false && idea.fullScript) {
      parts.push('\nТЕКСТ СЦЕНАРИЯ:');
      parts.push(idea.fullScript);
    }
    parts.push('');
    parts.push('-'.repeat(40));
    parts.push('');
  });

  return parts.join('\n');
}

/**
 * Export 10 outlier ideas as styled PDF document
 */
export function exportShortsIdeasAsPDF(
  ideas: ShortsOutlierIdea[],
  filename: string,
  options: ShortsIdeasExportOptions = {}
): void {
  const container = document.createElement('div');
  container.style.padding = '32px';
  container.style.color = '#0f172a';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.lineHeight = '1.5';

  const sanitizedFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Shorts_Ideas';

  let html = `
    <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #b45309; font-weight: 800; margin-bottom: 4px;">
        YouTube Shorts & Reels • AI Architect
      </div>
      <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">
        Список вирусных идей для Shorts
      </h1>
      <div style="font-size: 13px; color: #64748b; display: flex; gap: 16px;">
        ${options.niche ? `<span><strong>Ниша:</strong> ${options.niche}</span> &bull; ` : ''}
        ${options.channelName ? `<span><strong>Канал:</strong> ${options.channelName}</span> &bull; ` : ''}
        <span><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</span> &bull;
        <span><strong>Идей:</strong> ${ideas.length}</span>
      </div>
    </div>
  `;

  if (options.includeFramework !== false && options.framework) {
    html += `
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">
          🎯 Формула успеха ниши (на основе вирусных аутлаеров):
        </div>
        <div style="font-size: 13px; color: #92400e; font-style: italic; line-height: 1.4;">
          «${options.framework}»
        </div>
      </div>
    `;
  }

  html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;

  ideas.forEach((idea, idx) => {
    const visuals = idea.visualTypes || idea.visualContent;
    html += `
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background-color: #f8fafc; page-break-inside: avoid; margin-bottom: 16px;">
        <div style="display: flex; align-items: baseline; margin-bottom: 8px;">
          <span style="background-color: #f59e0b; color: #000; font-weight: 900; font-size: 11px; padding: 2px 8px; border-radius: 6px; margin-right: 8px;">
            #${idx + 1}
          </span>
          <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">
            ${idea.title}
          </h2>
        </div>

        <div style="font-size: 11px; color: #475569; margin-bottom: 10px; display: flex; gap: 12px;">
          ${idea.estimatedDuration ? `<span>⏱ ${idea.estimatedDuration}</span>` : ''}
          ${idea.emotionalTrigger || idea.trigger ? `<span style="color: #e11d48;">❤️ ${idea.emotionalTrigger || idea.trigger}</span>` : ''}
          ${idea.isGenerated ? `<span style="color: #059669; font-weight: 600;">✓ Сценарий готов</span>` : ''}
        </div>

        ${options.includeHooks !== false && idea.hook ? `
          <div style="background-color: #ffffff; border-left: 3px solid #f59e0b; padding: 8px 12px; margin-bottom: 8px; border-radius: 0 6px 6px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">Хук первых 3 секунд:</div>
            <div style="font-size: 13px; color: #1e293b; font-weight: 600;">«${idea.hook}»</div>
          </div>
        ` : ''}

        ${options.includeWhyItWorks !== false && idea.whyItWorks ? `
          <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">
            <strong style="color: #0f172a;">Почему сработает:</strong> ${idea.whyItWorks}
          </div>
        ` : ''}

        ${options.includeVisuals !== false && visuals && visuals.length > 0 ? `
          <div style="font-size: 12px; color: #334155;">
            <strong style="color: #0f172a;">Что в кадре:</strong> ${visuals.join(', ')}
          </div>
        ` : ''}

        ${options.includeScripts !== false && idea.fullScript ? `
          <div style="margin-top: 10px; padding: 10px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-family: monospace; white-space: pre-wrap; color: #334155;">
            <strong style="font-family: sans-serif; display: block; margin-bottom: 4px; color: #0f172a;">Текст сценария:</strong>
            ${idea.fullScript}
          </div>
        ` : ''}
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  const opt = {
    margin: 10,
    filename: `${sanitizedFilename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  html2pdf().set(opt).from(container).save();
}

/**
 * Format cut shorts list to CSV format
 */
export function formatCutShortsToCSV(items: CutShortItem[]): string {
  const headers = [
    '№',
    'Название Shorts',
    'Хук',
    'Хронометраж',
    'Вирусный потенциал',
    'Закольцовка финала',
    'Сценарий'
  ];

  const rows = items.map((item, idx) => {
    return [
      escapeCsv(idx + 1),
      escapeCsv(item.title || `Shorts #${idx + 1}`),
      escapeCsv(item.hook || ''),
      escapeCsv(item.duration || ''),
      escapeCsv(item.viral_potential || ''),
      escapeCsv(item.loopEnding?.loopEndingPhrase || ''),
      escapeCsv(item.loopEnding?.loopedFullScript || item.script || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Format cut shorts list to Markdown format
 */
export function formatCutShortsToMarkdown(
  items: CutShortItem[],
  options: { niche?: string; channelName?: string } = {}
): string {
  const parts: string[] = [];

  parts.push('# ✂️ Сгенерированные нарезки Shorts');
  if (options.niche) parts.push(`**Ниша:** ${options.niche}`);
  if (options.channelName) parts.push(`**Канал:** ${options.channelName}`);
  parts.push(`**Количество роликов:** ${items.length}`);
  parts.push('');

  items.forEach((item, idx) => {
    parts.push(`## #${idx + 1}. ${item.title}`);
    if (item.duration) parts.push(`- **Хронометраж:** ${item.duration}`);
    if (item.hook) parts.push(`- **Хук:** «${item.hook}»`);
    if (item.viral_potential) parts.push(`- **Потенциал:** ${item.viral_potential}`);
    if (item.loopEnding?.loopEndingPhrase) {
      parts.push(`- **Бесшовная закольцовка:** «${item.loopEnding.loopEndingPhrase}»`);
    }
    const script = item.loopEnding?.loopedFullScript || item.script;
    if (script) {
      parts.push('');
      parts.push('```text');
      parts.push(script);
      parts.push('```');
    }
    parts.push('');
  });

  return parts.join('\n');
}

/**
 * Format 10 outlier ideas to JSON format
 */
export function formatShortsIdeasToJSON(
  ideas: ShortsOutlierIdea[],
  options: ShortsIdeasExportOptions = {}
): string {
  const exportData = {
    metadata: {
      niche: options.niche || '',
      channelName: options.channelName || '',
      framework: options.framework || '',
      exportedAt: new Date().toISOString(),
      totalCount: ideas.length,
      format: 'ShortsIdeas_JSON_v1'
    },
    ideas: ideas.map((idea, idx) => ({
      id: idea.id || `shorts-idea-${idx + 1}-${Date.now()}`,
      number: idx + 1,
      title: idea.title || `Идея #${idx + 1}`,
      hook: idea.hook || '',
      whyItWorks: idea.whyItWorks || '',
      visualTypes: idea.visualTypes || idea.visualContent || [],
      estimatedDuration: idea.estimatedDuration || '30-45 сек',
      emotionalTrigger: idea.emotionalTrigger || idea.trigger || '',
      fullScript: idea.fullScript || '',
      scenes: idea.scenes || []
    }))
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Parse Shorts topics/ideas from JSON string
 */
export function parseShortsIdeasFromJSON(rawInput: string): {
  ideas: ShortsOutlierIdea[];
  error?: string;
  metadata?: any;
} {
  try {
    const parsed = JSON.parse(rawInput);
    let itemsArray: any[] = [];
    let metadata: any = null;

    if (Array.isArray(parsed)) {
      itemsArray = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.metadata) metadata = parsed.metadata;
      if (Array.isArray(parsed.ideas)) itemsArray = parsed.ideas;
      else if (Array.isArray(parsed.topics)) itemsArray = parsed.topics;
      else if (Array.isArray(parsed.shorts)) itemsArray = parsed.shorts;
      else if (Array.isArray(parsed.items)) itemsArray = parsed.items;
      else if (Array.isArray(parsed.data)) itemsArray = parsed.data;
      else if (parsed.title || parsed.name || parsed.topic) {
        itemsArray = [parsed];
      }
    }

    if (!itemsArray || itemsArray.length === 0) {
      return { ideas: [], error: 'Не удалось найти массив тем/идей в представленном JSON' };
    }

    const ideas: ShortsOutlierIdea[] = itemsArray.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `imported-topic-${idx + 1}-${Date.now()}`,
          number: idx + 1,
          title: item.trim(),
          hook: `Интригующий заголовок: ${item.trim()}`,
          whyItWorks: 'Тема импортирована из списка JSON',
          visualTypes: ['Влог', 'Текст на экране'],
          estimatedDuration: '30-45 сек'
        };
      }

      const title = item.title || item.name || item.topic || item.idea || item.header || item.subject || `Импортированная тема #${idx + 1}`;
      const hook = item.hook || item.hookText || item.intro || item.first3sec || '';
      const whyItWorks = item.whyItWorks || item.reason || item.description || item.explanation || 'Импортированная тема';

      let visualTypes: string[] = ['Динамичная нарезка'];
      if (Array.isArray(item.visualTypes)) visualTypes = item.visualTypes;
      else if (Array.isArray(item.visualContent)) visualTypes = item.visualContent;
      else if (Array.isArray(item.visuals)) visualTypes = item.visuals;
      else if (typeof item.visualTypes === 'string') visualTypes = item.visualTypes.split(/[,;]/).map((s: string) => s.trim());

      return {
        id: item.id || `imported-topic-${idx + 1}-${Date.now()}`,
        number: typeof item.number === 'number' ? item.number : idx + 1,
        title: String(title).trim(),
        hook: String(hook).trim(),
        whyItWorks: String(whyItWorks).trim(),
        visualTypes,
        estimatedDuration: item.estimatedDuration || item.duration || '30-45 сек',
        emotionalTrigger: item.emotionalTrigger || item.trigger || '',
        fullScript: item.fullScript || item.script || item.text || '',
        scenes: Array.isArray(item.scenes) ? item.scenes : undefined,
        isGenerated: Boolean(item.fullScript || item.script || item.isGenerated)
      };
    }).filter(idea => Boolean(idea.title));

    return { ideas, metadata };
  } catch (err: any) {
    return { ideas: [], error: `Синтаксическая ошибка в JSON: ${err.message}` };
  }
}
