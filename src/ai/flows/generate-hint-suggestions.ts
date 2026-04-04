'use server';
/**
 * @fileOverview An AI assistant flow that generates cryptic hints based on a question and its answer.
 *
 * - generateHintSuggestions - A function that handles the hint generation process.
 * - GenerateHintSuggestionsInput - The input type for the generateHintSuggestions function.
 * - GenerateHintSuggestionsOutput - The return type for the generateHintSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHintSuggestionsInputSchema = z.object({
  question: z.string().describe('The question for which hints are needed.'),
  answer: z.string().describe('The correct answer to the question.'),
});
export type GenerateHintSuggestionsInput = z.infer<typeof GenerateHintSuggestionsInputSchema>;

const GenerateHintSuggestionsOutputSchema = z.object({
  hints: z.array(z.string()).describe('An array of cryptic hints related to the question and answer.'),
});
export type GenerateHintSuggestionsOutput = z.infer<typeof GenerateHintSuggestionsOutputSchema>;

export async function generateHintSuggestions(
  input: GenerateHintSuggestionsInput
): Promise<GenerateHintSuggestionsOutput> {
  return generateHintSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHintSuggestionsPrompt',
  input: {schema: GenerateHintSuggestionsInputSchema},
  output: {schema: GenerateHintSuggestionsOutputSchema},
  prompt: `You are an AI assistant for a cryptic hunt game called "INTRA SYNTAX CRYPTIC".
Your task is to generate several cryptic and challenging hints for a given level's question and its correct answer.
These hints should guide players subtly towards the answer without giving it away directly. Make them clever and thought-provoking.

Question: {{{question}}}
Answer: {{{answer}}}

Generate 3-5 distinct cryptic hints based on the above information.
`,
});

const generateHintSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateHintSuggestionsFlow',
    inputSchema: GenerateHintSuggestionsInputSchema,
    outputSchema: GenerateHintSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
