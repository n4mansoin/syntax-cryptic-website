'use server';
/**
 * @fileOverview This file implements a Genkit flow for detecting suspicious activity patterns from team attempts.
 *
 * - detectSuspiciousActivity - A function that handles the suspicious activity detection process.
 * - DetectSuspiciousActivityInput - The input type for the detectSuspiciousActivity function.
 * - DetectSuspiciousActivityOutput - The return type for the detectSuspiciousActivity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AttemptSchema = z.object({
  levelId: z.number().describe('The ID of the level for this attempt.'),
  timestamp: z.string().describe('The ISO timestamp when the attempt was made.'),
  isCorrect: z.boolean().describe('Whether the attempt was correct.'),
  ip: z.string().optional().describe('The IP address from which the attempt was made.'),
});

const DetectSuspiciousActivityInputSchema = z.object({
  teamId: z.string().describe('The ID of the team being evaluated.'),
  currentLevel: z.number().describe("The team's current solved level."),
  flagCount: z.number().describe('The current number of flags against the team.'),
  penaltyUntil: z.string().nullable().describe('The ISO timestamp until which the team is penalized, or null if no penalty.'),
  recentAttempts: z.array(AttemptSchema).describe('An array of recent attempts made by the team.'),
});
export type DetectSuspiciousActivityInput = z.infer<typeof DetectSuspiciousActivityInputSchema>;

const DetectSuspiciousActivityOutputSchema = z.object({
  isSuspicious: z.boolean().describe('True if the activity is deemed suspicious, false otherwise.'),
  reason: z.string().describe('A detailed explanation of why the activity is considered suspicious, or why it is not.'),
  suggestedAction: z.enum(['manual_review', 'apply_penalty', 'flag_team', 'no_action_needed']).describe('Suggested administrative action based on the detection.'),
});
export type DetectSuspiciousActivityOutput = z.infer<typeof DetectSuspiciousActivityOutputSchema>;

export async function detectSuspiciousActivity(input: DetectSuspiciousActivityInput): Promise<DetectSuspiciousActivityOutput> {
  return detectSuspiciousActivityFlow(input);
}

const detectSuspiciousActivityPrompt = ai.definePrompt({
  name: 'detectSuspiciousActivityPrompt',
  input: { schema: DetectSuspiciousActivityInputSchema },
  output: { schema: DetectSuspiciousActivityOutputSchema },
  prompt: `You are an intelligent assistant for a cryptic hunt game. Your task is to analyze recent team attempt data and identify any suspicious activity patterns that might indicate cheating or system abuse.

Consider the following patterns as potentially suspicious:
- Unusually high attempt rates: Many attempts within a short period (e.g., more than 10 attempts in 5 minutes).
- Rapid consecutive failures across multiple levels: A team failing very quickly on different levels without successfully solving any in between.
- Rapid progress: Solving multiple levels in an unusually short amount of time, especially if the previous attempts were also very fast failures.
- Attempts from disparate IP addresses in short succession: Multiple attempts from significantly different IP addresses within a very short timeframe might suggest multiple people on one account, or account sharing.
- Activity while under penalty: Attempts made or system interactions observed during an active penalty period.

Analyze the provided team data and recent attempts to determine if the activity is suspicious. Provide a clear reason for your determination and suggest an appropriate action.

Team ID: {{{teamId}}}
Current Level: {{{currentLevel}}}
Flag Count: {{{flagCount}}}
Penalty Until: {{{penaltyUntil}}}

Recent Attempts:
{{#if recentAttempts}}
{{#each recentAttempts}}
- Level: {{this.levelId}}, Correct: {{this.isCorrect}}, Timestamp: {{this.timestamp}}{{#if this.ip}}, IP: {{this.ip}}{{/if}}
{{/each}}
{{else}}
No recent attempts provided.
{{/if}}

Based on the above information, determine if the activity is suspicious.`,
});

const detectSuspiciousActivityFlow = ai.defineFlow(
  {
    name: 'detectSuspiciousActivityFlow',
    inputSchema: DetectSuspiciousActivityInputSchema,
    outputSchema: DetectSuspiciousActivityOutputSchema,
  },
  async (input) => {
    const { output } = await detectSuspiciousActivityPrompt(input);
    return output!;
  }
);
