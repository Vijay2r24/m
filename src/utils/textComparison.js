import { diffChars, diffWordsWithSpace, diffArrays, diffSentences } from "diff";
import { diff_match_patch } from 'diff-match-patch';

export const compareDocuments = (leftText, rightText) => {
  const diffs = diffChars(leftText, rightText);
  const leftDiffs = [];
  const rightDiffs = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };

  diffs.forEach((diff) => {
    if (diff.added) {
      rightDiffs.push({ type: "insert", content: diff.value });
      summary.additions++;
    } else if (diff.removed) {
      leftDiffs.push({ type: "delete", content: diff.value });
      summary.deletions++;
    } else {
      leftDiffs.push({ type: "equal", content: diff.value });
      rightDiffs.push({ type: "equal", content: diff.value });
    }
  });

  summary.changes = summary.additions + summary.deletions;
  return { leftDiffs, rightDiffs, summary };
};

export const compareHtmlDocuments = (leftHtml, rightHtml) => {
  return new Promise((resolve) => {
    // Use setTimeout to prevent browser blocking
    setTimeout(() => {
      try {
        console.log('Starting optimized document comparison...');
        
        // Quick text comparison first
        const leftText = extractPlainText(leftHtml);
        const rightText = extractPlainText(rightHtml);

        if (leftText.trim() === rightText.trim()) {
          console.log('Documents are identical');
          resolve({
            leftDiffs: [{ type: "equal", content: leftHtml }],
            rightDiffs: [{ type: "equal", content: rightHtml }],
            summary: { additions: 0, deletions: 0, changes: 0 },
            detailed: { lines: [], tables: [], images: [] }
          });
          return;
        }

        console.log('Documents differ, performing mutual comparison...');
        
        // Perform mutual comparison with chunked processing
        const result = performMutualComparison(leftHtml, rightHtml);
        console.log('Comparison completed successfully');
        resolve(result);
        
      } catch (error) {
        console.error("Error during document comparison:", error);
        resolve({
          leftDiffs: [{ type: "equal", content: leftHtml }],
          rightDiffs: [{ type: "equal", content: rightHtml }],
          summary: { additions: 0, deletions: 0, changes: 0 },
          detailed: { lines: [], tables: [], images: [] },
        });
      }
    }, 10);
  });
};

// Optimized mutual comparison
const performMutualComparison = (leftHtml, rightHtml) => {
  const leftDiv = htmlToDiv(leftHtml);
  const rightDiv = htmlToDiv(rightHtml);

  // Extract lines from both documents
  const leftLines = extractDocumentLines(leftDiv);
  const rightLines = extractDocumentLines(rightDiv);

  console.log(`Comparing ${leftLines.length} vs ${rightLines.length} lines`);

  // Perform line-by-line mutual comparison
  const { leftProcessed, rightProcessed, summary } = performLineMutualComparison(leftLines, rightLines);

  // Apply the processed content back to the divs
  applyProcessedLinesToDiv(leftDiv, leftProcessed);
  applyProcessedLinesToDiv(rightDiv, rightProcessed);

  const detailed = generateSimpleDetailedReport(leftLines, rightLines);

  return {
    leftDiffs: [{ type: "equal", content: leftDiv.innerHTML }],
    rightDiffs: [{ type: "equal", content: rightDiv.innerHTML }],
    summary,
    detailed
  };
};

// Extract lines with their elements for processing
const extractDocumentLines = (container) => {
  const lines = [];
  
  // Get all direct children elements
  const children = Array.from(container.children);
  
  children.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    const text = (element.textContent || '').trim();
    const html = element.innerHTML || '';
    const isTable = tagName === 'table';
    const isImage = tagName === 'img' || tagName === 'figure';
    
    // Include all elements, even empty ones for proper alignment
    lines.push({
      element,
      text,
      html,
      index,
      tagName,
      isEmpty: !text && !isTable && !isImage,
      isTable,
      isImage,
      outerHTML: element.outerHTML
    });
  });
  
  // Also check for nested tables and images that might be inside divs
  const nestedTables = container.querySelectorAll('div table, div img, div figure');
  nestedTables.forEach((element, index) => {
    // Only add if not already included as a direct child
    const isDirectChild = children.includes(element);
    if (!isDirectChild) {
      const tagName = element.tagName.toLowerCase();
      const text = (element.textContent || '').trim();
      const html = element.innerHTML || '';
      const isTable = tagName === 'table';
      const isImage = tagName === 'img' || tagName === 'figure';
      
      lines.push({
        element,
        text,
        html,
        index: children.length + index,
        tagName,
        isEmpty: false,
        isTable,
        isImage,
        outerHTML: element.outerHTML
      });
    }
  });
  
  return lines;
};

