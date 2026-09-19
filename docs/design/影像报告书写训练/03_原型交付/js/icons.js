/* 图标 —— 内联 SVG（stroke 描边风格，对齐训练端的线性图标语言）。
   不走 CDN 字体，保证 file:// 双击离线可用。 */
(function (w) {
  'use strict';

  var PATHS = {
    'file-pen': 'M14 3v5h5M15 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-5-5z/ M13 13.5l-3 .5.5-3 5-5 2.5 2.5-5 5z',
    'clipboard-check': 'M9 4h6v3H9zM9 5.5H7a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2M8.8 13l2.2 2.2L15.5 10.8',
    'film': 'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16',
    'image': 'M4 5h16v14H4zM4 15l4-4 3.5 3.5L15 11l5 5M9 9.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
    'pen': 'M4 20h4l10-10-4-4L4 16v4zM14 6l4 4',
    'bulb': 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z',
    'lock': 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
    'plus': 'M12 5v14M5 12h14',
    'send': 'M20 4L3 11l7 3 3 7 7-17zM10 14l10-10',
    'redo': 'M4 10a8 8 0 0 1 13.7-4.3L20 8M20 4v4h-4M20 14a8 8 0 0 1-13.7 4.3L4 16M4 20v-4h4',
    'next': 'M5 12h14M13 6l6 6-6 6',
    'prev': 'M19 12H5M11 18l-6-6 6-6',
    'check': 'M4 12.5l5 5L20 6.5',
    'close': 'M6 6l12 12M18 6L6 18',
    'warn': 'M12 3l9 16H3l9-16zM12 9v5M12 17h.01',
    'info': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
    'user': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'copy': 'M9 9h10v12H9zM5 15V3h10',
    'refresh': 'M20 11a8 8 0 0 0-13.7-4.3L4 9M4 4v5h5M4 13a8 8 0 0 0 13.7 4.3L20 15M20 20v-5h-5',
    'download': 'M12 4v12M7 11l5 5 5-5M4 20h16',
    'search': 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    'list': 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    'eye': 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'clock': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
    'chart': 'M4 20V9M10 20V4M16 20v-8M22 20H2',
    'doc': 'M14 3v5h5M15 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-5-5zM9 13h6M9 17h4',
    'flag': 'M5 21V4M5 4h11l-1.5 4L16 12H5',
    'target': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'grid': 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    'book': 'M4 4h7v16H4zM13 4h7v16h-7zM4 8h7M13 8h7',
    'shield': 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9.5-4.8-1.3-8-5-8-9.5V6l8-3zM9 12l2 2 4-4'
  };

  function icon(name, opts) {
    opts = opts || {};
    var d = PATHS[name] || PATHS['info'];
    var size = opts.size || 15;
    var cls = opts.class ? ' class="' + opts.class + '"' : '';
    var style = opts.style ? ' style="' + opts.style + '"' : '';
    var label = opts.label ? ' aria-label="' + opts.label + '" role="img"' : ' aria-hidden="true"';
    return '<svg' + cls + style + ' width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (opts.weight || 1.9) + '" stroke-linecap="round" stroke-linejoin="round"' + label + '>' +
      d.split(' /').map(function (p) { return '<path d="' + p.trim() + '"/>'; }).join('') +
      '</svg>';
  }

  w.icon = icon;
})(window);
