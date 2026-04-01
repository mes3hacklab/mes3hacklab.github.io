function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveAssetPath(rawPath, currentFileSrc) {
  if (/^(https?:|mailto:|\/)/.test(rawPath)) return rawPath;
  const base = currentFileSrc.split('/').slice(0, -1).join('/');
  return `${base}/${rawPath}`.replace(/\/+/g, '/');
}

function extractYouTubeId(value) {
  const input = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const embedMatch = input.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

function renderYouTubeEmbed(value) {
  const videoId = extractYouTubeId(value);
  if (!videoId) {
    return `<p class="md-error">Invalid YouTube video: ${escapeHtml(value)}</p>`;
  }

  const src = `https://www.youtube.com/embed/${videoId}`;
  return `
    <div class="yt-embed">
      <iframe
        src="${src}"
        title="YouTube video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>
    </div>
  `;
}

function parseInlineMarkdown(text, currentFileSrc) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const resolved = resolveAssetPath(src, currentFileSrc);
    return `<img src="${resolved}" alt="${escapeHtml(alt)}" loading="lazy">`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const resolved = resolveAssetPath(href, currentFileSrc);
    return `<a href="${resolved}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  });

  return html;
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function parseTableAlignment(separatorLine) {
  return splitTableRow(separatorLine).map(cell => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(':');
    const right = trimmed.endsWith(':');

    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return 'left';
  });
}

function renderTable(tableLines, currentFileSrc) {
  if (tableLines.length < 2) return '';

  const headerCells = splitTableRow(tableLines[0]);
  const alignments = parseTableAlignment(tableLines[1]);
  const bodyRows = tableLines.slice(2).map(splitTableRow);

  let html = '<div class="table-wrap"><table class="md-table">';

  html += '<thead><tr>';
  headerCells.forEach((cell, i) => {
    const align = alignments[i] || 'left';
    html += `<th data-align="${align}">${parseInlineMarkdown(cell, currentFileSrc)}</th>`;
  });
  html += '</tr></thead>';

  if (bodyRows.length) {
    html += '<tbody>';
    bodyRows.forEach(row => {
      html += '<tr>';
      row.forEach((cell, i) => {
        const align = alignments[i] || 'left';
        html += `<td data-align="${align}">${parseInlineMarkdown(cell, currentFileSrc)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }

  html += '</table></div>';
  return html;
}

function renderGallery(lines, currentFileSrc) {
  const items = [];

  for (const line of lines) {
    const match = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (!match) continue;

    const [, alt, src] = match;
    const resolved = resolveAssetPath(src, currentFileSrc);

    items.push(`
      <figure class="md-gallery-item">
        <img src="${resolved}" alt="${escapeHtml(alt)}" loading="lazy">
        ${alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : ''}
      </figure>
    `);
  }

  if (!items.length) return '';
  return `<div class="md-gallery">${items.join('')}</div>`;
}

function renderTerminalMarkdown(md, currentFileSrc) {
  md = md
    .replace(/^\\(?=#{1,6}\s)/gm, '')
    .replace(/\\\*/g, '*')
    .replace(/\\`/g, '`')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');

  const lines = md.replace(/\r\n/g, '\n').split('\n');

  let html = '';
  let paragraph = [];
  let listBuffer = [];
  let orderedListBuffer = [];
  let tableBuffer = [];
  let quoteBuffer = [];
  let inCode = false;
  let codeBuffer = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html += `<p>${paragraph.join('<br>')}</p>`;
    paragraph = [];
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    html += '<ul>' + listBuffer.map(item => `<li>${item}</li>`).join('') + '</ul>';
    listBuffer = [];
  };

  const flushOrderedList = () => {
    if (!orderedListBuffer.length) return;
    html += '<ol>' + orderedListBuffer.map(item => `<li>${item}</li>`).join('') + '</ol>';
    orderedListBuffer = [];
  };

  const flushQuote = () => {
    if (!quoteBuffer.length) return;
    html += `<blockquote>${quoteBuffer.join('<br>')}</blockquote>`;
    quoteBuffer = [];
  };

  const flushCode = () => {
    if (!codeBuffer.length) return;
    html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
    codeBuffer = [];
  };

  const flushTable = () => {
    if (!tableBuffer.length) return;
    html += renderTable(tableBuffer, currentFileSrc);
    tableBuffer = [];
  };

  const flushAllBlocks = () => {
    flushParagraph();
    flushList();
    flushOrderedList();
    flushQuote();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushAllBlocks();

      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const nextLine = lines[i + 1] || '';
    const startsTable = isTableLine(line) && isTableSeparator(nextLine);

    if (startsTable) {
      flushAllBlocks();

      tableBuffer.push(line);
      tableBuffer.push(nextLine);
      i += 1;

      while (i + 1 < lines.length && isTableLine(lines[i + 1])) {
        tableBuffer.push(lines[i + 1]);
        i += 1;
      }

      flushTable();
      continue;
    }

    // YouTube block
    const ytMatch = trimmed.match(/^::youtube\[(.+)\]$/);
    if (ytMatch) {
      flushAllBlocks();
      html += renderYouTubeEmbed(ytMatch[1]);
      continue;
    }

    // Gallery block
    if (trimmed === '::gallery') {
      flushAllBlocks();
      const galleryLines = [];

      while (i + 1 < lines.length) {
        i += 1;
        const inner = lines[i].trim();
        if (inner === '::') break;
        if (inner) galleryLines.push(lines[i]);
      }

      html += renderGallery(galleryLines, currentFileSrc);
      continue;
    }

    if (!trimmed) {
      flushAllBlocks();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushAllBlocks();
      html += '<hr>';
      continue;
    }

    if (/^###\s+/.test(line)) {
      flushAllBlocks();
      html += `<h3>${parseInlineMarkdown(line.replace(/^###\s+/, ''), currentFileSrc)}</h3>`;
      continue;
    }

    if (/^##\s+/.test(line)) {
      flushAllBlocks();
      html += `<h2>${parseInlineMarkdown(line.replace(/^##\s+/, ''), currentFileSrc)}</h2>`;
      continue;
    }

    if (/^#\s+/.test(line)) {
      flushAllBlocks();
      html += `<h1>${parseInlineMarkdown(line.replace(/^#\s+/, ''), currentFileSrc)}</h1>`;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      flushList();
      flushOrderedList();
      flushTable();
      quoteBuffer.push(parseInlineMarkdown(line.replace(/^>\s?/, ''), currentFileSrc));
      continue;
    }

    if (/^- /.test(line)) {
      flushParagraph();
      flushOrderedList();
      flushQuote();
      flushTable();
      listBuffer.push(parseInlineMarkdown(line.replace(/^- /, ''), currentFileSrc));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      flushTable();
      orderedListBuffer.push(parseInlineMarkdown(line.replace(/^\d+\.\s+/, ''), currentFileSrc));
      continue;
    }

    paragraph.push(parseInlineMarkdown(line, currentFileSrc));
  }

  flushParagraph();
  flushList();
  flushOrderedList();
  flushQuote();
  flushTable();
  flushCode();

  return html;
}

window.renderTerminalMarkdown = renderTerminalMarkdown;