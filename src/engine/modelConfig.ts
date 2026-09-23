/**
 * Centralized Model Configuration for AetherForge Ω
 * 
 * Defines the fallback cascade for Google Gemini API models.
 */

export const GEMINI_MODEL_CASCADE = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash-exp"
] as const;

export type SupportedGeminiModel = typeof GEMINI_MODEL_CASCADE[number];

export const PRIMARY_MODEL: SupportedGeminiModel = "gemini-2.5-flash";

export interface ModelExecutionMetadata {
  modelUsed: string;
  attemptIndex: number;
  latencyMs: number;
  status: "SUCCESS" | "FALLBACK" | "FAILED";
}
