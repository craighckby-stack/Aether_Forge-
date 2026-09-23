export const base64Decode = (str: string): string => {
  if (!str) return '';
  try {
    const binaryString = atob(str.trim());
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    // Fallback for legacy or binary data
    try {
      return decodeURIComponent(atob(str).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (err) {
      return atob(str);
    }
  }
};

export const base64Encode = (str: string): string => {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  const binaryString = String.fromCharCode(...bytes);
  return btoa(binaryString);
};

export const parseRepoPath = (repoString: string): [string, string] | null => {
  if (!repoString) return null;
  const cleanString = repoString
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/\/$/, '')
    .trim();
  const match = cleanString.match(/^([^/]+)\/([^/]+)$/);
  return match ? [match[1], match[2].replace(/\.git$/i, '')] : null;
};

export const cleanAIOutput = (text: string): string => {
  if (!text) return '';

  let cleaned = text.trim();
  
  // Strip starting/ending markdown code fences (e.g. ```javascript ... ```)
  const fenceMatch = cleaned.match(/^\s*```[a-z0-9]*\s*\n?([\s\S]*?)\n?\s*```\s*$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim();
  }

  // Remove common LLM chat headers/commentary patterns
  const preambleRegex = /^(?:Here is the source code|I have refactored the file|The revised content is|I've updated the plan|Here's the complete|Here is the updated|Below is the|The following is|Here's my implementation|```json|```).*?\n+/i;
  cleaned = cleaned.replace(preambleRegex, '');

  // Remove trailing explanatory text that often follows code blocks
  const trailingExplanation = /\n+(?:This should|Let me know|You can|Note:|Explanation:).*$/is;
  cleaned = cleaned.replace(trailingExplanation, '');

  // Final cleanup
  return cleaned.trim();
};

export const normalizeGitHubUrl = (url: string): string => {
  if (!url) return '';
  return url
    .replace(/\.git$/i, '')
    .replace(/\/$/, '');
};
