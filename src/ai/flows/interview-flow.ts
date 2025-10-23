'use server';
/**
 * @fileOverview Implements AI flows for generating interview questions and evaluating answers.
 *
 * - generateInterviewQuestions - A function that creates interview questions based on a job description.
 * - evaluateInterviewAnswer - A function that evaluates a user's answer to a specific question.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for generating interview questions
const GenerateQuestionsInputSchema = z.object({
  jobDescription: z.string().describe('The full job description text.'),
});

const GenerateQuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .length(5)
    .describe(
      'An array of exactly 5 interview questions. The questions must progressively increase in difficulty, from basic screening to more complex, scenario-based ones.'
    ),
});
export type GenerateQuestionsOutput = z.infer<
  typeof GenerateQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  jobDescription: string
): Promise<GenerateQuestionsOutput> {
  return generateInterviewQuestionsFlow({ jobDescription });
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: { schema: GenerateQuestionsInputSchema },
  prompt: `You are a senior hiring manager preparing for an interview. Based on the provided Job Description, generate a list of exactly 5 interview questions. The questions should cover the key skills and responsibilities mentioned. They MUST progressively increase in difficulty:
  - Question 1: A basic introductory or screening question.
  - Questions 2-3: Intermediate questions about specific skills or experiences.
  - Questions 4-5: Advanced, scenario-based, or behavioral questions that require deep thought.

Job Description:
{{{jobDescription}}}

IMPORTANT: After your analysis, output ONLY a single JSON object between the markers <JSON_START> and <JSON_END> with the shape:
<JSON_START>
{"questions": ["q1","q2","q3","q4","q5"]}
<JSON_END>
Do not output any other text or commentary outside the JSON markers.
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
  },
  async (input) => {
    const raw = await generateQuestionsPrompt(input);
    console.debug('[generateInterviewQuestions] - raw model response:', JSON.stringify(raw, null, 2));

    // Helper to unwrap schema-like objects
    const unwrap = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj !== 'object') return obj;
      if (obj.properties && typeof obj.properties === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj.properties)) {
          if (v && typeof v === 'object' && 'value' in v) out[k] = v.value;
          else out[k] = unwrap(v);
        }
        return out;
      }
      if ('value' in obj && Object.keys(obj).length === 1) return obj.value;
      if (Array.isArray(obj)) return obj.map(unwrap);
      const res: any = {};
      for (const [k, v] of Object.entries(obj)) res[k] = unwrap(v);
      return res;
    };

    const maybe = raw && typeof raw === 'object' && 'output' in raw ? raw.output : raw;
    const normalized = unwrap(maybe);
    console.debug('[generateInterviewQuestions] - normalized:', JSON.stringify(normalized, null, 2));

    // Prefer explicit JSON blocks: <JSON_START>...</JSON_END>, ```json``` or trailing JSON
    const rawStr = JSON.stringify(raw);
    const findJsonBlock = (s: string) => {
      const jsonRe1 = /<JSON_START>[\s\S]*?<JSON_END>/i;
      const m1 = s.match(jsonRe1);
      if (m1) {
        const inner = m1[0].replace(/<JSON_START>|<JSON_END>/gi, '');
        try { return JSON.parse(inner); } catch { return null; }
      }
      const fenced = /```json\s*([\s\S]*?)```/i.exec(s);
      if (fenced) {
        try { return JSON.parse(fenced[1]); } catch { /* fallthrough */ }
      }
      // trailing JSON object
      const trailing = /({[\s\S]*})\s*$/m.exec(s);
      if (trailing) {
        try { return JSON.parse(trailing[1]); } catch { /* fallthrough */ }
      }
      return null;
    };

    const maybeFromText = (() => {
      // Build a readable text string from available raw structures. Prefer
      // raw.message.content (array of {text}) when present — Genkit returns
      // that shape for many local models.
      let s = '';
      try {
        if (raw && typeof raw === 'object' && (raw as any).message && Array.isArray((raw as any).message.content)) {
          const parts: string[] = [];
          for (const c of (raw as any).message.content) {
            if (!c) continue;
            if (typeof c === 'string') parts.push(c);
            else if (c.text) parts.push(String(c.text));
            else parts.push(JSON.stringify(c));
          }
          s = parts.join('\n\n');
        } else if (normalized && typeof normalized === 'string') s = normalized;
        else s = rawStr;
      } catch (e) {
        s = rawStr;
      }

      // Prefer explicit JSON blocks
      const js = findJsonBlock(s);
      if (js && js.questions && Array.isArray(js.questions)) return js.questions;

      // 1) Look for 'Question N' headers and take the following non-empty line as the question text
      const lines = s.split(/\r?\n/).map(l => l.trim());
      const qs: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/Question\s*\d+\b[:\-\)]?\s*(.*)/i);
        if (headerMatch) {
          // If header contains a question text after the label, use it
          if (headerMatch[1] && headerMatch[1].includes('?')) qs.push(headerMatch[1].trim());
          // otherwise, take next non-empty line that looks like a question
          else {
            for (let j = i+1; j < Math.min(i+4, lines.length); j++) {
              const cand = lines[j];
              if (!cand) continue;
              if (cand.endsWith('?') || cand.length > 20) { qs.push(cand.replace(/^\*+/, '').trim()); break; }
            }
          }
        }
      }

      // 2) Fallback: extract numbered or bulleted lines or lines ending with '?'
      if (qs.length < 5) {
        for (const line of lines) {
          if (!line) continue;
          const mNum = line.match(/^\d+\.\s*(.*)$/);
          if (mNum) qs.push(mNum[1].trim());
          else if (/^[\-*\u2022\+]\s+/.test(line)) qs.push(line.replace(/^[\-*\u2022\+]\s+/, '').trim());
          else if (line.length > 20 && line.endsWith('?')) qs.push(line);
          if (qs.length >= 5) break;
        }
      }

      return qs.slice(0,5);
    })();

  const finalQuestions = maybeFromText && maybeFromText.length === 5 ? maybeFromText : (normalized && (normalized as any).questions ? (normalized as any).questions : undefined);

    // Final defensive: if we still don't have 5 questions, try to extract any strings from normalized
    let result: any = finalQuestions;
    if (!result || !Array.isArray(result) || result.length !== 5) {
      if (normalized && typeof normalized === 'object') {
        const candidates: string[] = [];
        const collectStrings = (o: any) => {
          if (!o) return;
          if (typeof o === 'string' && o.length > 20 && o.endsWith('?')) candidates.push(o);
          if (Array.isArray(o)) o.forEach(collectStrings);
          if (typeof o === 'object') Object.values(o).forEach(collectStrings);
        };
        collectStrings(normalized);
        if (candidates.length >= 5) result = candidates.slice(0,5);
      }
    }

    if (!result || !Array.isArray(result) || result.length !== 5) {
      const err: any = new Error('Failed to extract 5 questions from model response');
      err.raw = raw;
      err.normalized = normalized;
      throw err;
    }

    console.debug('[generateInterviewQuestions] - extracted questions:', JSON.stringify(result, null, 2));

    // Validate with Zod
    const validated = GenerateQuestionsOutputSchema.parse({ questions: result });
    return validated;
  }
);

