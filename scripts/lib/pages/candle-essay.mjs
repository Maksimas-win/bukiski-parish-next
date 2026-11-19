// Shared editorial composition. Escape every data field before producing HTML.
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const plain = value => Array.isArray(value) ? value.map(run => typeof run === 'string' ? run : run.text).join('') : String(value ?? '');
const inline = value => escape(plain(value)).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const kinds = ['light', 'history', 'icons', 'gift', 'practice', 'care', 'welcome', 'closing'];
const periods = ['Ветхий Завет', 'I век', 'IV век', 'V век'];

export function publicationEssay(publication) {
  const sections = [];
  for (const block of publication.blocks) {
    if (block.tag === 'h2') {
      sections.push({ title: block.text, blocks: [] });
    } else if (sections.length) {
      const quote = block.tag === 'blockquote' && block.text.match(/^([\s\S]*)\s\(([^()]*)\)\.$/);
      sections.at(-1).blocks.push({ type: block.tag === 'blockquote' ? 'quote' : 'p', text: quote ? quote[1] : block.text, source: quote ? quote[2] : '', refs: block.refs || [] });
    }
  }
  return { title: publication.title, rubric: publication.rubric, subtitle: publication.subtitle || 'О свете Христовом, молитве и свободном даре', lead: publication.lead, author: publication.author, published: publication.publishedAt, sections, sources: publication.sources.map(source => ({ ...source, title: source.label })) };
}