// Perform mutual line comparison with empty space highlighting
const performLineMutualComparison = (leftLines, rightLines) => {
  const leftProcessed = [];
  const rightProcessed = [];
  let additions = 0, deletions = 0;

  // Simple line-by-line comparison
  const maxLength = Math.max(leftLines.length, rightLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const leftLine = leftLines[i];
    const rightLine = rightLines[i];
    
    if (leftLine && rightLine) {
      // Both lines exist - compare them
      if (leftLine.isTable && rightLine.isTable) {
        const tablesEqual = compareTableContent(leftLine.element, rightLine.element);
        if (tablesEqual) {
          leftProcessed.push({ ...leftLine, highlight: 'none' });
          rightProcessed.push({ ...rightLine, highlight: 'none' });
        } else {
          leftProcessed.push({ ...leftLine, highlight: 'modified' });
          rightProcessed.push({ ...rightLine, highlight: 'modified' });
          additions++;
          deletions++;
        }
      } else if (leftLine.isImage && rightLine.isImage) {
        const imagesEqual = compareImageContent(leftLine.element, rightLine.element);
        if (imagesEqual) {
          leftProcessed.push({ ...leftLine, highlight: 'none' });
          rightProcessed.push({ ...rightLine, highlight: 'none' });
        } else {
          leftProcessed.push({ ...leftLine, highlight: 'modified' });
          rightProcessed.push({ ...rightLine, highlight: 'modified' });
          additions++;
          deletions++;
        }
      } else if (areTextsEqual(leftLine.text, rightLine.text)) {
        leftProcessed.push({ ...leftLine, highlight: 'none' });
        rightProcessed.push({ ...rightLine, highlight: 'none' });
      } else {
        // Text differs - apply word-level highlighting
        const { leftHighlighted, rightHighlighted } = performWordLevelDiff(leftLine.html, rightLine.html);
        leftProcessed.push({ 
          ...leftLine, 
          highlight: 'modified',
          processedHtml: leftHighlighted 
        });
        rightProcessed.push({ 
          ...rightLine, 
          highlight: 'modified',
          processedHtml: rightHighlighted 
        });
        additions++;
        deletions++;
      }
    } else if (leftLine && !rightLine) {
      // Line exists only in left (removed)
      leftProcessed.push({ ...leftLine, highlight: 'removed' });
      rightProcessed.push({ 
        element: null, 
        text: '', 
        html: '', 
        isEmpty: true, 
        highlight: 'empty-space-removed',
        placeholderText: leftLine.text,
        tagName: leftLine.tagName,
        isTable: leftLine.isTable,
        isImage: leftLine.isImage,
        originalElement: leftLine.element
      });
      deletions++;
    } else if (!leftLine && rightLine) {
      // Line exists only in right (added)
      leftProcessed.push({ 
        element: null, 
        text: '', 
        html: '', 
        isEmpty: true, 
        highlight: 'empty-space-added',
        placeholderText: rightLine.text,
        tagName: rightLine.tagName,
        isTable: rightLine.isTable,
        isImage: rightLine.isImage,
        originalElement: rightLine.element
      });
      rightProcessed.push({ ...rightLine, highlight: 'added' });
      additions++;
    }
  }

  return {
    leftProcessed,
    rightProcessed,
    summary: { additions, deletions, changes: additions + deletions }
  };
};