// Schema for evaluating a single interview answer
const EvaluateAnswerInputSchema = z.object({
  jobDescription: z.string().describe('The full job description text.'),
  question: z.string().describe('The interview question that was asked.'),
  userAnswer: z.string().describe("The user's answer to the question."),
});

const EvaluateAnswerOutputSchema = z.object({
  score: z
    .number()
    .describe(
      'A score from 1 to 10 for the answer, based on relevance, clarity, and technical accuracy.'
    ),
  feedback: z
    .string()
    .describe(
      'Constructive feedback on the answer, highlighting strengths and areas for improvement.'
    ),
});
export type EvaluateAnswerOutput = z.infer<typeof EvaluateAnswerOutputSchema>;

export async function evaluateInterviewAnswer(
  input: z.infer<typeof EvaluateAnswerInputSchema>
): Promise<EvaluateAnswerOutput> {
  return evaluateInterviewAnswerFlow(input);
}

const evaluateAnswerPrompt = ai.definePrompt({
  name: 'evaluateAnswerPrompt',
  input: { schema: EvaluateAnswerInputSchema },
  prompt: `You are an expert interviewer evaluating a candidate's response. Analyze the user's answer in the context of the Job Description and the specific Question asked.

Your evaluation should be fair and constructive. Avoid being overly harsh for minor omissions, but remain realistic about the quality of the answer. A good answer is clear, relevant, and demonstrates the skills required in the job description.

Job Description:
{{{jobDescription}}}

Question Asked:
"{{{question}}}"

User's Answer:
"{{{userAnswer}}}"

IMPORTANT: After your evaluation, output ONLY a single JSON object between the markers <JSON_START> and <JSON_END> with the shape:
<JSON_START>
{"score": 7, "feedback": "concise feedback text"}
<JSON_END>
Do not output any other text or commentary outside the JSON markers.
`,
});

