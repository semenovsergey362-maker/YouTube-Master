import { CustomRule } from '../types/domainTypes';

/**
 * Parses markdown canon/instruction files into a list of structured CustomRules.
 * Recognizes level 1, 2, and 3 markdown headings as individual rule boundaries.
 */
export function parseMarkdownToCustomRules(markdown: string, sourceName?: string): CustomRule[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const lines = markdown.split('\n');
  const rules: CustomRule[] = [];
  let currentTitle = '';
  let currentContentLines: string[] = [];

  const flushCurrent = () => {
    const trimmedContent = currentContentLines.join('\n').trim();
    if (currentTitle || trimmedContent) {
      const finalTitle = currentTitle || (sourceName ? `Правило из ${sourceName}` : 'Пользовательское правило');
      rules.push({
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        title: finalTitle.replace(/^[#\s\d.-]+/, '').trim() || finalTitle,
        content: trimmedContent,
        isActive: true,
      });
    }
    currentTitle = '';
    currentContentLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushCurrent();
      currentTitle = headingMatch[1].trim();
    } else {
      currentContentLines.push(line);
    }
  }

  flushCurrent();

  // If only 1 rule was generated and title is empty/generic, provide a clean title
  if (rules.length === 1 && !rules[0].title) {
    rules[0].title = sourceName ? `Импорт: ${sourceName}` : 'Импортированное правило';
  }

  return rules.filter(r => r.content.trim().length > 0 || r.title.trim().length > 0);
}