// Create optimal alignment between two document line arrays
const createOptimalAlignment = (leftLines, rightLines) => {
  const alignment = [];
  let leftIndex = 0;
  let rightIndex = 0;
  
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex];
    const rightLine = rightLines[rightIndex];
    
    if (!leftLine && !rightLine) {
      break;
    } else if (leftLine && rightLine) {
      // Look ahead to find best match
      const similarity = getTextSimilarity(leftLine.text, rightLine.text);
      
      if (similarity > 0.8 || areTextsEqual(leftLine.text, rightLine.text)) {
        // Good match - align these lines
        alignment.push({ leftIndex, rightIndex, type: 'match' });
        leftIndex++;
        rightIndex++;
      } else {
        // Look ahead to see if we can find a better match
        const leftLookahead = findBestMatch(leftLine, rightLines.slice(rightIndex + 1, rightIndex + 4));
        const rightLookahead = findBestMatch(rightLine, leftLines.slice(leftIndex + 1, leftIndex + 4));
        
        if (leftLookahead.score > rightLookahead.score && leftLookahead.score > 0.8) {
          // Found better match for left line ahead in right document
          alignment.push({ leftIndex: null, rightIndex, type: 'addition' });
          rightIndex++;
        } else if (rightLookahead.score > 0.8) {
          // Found better match for right line ahead in left document
          alignment.push({ leftIndex, rightIndex: null, type: 'deletion' });
          leftIndex++;
        } else {
          // No good matches - treat as modification
          alignment.push({ leftIndex, rightIndex, type: 'match' });
          leftIndex++;
          rightIndex++;
        }
      }
    } else if (leftLine) {
      // Only left line remains - deletion
      alignment.push({ leftIndex, rightIndex: null, type: 'deletion' });
      leftIndex++;
    } else {
      // Only right line remains - addition
      alignment.push({ leftIndex: null, rightIndex, type: 'addition' });
      rightIndex++;
    }
  }

  return alignment;
};

// Find best matching line in a small lookahead window
const findBestMatch = (targetLine, candidateLines) => {
  let bestScore = 0;
  let bestIndex = -1;
  
  candidateLines.forEach((candidate, index) => {
    const similarity = getTextSimilarity(targetLine.text, candidate.text);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestIndex = index;
    }
  });
  
  return { score: bestScore, index: bestIndex };
};

// Apply processed lines back to the document
const applyProcessedLinesToDiv = (container, processedLines) => {
  // Clear container and rebuild with processed content
  container.innerHTML = '';

  processedLines.forEach(line => {
    if (line.element) {
      // Clone the original element to preserve formatting
      const element = line.element.cloneNode(true);
      
      // Apply highlighting without changing original formatting
      if (line.highlight === 'added') {
        element.classList.add('git-line-added');
      } else if (line.highlight === 'removed') {
        element.classList.add('git-line-removed');
      } else if (line.highlight === 'modified') {
        element.classList.add('git-line-modified');
        if (line.processedHtml) {
          element.innerHTML = line.processedHtml;
        }
      }
      
      container.appendChild(element);
    } else {
      // Create placeholder element
      const placeholder = createPlaceholderElement(line);
      container.appendChild(placeholder);
    } else {
      // Create minimal placeholder that matches original content dimensions
      element = document.createElement('div');
      element.classList.add('git-placeholder');
      
      if (line.isTable) {
        element.classList.add('git-placeholder-table');
        element.innerHTML = `<div class="placeholder-table-content">
          <span class="placeholder-icon">${line.highlight === 'empty-space-added' ? '+' : '−'}</span>
          <span class="placeholder-text">Table ${line.highlight === 'empty-space-added' ? 'added' : 'removed'}</span>
        </div>`;
      } else if (line.isImage) {
        element.classList.add('git-placeholder-image');
        element.innerHTML = `<div class="placeholder-image-content">
          <span class="placeholder-icon">${line.highlight === 'empty-space-added' ? '+' : '−'}</span>
          <span class="placeholder-text">Image ${line.highlight === 'empty-space-added' ? 'added' : 'removed'}</span>
        </div>`;
      } else {
        element.classList.add('git-placeholder-text');
        element.innerHTML = `<div class="placeholder-text-content">
          <span class="placeholder-icon">${line.highlight === 'empty-space-added' ? '+' : '−'}</span>
          <span class="placeholder-text">${escapeHtml(line.placeholderText?.substring(0, 50) || '')}${line.placeholderText?.length > 50 ? '...' : ''}</span>
        </div>`;
      }
      
      if (line.highlight === 'empty-space-added') {
        element.classList.add('git-placeholder-added');
      } else if (line.highlight === 'empty-space-removed') {
        element.classList.add('git-placeholder-removed');
      }
    }
  });
};