export function renderCandleEssay(article, options = {}) {
  const sources = article.sources.map((source, index) => ({ ...source, index: index + 1, anchor: 'essay-source-' + (source.id || index + 1) }));
  const references = new Map(sources.map(source => [source.id, source]));
  const citation = block => (block.refs || []).map(id => {
    const source = references.get(id);
    return source ? ' <a class="candle-feature__citation" href="#' + escape(source.anchor) + '" aria-label="' + escape(source.title) + '">[' + source.index + ']</a>' : '';
  }).join('');
  const block = (item, sectionIndex, index) => {
    if (item.type === 'quote') {
      return '<blockquote class="candle-feature__quote scripture-quote"><span aria-hidden="true" class="candle-feature__quote-mark">“</span><p>' + inline(item.text) + '</p><footer class="candle-feature__quote-source scripture-quote__source"> (' + escape(item.source) + ').</footer></blockquote>';
    }
    const paragraph = '<p>' + inline(item.text) + citation(item) + '</p>';
    if (sectionIndex === 1) return '<div class="candle-feature__era"><div class="candle-feature__era-date">' + escape(periods[index] || '') + '</div><div class="candle-feature__era-copy">' + paragraph + '</div></div>';
    if (sectionIndex === 4) return '<div class="candle-feature__practice-row"><span class="candle-feature__step" aria-hidden="true">' + (index + 1) + '</span>' + paragraph + '</div>';
    return paragraph;
  };
  const toc = article.sections.map((section, index) => '<li><a href="#essay-chapter-' + (index + 1) + '"><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>' + escape(section.title) + '</a></li>').join('');
  const date = new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeZone: 'Europe/Vilnius' }).format(new Date(article.published + 'T12:00:00Z'));
  const titleEnd = 'свечи в храме';
  const title = article.title.endsWith(titleEnd) ? '<span>' + escape(article.title.slice(0, -titleEnd.length).trim()) + '</span> <em>' + titleEnd + '</em>' : escape(article.title);
  const chapters = article.sections.map((section, index) => {
    const kind = kinds[index] || 'plain';
    const badge = kind === 'history' ? 'Свидетельства веков' : kind === 'practice' ? 'Практика молитвы' : kind === 'care' ? 'Без страха и суеверий' : kind === 'welcome' ? 'В храме есть место каждому' : '';
    return '<section class="candle-feature__chapter candle-feature__chapter--' + kind + ' scripture-section" aria-labelledby="essay-chapter-' + (index + 1) + '">' +
      '<div class="candle-feature__chapter-heading"><span class="candle-feature__chapter-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div>' +
      (badge ? '<p class="candle-feature__chapter-label">' + badge + '</p>' : '') +
      '<h2 id="essay-chapter-' + (index + 1) + '" tabindex="-1">' + escape(section.title) + '</h2></div></div>' +
      '<div class="candle-feature__chapter-copy">' + section.blocks.map((item, i) => block(item, index, i)).join('') + '</div></section>';
  }).join('');
  return '<article class="article publication candle-feature" data-article lang="ru">' +
    '<header class="candle-feature__cover"><figure class="candle-feature__cover-art"><img src="' + escape(options.image || '../assets/img/publications/candles-editorial.jpg') + '" width="1536" height="1024" fetchpriority="high" decoding="async" alt="Горящие восковые свечи. Художественная иллюстрация к статье."><figcaption>Художественная иллюстрация</figcaption></figure>' +
    '<div class="candle-feature__cover-inner"><nav class="candle-feature__breadcrumbs scripture-breadcrumbs" aria-label="Путь к странице"><a href="' + escape(options.home || './') + '">Главная</a><span aria-hidden="true">/</span><a href="' + escape(options.back || 'articles.html') + '">' + escape(options.backLabel || 'Статьи') + '</a></nav>' +
    '<p class="candle-feature__eyebrow scripture-rubric">' + escape(article.rubric) + '</p><h1 class="candle-feature__title scripture-title">' + title + '</h1>' +
    '<p class="candle-feature__subtitle scripture-subtitle">' + escape(article.subtitle) + '</p>' +
    '<div class="candle-feature__meta scripture-meta"><span>' + escape(options.dateLabel || 'Опубликовано') + ' <time datetime="' + escape(article.published) + '">' + escape(date) + '</time></span><span>7 минут чтения</span></div>' +
    '<a class="candle-feature__read" href="#essay-reading">Читать статью <span aria-hidden="true">↓</span></a></div></header>' +
    '<div class="candle-feature__themes" aria-label="О чём эта статья"><div><span class="candle-feature__theme-number" aria-hidden="true">01</span><div><h2>Свет</h2><p>Напоминание о Христе, Который просвещает человека.</p></div></div><div><span class="candle-feature__theme-number" aria-hidden="true">02</span><div><h2>Молитва</h2><p>Видимое выражение благодарности, надежды и веры.</p></div></div><div><span class="candle-feature__theme-number" aria-hidden="true">03</span><div><h2>Дар</h2><p>Свободное и посильное участие в жизни прихода.</p></div></div></div>' +
    '<div class="candle-feature__layout" id="essay-reading"><aside class="candle-feature__margin"><nav class="candle-feature__contents contents" aria-labelledby="essay-contents-title" data-contents><p class="candle-feature__margin-label">Путеводитель по статье</p><h2 id="essay-contents-title">Содержание</h2><ol>' + toc + '</ol><a class="candle-feature__source-jump" href="#essay-sources">Источники и чтение ↗</a></nav></aside>' +
    '<div class="candle-feature__prose scripture-body article__body"><div class="candle-feature__lead scripture-lead"><p>' + inline(article.lead) + '</p></div>' + chapters +
    '<section class="candle-feature__sources scripture-sources" aria-labelledby="essay-sources"><details open><summary id="essay-sources"><span>Источники и чтение по теме</span><span class="candle-feature__source-count">' + sources.length + ' источников</span></summary><ol>' +
    sources.map(source => '<li id="' + escape(source.anchor) + '"><a href="' + escape(source.url) + '" rel="noopener noreferrer">' + escape(source.title) + '</a>' + (source.note ? '<p class="candle-feature__source-note">' + escape(source.note) + '</p>' : '') + '</li>').join('') +
    '</ol></details></section><footer class="candle-feature__signature"><p>' + escape(article.author || 'Приход храма Рождества Христова в Букишках') + '</p><a href="' + escape(options.back || 'articles.html') + '">' + escape(options.backLabel || 'Все статьи') + ' <span aria-hidden="true">↗</span></a></footer></div></div></article>';
}
