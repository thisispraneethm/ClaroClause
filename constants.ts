// Set a reasonable limit (e.g., 100KB) to prevent client-side DoS
export const MAX_TEXT_LENGTH = 100000;

// A combined length limit for the comparison tool is added to prevent API errors
// when comparing two large documents that would otherwise exceed the model's context window.
export const MAX_COMPARE_TEXT_LENGTH = 150000;