// Create placeholder element that maintains original spacing
const createPlaceholderElement = (line) => {
  // Create placeholder that matches the original element type and size
  let element;
  
  if (line.originalElement) {
    // Clone the original element structure but make it a placeholder
    element = line.originalElement.cloneNode(true);
    element.classList.add('git-placeholder');
    
    // Clear content but maintain structure
    if (line.isTable) {
      element.classList.add('placeholder-table');
      // Keep table structure but make cells empty placeholders
      const cells = element.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.innerHTML = '<span class="placeholder-cell-content">•</span>';
        cell.classList.add('placeholder-cell');
      });
    } else if (line.isImage) {
      element.classList.add('placeholder-image');
      element.innerHTML = '<div class="placeholder-image-content">🖼️ Image placeholder</div>';
    } else {
      element.classList.add('placeholder-text');
      const previewText = line.placeholderText?.substring(0, 100) || '';
      element.innerHTML = `<span class="placeholder-text-content">${escapeHtml(previewText)}${line.placeholderText?.length > 100 ? '...' : ''}</span>`;
    }
  } else {
    // Fallback: create simple placeholder
    element = document.createElement('div');
    element.classList.add('git-placeholder');
    
    if (line.isTable) {
      element.classList.add('placeholder-table');
      element.innerHTML = '<div class="placeholder-simple">📊 Table placeholder</div>';
    } else if (line.isImage) {
      element.classList.add('placeholder-image');
      element.innerHTML = '<div class="placeholder-simple">🖼️ Image placeholder</div>';
    } else {
      element.classList.add('placeholder-text');
      const previewText = line.placeholderText?.substring(0, 100) || '';
      element.innerHTML = `<div class="placeholder-simple">${escapeHtml(previewText)}${line.placeholderText?.length > 100 ? '...' : ''}</div>`;
    }
  }
  
  if (line.isTable) {
  if (line.highlight === 'empty-space-added') {
    element.classList.add('placeholder-added');
  } else if (line.highlight === 'empty-space-removed') {
    element.classList.add('placeholder-removed');
  }
  
  return element;
};

// Perform word-level diff between two HTML contents
const performWordLevelDiff = (leftHtml, rightHtml) => {
  const leftText = extractPlainText(leftHtml);
  const rightText = extractPlainText(rightHtml);
  
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText, rightText);
  dmp.diff_cleanupSemantic(diffs);
  
  const leftHighlighted = applyDiffHighlighting(diffs, 'left');
  const rightHighlighted = applyDiffHighlighting(diffs, 'right');
  
  return { leftHighlighted, rightHighlighted };
};

// Apply diff highlighting for mutual comparison
const applyDiffHighlighting = (diffs, side) => {
  let result = '';
  
  diffs.forEach(diff => {
    const [operation, text] = diff;
    
    if (operation === 0) {
      // Unchanged text
      result += escapeHtml(text);
    } else if (operation === 1) {
      // Added text
      if (side === 'right') {
        result += `<span class="git-inline-added">${escapeHtml(text)}</span>`;
      } else {
        // Show placeholder for added content in left document
        result += `<span class="git-inline-placeholder" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; font-style: italic; padding: 1px 3px; border-radius: 2px; font-size: 0.9em;">[+${escapeHtml(text.substring(0, 20))}${text.length > 20 ? '...' : ''}]</span>`;
      }
    } else if (operation === -1) {
      // Removed text
      if (side === 'left') {
        result += `<span class="git-inline-removed">${escapeHtml(text)}</span>`;
      } else {
        // Show placeholder for removed content in right document
        result += `<span class="git-inline-placeholder" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; font-style: italic; padding: 1px 3px; border-radius: 2px; font-size: 0.9em;">[-${escapeHtml(text.substring(0, 20))}${text.length > 20 ? '...' : ''}]</span>`;
      }
    }
  });
  
  return result;
};

// Text similarity and equality functions
const getTextSimilarity = (text1, text2) => {
  if (!text1 && !text2) return 1;
  if (!text1 || !text2) return 0;
  
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  
  let totalLength = Math.max(text1.length, text2.length);
  let unchangedLength = 0;
  
  diffs.forEach(diff => {
    if (diff[0] === 0) {
      unchangedLength += diff[1].length;
    }
  });
  
  return totalLength > 0 ? unchangedLength / totalLength : 0;
};

const areTextsEqual = (text1, text2) => {
  const normalize = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalize(text1) === normalize(text2);
};