const evaluateInterviewAnswerFlow = ai.defineFlow(
  {
    name: 'evaluateInterviewAnswerFlow',
    inputSchema: EvaluateAnswerInputSchema,
  },
  async (input) => {
    const raw = await evaluateAnswerPrompt(input);
    console.debug('[evaluateInterviewAnswer] - raw:', JSON.stringify(raw, null, 2));

    const unwrap = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj !== 'object') return obj;
      if (obj.properties && typeof obj.properties === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj.properties)) {
          if (v && typeof v === 'object' && 'value' in v) out[k] = v.value;
          else out[k] = unwrap(v);
        }
        return out;
      }
      if ('value' in obj && Object.keys(obj).length === 1) return obj.value;
      if (Array.isArray(obj)) return obj.map(unwrap);
      const res: any = {};
      for (const [k, v] of Object.entries(obj)) res[k] = unwrap(v);
      return res;
    };

    const maybe = raw && typeof raw === 'object' && 'output' in raw ? raw.output : raw;
    const normalized = unwrap(maybe);
    console.debug('[evaluateInterviewAnswer] - normalized:', JSON.stringify(normalized, null, 2));

    // Prefer JSON blocks in text
    const rawStr = typeof normalized === 'string' ? normalized : JSON.stringify(raw);
    const fenced = /```json\s*([\s\S]*?)```/i.exec(rawStr);
    if (fenced) {
      try {
        const parsed = JSON.parse(fenced[1]);
        return EvaluateAnswerOutputSchema.parse(parsed);
      } catch (e) {
        // fallthrough
      }
    }

    // If normalized is an object with score & feedback, use it
    if (normalized && typeof normalized === 'object' && 'score' in normalized && 'feedback' in normalized) {
      try {
        return EvaluateAnswerOutputSchema.parse(normalized);
      } catch (e) {
        // fallthrough to text parsing
      }
    }

    // Fallback: extract numeric score and feedback from text
    try {
      const text = typeof normalized === 'string' ? normalized : JSON.stringify(raw);
      const scoreMatch = text.match(/score\s*[:\-]?\s*(\d(?:\.\d)?)/i) || text.match(/(\d(?:\.\d)?)\s*\/\s*10/);
      const score = scoreMatch ? Math.max(1, Math.min(10, Math.round(Number(scoreMatch[1])))) : 0;
      const feedback = (text.split(/\n\n/).slice(0, 3).join('\n')).trim();
      if (score > 0 && feedback) {
        return EvaluateAnswerOutputSchema.parse({ score, feedback });
      }
    } catch (e) {
      // continue to error
    }

    const err: any = new Error('Failed to parse evaluation response from model');
    err.raw = raw;
    err.normalized = normalized;
    throw err;
  }
);
