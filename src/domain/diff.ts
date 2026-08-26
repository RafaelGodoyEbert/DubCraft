export interface DiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Computes a simple word-based diff between original and proposed text.
 * Clean, lightweight, zero-dependency implementation.
 */
export function computeWordDiff(oldText: string, newText: string): DiffChunk[] {
  if (!oldText) {
    return [{ value: newText, added: true }];
  }
  if (!newText) {
    return [{ value: oldText, removed: true }];
  }
  if (oldText === newText) {
    return [{ value: oldText }];
  }

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Simple Longest Common Subsequence (LCS) matrix for clean diff
  const dp: number[][] = Array(oldWords.length + 1)
    .fill(0)
    .map(() => Array(newWords.length + 1).fill(0));

  for (let i = 0; i < oldWords.length; i++) {
    for (let j = 0; j < newWords.length; j++) {
      if (oldWords[i] === newWords[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const chunks: DiffChunk[] = [];
  let i = oldWords.length;
  let j = newWords.length;

  const rawChunks: DiffChunk[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      rawChunks.push({ value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawChunks.push({ value: newWords[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawChunks.push({ value: oldWords[i - 1], removed: true });
      i--;
    }
  }

  rawChunks.reverse();

  // Merge consecutive chunks with same status
  for (const chunk of rawChunks) {
    if (chunks.length === 0) {
      chunks.push({ ...chunk });
    } else {
      const last = chunks[chunks.length - 1];
      if (
        Boolean(last.added) === Boolean(chunk.added) &&
        Boolean(last.removed) === Boolean(chunk.removed)
      ) {
        last.value += chunk.value;
      } else {
        chunks.push({ ...chunk });
      }
    }
  }

  return chunks;
}
