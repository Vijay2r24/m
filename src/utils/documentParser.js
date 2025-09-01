import { renderAsync } from 'docx-preview';

export const parseWordDocument = async (file, onProgress) => {
  try {
    if (onProgress) onProgress('Reading file data...');
    const arrayBuffer = await file.arrayBuffer();
    
    if (onProgress) onProgress('Initializing document renderer...');
    // Use docx-preview to render the document
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.className = 'word-document-preview';
    
    if (onProgress) onProgress('Rendering document content...');
    await renderAsync(arrayBuffer, container, container, {
      // Core rendering options for maximum format preservation
      className: 'word-document-preview',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      useMathMLPolyfill: true,
      
      // Document structure - preserve everything
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      breakPages: false,
      ignoreOutsideWidth: false,
      ignoreOutsideHeight: false,
      
      // Rendering mode - use web for better format preservation
      renderMode: 'web',
      
      // Page settings - use document's own dimensions
      pageWidth: undefined,
      pageHeight: undefined,
      pageMargins: undefined,
      
      // Content rendering - preserve all formatting
      renderImages: true,
      imageRendering: 'crisp',
      imageQuality: 1.0,
      convertImages: false,
      imagePositioning: 'original',
      
      // Text and layout - preserve exact formatting
      renderTables: true,
      renderLists: true,
      renderParagraphs: true,
      renderText: true,
      renderBreaks: true,
      renderSpaces: true,
      renderTabs: true,
      
      // Advanced features - simplified for performance
      renderHyperlinks: true,
      renderBookmarks: true,
      renderComments: true,
      renderRevisions: true,
      renderFields: true,
      renderFormulas: true,
      renderCharts: true,
      renderShapes: true,
      renderSmartArt: true,
      renderWatermarks: false,
      renderBackgrounds: true,
      renderBorders: true,
      renderShadows: true,
      renderEffects: true,
      renderTransforms: false,
      renderAnimations: false,
      renderMedia: false,
      renderEmbedded: false,
      renderOle: false,
      renderActiveX: false,
      renderMacros: false,
      renderCustomXml: false,
      renderContentControls: false,
      renderSdt: false,
      
      // Font handling - preserve exact fonts and sizes
      fontRendering: 'crisp',
      fontSubstitution: false,
      fontEmbedding: false,
      
      // Spacing and layout - preserve document's exact spacing
      preserveWhitespace: true,
      preserveLineBreaks: true,
      preserveIndentation: true,
      preserveMargins: true,
      preservePadding: true,
      
      // Color and styling - preserve exact colors and effects
      preserveColors: true,
      preserveEffects: true,
      preserveShadows: true,
      preserveBorders: true,
      preserveBackgrounds: true
    });
    
    if (onProgress) onProgress('Processing images and content...');
    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Extract HTML content
    const htmlContent = container.innerHTML;
    
    // Process images to ensure they're properly displayed
    const processedHtml = processImagesInHtml(htmlContent);

    if (onProgress) onProgress('Optimizing fonts and layout...');
    // Normalize fonts and collect any web fonts to load for better Word parity
    const { html: fontNormalizedHtml, usedWebFonts } = normalizeAndCollectFonts(processedHtml);
    // Skip web font loading for performance
    
    // Extract plain text while preserving structure
    if (onProgress) onProgress('Finalizing document...');
    const plainText = extractPlainTextWithStructure(fontNormalizedHtml);
    
    return {
      content: plainText,
      htmlContent: fontNormalizedHtml,
      originalHtmlContent: fontNormalizedHtml
    };
  } catch (error) {
    console.error('Error parsing document:', error);
    throw new Error('Failed to parse document. Please ensure it\'s a valid Word document.');
  }
};

const processImagesInHtml = (html) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find all images and ensure they have proper attributes
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => {
    try {
      // Ensure image has proper styling
      if (!img.style.maxWidth) {
        img.style.maxWidth = '100%';
      }
      if (!img.style.height) {
        img.style.height = 'auto';
      }
      if (!img.style.display) {
        img.style.display = 'block';
      }
      
      // Add alt text if missing
      if (!img.alt) {
        img.alt = 'Document image';
      }
      
      // Ensure proper loading
      img.loading = 'lazy';
      
      // Add error handling
      img.onerror = function() {
        this.style.display = 'none';
        console.warn('Failed to load image:', this.src);
      };
      
      // Ensure base64 images are properly formatted
      if (img.src && img.src.startsWith('data:image')) {
        // Ensure the data URL is properly formatted
        if (!img.src.includes(';base64,')) {
          console.warn('Invalid base64 image format:', img.src);
        }
      }
    } catch (error) {
      console.warn('Error processing image:', error);
      img.style.display = 'none';
    }
  });
  
  return tempDiv.innerHTML;
};

