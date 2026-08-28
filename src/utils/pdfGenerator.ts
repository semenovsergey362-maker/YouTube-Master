import html2pdf from 'html2pdf.js';

export function downloadUserManualPDF() {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>NicheMaster User Manual</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 40px; background: #fff; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e3a8a; font-size: 28px; margin: 0 0 10px 0; text-transform: uppercase; }
          h2 { color: #2563eb; font-size: 18px; border-left: 4px solid #2563eb; padding-left: 10px; margin-top: 30px; }
          p, li { font-size: 13px; line-height: 1.6; color: #334155; }
        </style>
      </head>
      <body>
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1>NicheMaster &bull; Полное руководство пользователя</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Интерактивная пошаговая инструкция по работе с AI Архитектором YouTube канала</p>
        </div>

        <div>
          <h2>1. Введение и обзор архитектуры</h2>
          <p>NicheMaster — это профессиональная полнофункциональная платформа для создания, планирования и оптимизации контента на YouTube с использованием передовых моделей Google Gemini. Приложение проведет вас от поиска и выбора прибыльной ниши до генерации сценариев, промптов и SEO-оптимизации.</p>
        </div>

        <div>
          <h2>2. Пошаговый рабочий процесс (8 этапов)</h2>
          <ul>
            <li><strong>Шаг 1: Ниша</strong> — Выбор или генерация прибыльной ниши с оценкой конкуренции, целевой аудитории и потенциала монетизации.</li>
            <li><strong>Шаг 2: Брендинг</strong> — Создание айдентики канала (название, слоган, цветовая палитра и промпты для логотипа).</li>
            <li><strong>Шаг 3: YouTube Аналитика</strong> — Изучение лидеров ниши, трендов и построение стратегии роста.</li>
            <li><strong>Шаг 4: Идеи</strong> — Генерация виральных тем и концепций для видео с высоким потенциалом просмотров.</li>
            <li><strong>Шаг 5: Сценарий</strong> — Построение детального сценария с триггерами удержания, таймлайном и структурой сцен.</li>
            <li><strong>Шаг 6: Промптинг</strong> — Подготовка профессиональных промптов для генераторов видео и изображений (Midjourney, Stable Diffusion, Sora).</li>
            <li><strong>Шаг 7: SEO</strong> — Автоматическая оптимизация заголовков, описаний и тегов под алгоритмы YouTube.</li>
            <li><strong>Шаг 8: Shorts</strong> — Создание коротких виральных роликов (Shorts) из длинных видео.</li>
          </ul>
        </div>

        <div>
          <h2>3. Настройка моделей и лимитов</h2>
          <p>В левой панели вы можете выбрать модель ИИ (Gemini 3 Flash, Gemini 2.5 Flash, Pro и др.). Рядом с селектором моделей расположена кнопка <strong>"Лимиты"</strong>, позволяющая отслеживать квоты.</p>
        </div>

        <div>
          <h2>4. Кастомные правила (Custom Instructions)</h2>
          <p>Используйте кнопку <strong>"Правила"</strong> на панели управления для настройки персональных инструкций. Они автоматически передаются во все запросы к ИИ, задавая уникальный тон речи, бренд-гайдлайны и пожелания по стилю.</p>
        </div>

        <div>
          <h2>5. Использование Live поиска (Deep Research)</h2>
          <p>В AI Ассистенте (правый нижний угол) переключатель <strong>Live Поиск</strong> позволяет задействовать актуальные данные из интернета в реальном времени для поиска свежих трендов и фактов.</p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #94a3b8;">
          NicheMaster AI Studio &bull; Сгенерировано автоматически
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    const opt: any = {
      margin: 10,
      filename: 'NicheMaster_User_Manual.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(doc.body).set(opt).save().finally(() => {
      document.body.removeChild(iframe);
    });
  }, 600);
}