const htmlToDiv = (html) => {
  if (!html) return document.createElement("div");
  
  const d = document.createElement("div");
  try {
    d.innerHTML = html;
  } catch (error) {
    console.warn('Error parsing HTML:', error);
  }
  return d;
};

const extractPlainText = (html) => {
  if (!html) return "";
  
  const tempDiv = document.createElement("div");
  try {
    tempDiv.innerHTML = html;
  } catch (error) {
    console.warn('Error extracting plain text:', error);
    return "";
  }
  return tempDiv.textContent || "";
};

export const renderHtmlDifferences = (diffs) => {
  return diffs.map((d) => d.content).join("");
};

export const highlightDifferences = (diffs) => {
  return diffs
    .map((diff) => {
      switch (diff.type) {
        case "insert":
          return `<span class=\"diff-insert\">${escapeHtml(
            diff.content
          )}</span>`;
        case "delete":
          return `<span class=\"diff-delete\">${escapeHtml(
            diff.content
          )}</span>`;
        default:
          return escapeHtml(diff.content);
      }
    })
    .join("");
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Simplified detailed report generation
export const generateSimpleDetailedReport = (leftLines, rightLines) => {
  try {
    const lines = [];
    const maxLines = Math.max(leftLines.length, rightLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i];
      const rightLine = rightLines[i];
      
      if (leftLine && rightLine) {
        if (areTextsEqual(leftLine.text, rightLine.text)) {
          lines.push({
            v1: String(i + 1),
            v2: String(i + 1),
            status: "UNCHANGED",
            diffHtml: escapeHtml(leftLine.text),
            formatChanges: []
          });
        } else {
          const diffHtml = createInlineDiff(leftLine.text, rightLine.text);
          lines.push({
            v1: String(i + 1),
            v2: String(i + 1),
            status: "MODIFIED",
            diffHtml,
            formatChanges: ["Content modified"]
          });
        }
      } else if (leftLine && !rightLine) {
        lines.push({
          v1: String(i + 1),
          v2: "",
          status: "REMOVED",
          diffHtml: `<span class="git-inline-removed">${escapeHtml(leftLine.text)}</span>`,
          formatChanges: ["Line removed"]
        });
      } else if (!leftLine && rightLine) {
        lines.push({
          v1: "",
          v2: String(i + 1),
          status: "ADDED",
          diffHtml: `<span class="git-inline-added">${escapeHtml(rightLine.text)}</span>`,
          formatChanges: ["Line added"]
        });
      }
    }

    return { lines, tables: [], images: [] };
  } catch (error) {
    console.error('Error generating detailed report:', error);
    return { lines: [], tables: [], images: [] };
  }
};

// Create inline diff for detailed report
const createInlineDiff = (leftText, rightText) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText || "", rightText || "");
  dmp.diff_cleanupSemantic(diffs);
  
  return diffs.map(diff => {
    const [operation, text] = diff;
    const escaped = escapeHtml(text);
    
    if (operation === 1) return `<span class="git-inline-added">${escaped}</span>`;
    if (operation === -1) return `<span class="git-inline-removed">${escaped}</span>`;
    return escaped;
  }).join("");
};

// Compare table content for differences
const compareTableContent = (table1, table2) => {
  if (!table1 || !table2) return false;
  
  const rows1 = table1.querySelectorAll('tr');
  const rows2 = table2.querySelectorAll('tr');
  
  if (rows1.length !== rows2.length) return false;
  
  for (let i = 0; i < rows1.length; i++) {
    const cells1 = rows1[i].querySelectorAll('td, th');
    const cells2 = rows2[i].querySelectorAll('td, th');
    
    if (cells1.length !== cells2.length) return false;
    
    for (let j = 0; j < cells1.length; j++) {
      const text1 = (cells1[j].textContent || '').trim();
      const text2 = (cells2[j].textContent || '').trim();
      if (text1 !== text2) return false;
    }
  }
  
  return true;
};

// Compare image content for differences
const compareImageContent = (img1, img2) => {
  if (!img1 || !img2) return false;
  
  // Compare src, alt, and dimensions
  const src1 = img1.src || img1.getAttribute('src') || '';
  const src2 = img2.src || img2.getAttribute('src') || '';
  const alt1 = img1.alt || '';
  const alt2 = img2.alt || '';
  
  return src1 === src2 && alt1 === alt2;
};