const extractPlainTextWithStructure = (html) => {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  try {
    tempDiv.innerHTML = html;
  } catch (error) {
    console.warn('Error parsing HTML for text extraction:', error);
    return '';
  }
  
  // Process elements to preserve structure
  const processElement = (element) => {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || '';
    
    // Handle images in text extraction
    if (tagName === 'img') {
      const alt = element.alt || 'Image';
      return `[${alt}]`;
    }
    
    // Add appropriate spacing based on element type
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return text ? `\n\n${text}\n` : '';
      case 'p':
        return text ? `${text}\n\n` : '\n';
      case 'li':
        return text ? `• ${text}\n` : '';
      case 'br':
        return '\n';
      case 'td':
      case 'th':
        return text ? `${text}\t` : '';
      case 'tr':
        return '\n';
      default:
        return text;
    }
  };
  
  const elements = Array.from(tempDiv.querySelectorAll('*'));
  let result = '';
  
  elements.forEach(element => {
    try {
      if (!element.children.length) { // Only process leaf elements
        result += processElement(element);
      }
    } catch (error) {
      console.warn('Error processing element:', error);
    }
  });
  
  return result.trim();
};

export const validateFile = (file) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  const validExtensions = ['.docx', '.doc'];
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  return hasValidType || hasValidExtension;
}; 

// Map common Microsoft Word fonts to metrically compatible, widely available web fonts
const WORD_FONT_TO_WEB_FONT = {
  'Calibri': 'Carlito',
  'Cambria': 'Caladea',
  'Arial': 'Arimo',
  'Times New Roman': 'Tinos',
  'Courier New': 'Cousine'
};

// Map web font names to Google Fonts family query components
const WEB_FONT_TO_GOOGLE_FAMILY = {
  'Carlito': 'Carlito:wght@400;700',
  'Caladea': 'Caladea:wght@400;700',
  'Arimo': 'Arimo:wght@400;700',
  'Tinos': 'Tinos:wght@400;700',
  'Cousine': 'Cousine:wght@400;700'
};

// Normalize inline font stacks and collect which web fonts must be loaded
const normalizeAndCollectFonts = (html) => {
  if (!html) return { html: '', usedWebFonts: [] };
  
  const tempDiv = document.createElement('div');
  try {
    tempDiv.innerHTML = html;
  } catch (error) {
    console.warn('Error parsing HTML for font normalization:', error);
    return { html, usedWebFonts: [] };
  }

  const usedWebFonts = new Set();

  const elementsWithFont = tempDiv.querySelectorAll('[style*="font-family"]');
  elementsWithFont.forEach((el) => {
    try {
      const current = el.style.fontFamily || '';
      if (!current) return;

      // Normalize quotes and spacing for easier matching
      const normalized = current.replace(/\s*,\s*/g, ', ').replace(/\"|\'/g, '');
      let updated = normalized;

      Object.entries(WORD_FONT_TO_WEB_FONT).forEach(([wordFont, webFont]) => {
        if (normalized.toLowerCase().includes(wordFont.toLowerCase())) {
          // Ensure the web font is present right after the Word font for best matching
          const regex = new RegExp(`(^|, )${wordFont}(, |$)`, 'i');
          if (!new RegExp(`(^|, )${webFont}(, |$)`, 'i').test(updated)) {
            updated = updated.replace(regex, (m, p1, p2) => `${p1}${wordFont}, ${webFont}${p2 || ''}`);
            usedWebFonts.add(webFont);
          }
        }
      });

      if (updated !== normalized) {
        el.style.fontFamily = updated;
      }
    } catch (error) {
      console.warn('Error processing font for element:', error);
    }
  });

  return { html: tempDiv.innerHTML, usedWebFonts: Array.from(usedWebFonts) };
};

// Inject Google Fonts link tag if needed
const loadWebFontsIfNeeded = (webFonts) => {
  try {
    if (!webFonts || webFonts.length === 0) return;

    const id = 'doc-compare-webfonts';
    if (document.getElementById(id)) return; // already loaded

    const families = webFonts
      .map((name) => WEB_FONT_TO_GOOGLE_FAMILY[name])
      .filter(Boolean);
    if (families.length === 0) return;

    const href = `https://fonts.googleapis.com/css2?${families
      .map((f) => `family=${encodeURIComponent(f)}`)
      .join('&')}&display=swap`;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  } catch (error) {
    console.warn('Error loading web fonts:', error);
  }
};