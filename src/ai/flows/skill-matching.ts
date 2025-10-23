'use server';
/**
 * @fileOverview Implements AI skill matching between a resume and a job description.
 *
 * - analyzeSkills - A function that analyzes skills in a resume against a job description.
 * - AnalyzeSkillsInput - The input type for the analyzeSkills function.
 * - AnalyzeSkillsOutput - The return type for the analyzeSkills function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Simple ATS-style skill extractor: matches common skills/technologies from text.
const COMMON_SKILLS = [
  'javascript','typescript','react','vue','angular','next.js','node.js','express','django','flask','python','java','c++','c','mongodb','mysql','postgresql','sql','docker','kubernetes','aws','azure','gcp','git','jenkins','ci/cd','rest','graphql','html','css','tailwind','material ui','opencv','tensorflow','pytorch'
];

function extractSkillsFromText(text: string) {
  const t = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of COMMON_SKILLS) {
    if (t.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

// Compute a deterministic server score for transparency and strict matching.
export async function computeServerScoreFor(inputObj: any) {
  const categorizeSkill = (s: string) => {
    const sLower = s.toLowerCase();
    if (/react|vue|angular|next/.test(sLower)) return 'frontend';
    if (/node|express|django|flask|rails/.test(sLower)) return 'backend';
    if (/sql|postgres|mysql|mongodb|hadoop|spark|etl|data|pytorch|tensorflow|scikit/.test(sLower)) return 'data';
    if (/docker|kubernetes|ci\/cd|jenkins|aws|azure|gcp|s3|cloud/.test(sLower)) return 'infra';
    return 'other';
  };

  const obj = Object.assign({}, inputObj);
  let matching = Array.isArray(obj.matchingSkills) ? obj.matchingSkills.length : 0;
  if ((!matching || matching === 0) && obj._input) {
    const resumeSkills = extractSkillsFromText(String(obj._input.resume || ''));
    const jdSkills = extractSkillsFromText(String(obj._input.jobDescription || ''));
    const inter = jdSkills.filter((s: string) => resumeSkills.includes(s));
    matching = inter.length;
    obj.matchingSkills = inter;
  }

  const categories: Record<string, number> = { frontend: 0, backend: 0, data: 0, infra: 0, other: 0 };
  if (Array.isArray(obj.matchingSkills)) {
    for (const s of obj.matchingSkills) {
      const cat = categorizeSkill(String(s));
      categories[cat] = (categories[cat] || 0) + 1;
    }
  }

  const perSkillWeight = 12;
  let score = Math.min(100, Math.round(matching * perSkillWeight));
  if (obj.impliedSkills && String(obj.impliedSkills).trim().length > 30 && matching >= 2) score += 2;
  const missing = Array.isArray(obj.missingSkills) ? obj.missingSkills.length : 0;
  score = Math.max(0, score - Math.min(20, missing * 2));

  const jdText = String(obj._input?.jobDescription || '').toLowerCase();
  const jdWantsFrontend = /frontend|react|vue|angular|next/.test(jdText);
  const jdWantsBackend = /backend|node|express|django|flask|api|rest/.test(jdText);
  if (jdWantsFrontend && jdWantsBackend) {
    const hasFrontend = categories.frontend > 0;
    const hasBackend = categories.backend > 0;
    if (!hasFrontend || !hasBackend) {
      score = Math.min(score, 45);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    reason: `Computed from ${matching} direct matches (perSkill=${perSkillWeight}), missing=${missing}, categories=${JSON.stringify(categories)}`,
  };
};

const AnalyzeSkillsInputSchema = z.object({
  jobDescription: z.string().describe('The job description for the role.'),
  resume: z.string().describe('The text content of the resume.'),
});
export type AnalyzeSkillsInput = z.infer<typeof AnalyzeSkillsInputSchema>;

const AnalyzeSkillsOutputSchema = z.object({
  matchScore: z
    .number()
    .describe('Match score (0–100) between the resume and job description.'),
  scoreRationale: z
    .string()
    .describe('Explanation of the score, referencing core vs. preferred skills and project quality.'),
  matchingSkills: z
    .array(z.string())
    .describe('Skills required by the job and found in the resume (explicitly or via mapping).'),
  missingSkills: z
    .array(z.string())
    .describe('Skills required by the job but missing from the resume.'),
  impliedSkills: z
    .string()
    .describe(
      'Brief narrative of inferred skills with examples. Ex: "Built REST API with Express.js → implies Node.js & API Development."'
    ),
  status: z
    .string()
    .describe('Status based on match score: "Approved", "Needs Improvement", or "Not a Match".'),
});
export type AnalyzeSkillsOutput = z.infer<typeof AnalyzeSkillsOutputSchema>;

export async function analyzeSkills(
  input: AnalyzeSkillsInput
): Promise<AnalyzeSkillsOutput> {
  return analyzeSkillsFlow(input);
}

const analyzeSkillsPrompt = ai.definePrompt({
  name: 'analyzeSkillsPrompt',
  input: { schema: AnalyzeSkillsInputSchema },
  // NOTE: we intentionally do NOT pass an output schema to Genkit here. Some
  // LLMs (especially local/varied models) may return a JSON-Schema-like wrapper
  // instead of a plain JSON object; Genkit's automatic validation would reject
  // that before we can normalize it. We'll accept the raw response, normalize
  // it server-side, and validate with Zod below.
  prompt: `You are an expert AI career analyst with the critical eye of a senior hiring manager. Perform a harsh, realistic analysis of the Resume against the Job Description. Focus only on the skills, technologies, and experience explicitly required for the role.

Follow these steps:

1. **Job Description Analysis**
   - Extract required skills and group them as:
     - Core Requirements (must-have for the role)
     - Preferred Skills (secondary / nice-to-have)

2. **Resume Analysis**
   - Identify all direct skills from the resume.
   - **Apply Conceptual Mapping & Skill Equivalency:** This is critical. Map related technologies to the required skills.
     - (e.g., MongoDB in resume -> maps to NoSQL requirement).
     - (e.g., Express.js in resume -> maps to Node.js requirement).
     - **(e.g., Jenkins + Docker + AWS/Azure in resume -> strongly implies CI/CD Pipeline experience).**
     - **(e.g., Experience with Django in resume -> should be considered equivalent or very similar to FastAPI if the project context is building APIs).**
   - Evaluate Project & Accomplishment Quality: distinguish between meaningful usage vs. keyword listing.

3. **Implied Skills**
   - Write a concise narrative (\`impliedSkills\`) describing inferred skills with concrete examples from the resume.

4. **Gap Analysis**
   - Matching Skills: list skills that overlap between the JD (Core/Preferred) and the Resume (direct, mapped, or implied).
   - Missing Skills: list skills required in the JD but are genuinely absent from the Resume, even after conceptual mapping.

5. **Weighted Match Score**
   - Core skills weigh most.
   - Penalize missing skills proportionally to importance; reduce penalty for close equivalents (like Django for FastAPI).
   - Ignore irrelevant skills not tied to the JD.
   - Apply a Project Quality Multiplier (strong relevant projects = higher score).
   - Return integer \`matchScore\` (0–100).

6. **Status**
   - 75–100 → Approved
   - 50–74 → Needs Improvement
   - 0–49 → Not a Match

Return output strictly in the defined schema.

Below are two short examples (few-shot) showing the exact final JSON-only output expected. Use these as style guides when producing the final JSON. After the examples, analyze the provided JD + Resume and produce the JSON block only.

EXAMPLE 1 (Full Stack mismatch):
Job Description: Full Stack role (React, Node.js, REST APIs, Postgres)
Resume: Data Scientist (Python, Flask, SQL, Docker) - mentions REST APIs via Flask and Dockerized model-serving but no React or Node backend experience.
Expected final JSON (only):
<JSON_START>
{"matchScore":40,"scoreRationale":"Resume shows backend/data engineering strengths (Flask, Docker, SQL) and small API experience but lacks required frontend (React) and Node/Express experience. Penalized heavily for missing core frontend/backend coverage.","matchingSkills":["REST APIs","Docker","PostgreSQL"],"missingSkills":["React","Node.js/Express","Frontend testing"],"impliedSkills":"Demonstrated backend/API development and deployment experience; implies ability to work with web backend frameworks.","status":"Needs Improvement"}
<JSON_END>

EXAMPLE 2 (Good Full Stack match):
Job Description: Full Stack role (React, Next.js, Node.js, REST APIs)
Resume: Experienced Full Stack Dev (React, Next.js, Node.js, Express, PostgreSQL, Docker)
Expected final JSON (only):
<JSON_START>
{"matchScore":92,"scoreRationale":"Strong direct matches for frontend (React/Next.js) and backend (Node.js/Express) plus DB and deployment experience. Minor missing preferred skills.","matchingSkills":["React","Next.js","Node.js","Express","PostgreSQL","Docker"],"missingSkills":["CI/CD pipeline (Jenkins)"],"impliedSkills":"Shows end-to-end application development; likely able to own full stack features.","status":"Approved"}
<JSON_END>

Job Description:
{{{jobDescription}}}

Resume:
{{{resume}}}

IMPORTANT: After the analysis above, on a new line OUTPUT ONLY a single JSON object
and nothing else. The JSON must contain these keys: matchScore (number),
scoreRationale (string), matchingSkills (array of strings), missingSkills (array
of strings), impliedSkills (string), status (string). Print the JSON between the literal
markers <JSON_START> and <JSON_END> on their own lines. Do NOT output any other text.
`,
});

// NOTE: We instruct the model (in the prompt above) to emit a single JSON
// object as the final line. We still handle human-readable outputs defensively
// server-side in case the model ignores the instruction.

const analyzeSkillsFlow = ai.defineFlow(
  {
    name: 'analyzeSkillsFlow',
    inputSchema: AnalyzeSkillsInputSchema,
    // We don't pass an outputSchema to Genkit here; we'll parse & validate
    // manually so we can handle schema-wrapped responses gracefully.
  },
  async input => {
  // Run the prompt and accept the raw response (may be under .output or the
  // direct return depending on Genkit runtime). We'll attempt to read both.
  const raw = await analyzeSkillsPrompt(input);
  console.debug('[analyzeSkills] - raw model response:', JSON.stringify(raw, null, 2));
    const maybeOutput = raw && typeof raw === 'object' && 'output' in raw ? raw.output : raw;

    // Unwrap helper: handle JSON-Schema-like wrappers and simple { value: ... }
    const unwrapSchema = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj !== 'object') return obj;

      if (obj.properties && typeof obj.properties === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj.properties)) {
          if (v && typeof v === 'object' && 'value' in v) {
            out[k] = v.value;
          } else {
            out[k] = unwrapSchema(v);
          }
        }
        console.warn('[analyzeSkills] - Unwrapped schema-like response from model');
        return out;
      }

      if ('value' in obj && Object.keys(obj).length === 1) return obj.value;

      if (Array.isArray(obj)) return obj.map(unwrapSchema);
      const res: any = {};
      for (const [k, v] of Object.entries(obj)) {
        res[k] = unwrapSchema(v);
      }
      return res;
    };

    // (removed accidental inner export)

  const normalized = unwrapSchema(maybeOutput);
  console.debug('[analyzeSkills] - normalized output:', JSON.stringify(normalized, null, 2));

    // If model returned a raw string, try to parse JSON.
    let parsed: any = normalized;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        console.warn('[analyzeSkills] - model output was string but not JSON; returning error');
        throw new Error('Model did not return valid JSON');
      }
    }

    // Before validating, attempt to extract expected fields from a variety of
    // wrapper shapes (schema.properties.value, direct fields, nested strings).
    const extract = (key: string) => {
      // direct
      if (parsed && typeof parsed === 'object' && key in parsed) return (parsed as any)[key];
      // normalized.properties.key.value
      const _norm: any = normalized as any;
      if (_norm && _norm.properties && _norm.properties[key] && 'value' in _norm.properties[key]) {
        return _norm.properties[key].value;
      }
      // raw.properties.key.value
      const _raw: any = raw as any;
      if (_raw && _raw.properties && _raw.properties[key] && 'value' in _raw.properties[key]) {
        return _raw.properties[key].value;
      }
      // raw[key].value
      if (_raw && _raw[key] && typeof _raw[key] === 'object' && 'value' in _raw[key]) return _raw[key].value;
      // fallback null
      return undefined;
    };

    const finalObj: any = {
      matchScore: extract('matchScore') ?? 0,
      scoreRationale: extract('scoreRationale') ?? (typeof parsed === 'string' ? parsed : '') ,
      matchingSkills: extract('matchingSkills') ?? [],
      missingSkills: extract('missingSkills') ?? [],
      impliedSkills: extract('impliedSkills') ?? '',
      status: extract('status') ?? undefined,
    };

    // If status wasn't supplied, compute from matchScore
    if (!finalObj.status) {
      const sc = Number(finalObj.matchScore) || 0;
      if (sc >= 75) finalObj.status = 'Approved';
      else if (sc >= 50) finalObj.status = 'Needs Improvement';
      else finalObj.status = 'Not a Match';
    }

    console.debug('[analyzeSkills] - final object before validation:', JSON.stringify(finalObj, null, 2));

    // If we still don't have useful fields, try to parse the raw text output
    // returned by the model (many models return human-readable analysis).
    const tryExtractFromText = (rawResp: any) => {
      try {
        const parts: string[] = [];
        // Genkit's response may nest message.content -> array of { text }
        if (rawResp && typeof rawResp === 'object') {
          const msg = (rawResp as any).message;
          if (msg && Array.isArray(msg.content)) {
            for (const c of msg.content) {
              if (typeof c === 'string') parts.push(c);
              else if (c && typeof c === 'object' && 'text' in c) parts.push(String(c.text));
              else if (c && typeof c === 'object') parts.push(JSON.stringify(c));
            }
          } else if (Array.isArray(rawResp)) {
            for (const item of rawResp) parts.push(String(item));
          } else if ('text' in rawResp) parts.push(String((rawResp as any).text));
        }
        const rawText = parts.join('\n\n');
        // 1) Look for explicit JSON sentinel block
        const sentinel = rawText.match(/<JSON_START>\s*([\s\S]*?)\s*<JSON_END>/m);
        if (sentinel) {
          try {
            const parsedJson = JSON.parse(sentinel[1]);
            return {
              matchScore: parsedJson.matchScore,
              status: parsedJson.status,
              matchingSkills: parsedJson.matchingSkills,
              missingSkills: parsedJson.missingSkills,
              impliedSkills: parsedJson.impliedSkills ?? JSON.stringify(parsedJson.impliedSkills || '', null, 2),
            };
          } catch (e) {
            // ignore and continue
          }
        }

        // 2) If model included a fenced JSON block, prefer it.
        const fencedJson = rawText.match(/```json\s*([\s\S]*?)```/i);
        if (fencedJson) {
          try {
            const parsedJson = JSON.parse(fencedJson[1]);
            return {
              matchScore: parsedJson.matchScore,
              status: parsedJson.status,
              matchingSkills: parsedJson.matchingSkills,
              missingSkills: parsedJson.missingSkills,
              impliedSkills: parsedJson.impliedSkills ?? JSON.stringify(parsedJson.impliedSkills || '', null, 2),
            };
          } catch (e) {
            // ignore parse error and continue
          }
        }

        // 3) Try to find a trailing JSON object in the text (last {...} block)
        const trailingJson = rawText.match(/(\{[\s\S]*\})\s*$/m);
        if (trailingJson) {
          try {
            const parsedJson = JSON.parse(trailingJson[1]);
            return {
              matchScore: parsedJson.matchScore,
              status: parsedJson.status,
              matchingSkills: parsedJson.matchingSkills,
              missingSkills: parsedJson.missingSkills,
              impliedSkills: parsedJson.impliedSkills ?? JSON.stringify(parsedJson.impliedSkills || '', null, 2),
            };
          } catch (e) {
            // ignore parse error and continue
          }
        }
        if (!rawText) return null;

        // matchScore: try several heuristics. Look for explicit 'Match Score' or
        // 'Weighted Match Score' labels, an equals followed by a number, an '≈'
        // approximation, or as a last resort pick the last integer between 0-100.
        let ms: number | undefined;
        const tryNumber = (s: string | null) => {
          if (!s) return undefined;
          const m = s.match(/(\d{1,3})(?:\.\d+)?/);
          if (m) return Number(m[1]);
          return undefined;
        };

        // 1) Match Score: 14
        const mExplicit = rawText.match(/Match\s*Score\s*[:\-]?\s*\*{0,2}(\d{1,3})\*{0,2}/i);
        if (mExplicit) ms = Number(mExplicit[1]);

        // 2) '≈ 14' or '= 13.56 ≈ 14'
        if (ms == null) {
          const mApprox = rawText.match(/≈\s*(\d{1,3})/);
          if (mApprox) ms = Number(mApprox[1]);
        }

        // 3) equals pattern like '= 13.56' -> take nearest integer following '='

        // status: look for 'Status' label
        let status: string | undefined;
        const st = rawText.match(/\*\*Status\*\*:\s*([A-Za-z ]{2,20})/i) || rawText.match(/Status:\s*([A-Za-z ]{2,20})/i);
        if (st) status = st[1].trim();

        // matchingSkills and missingSkills: extract between headers
        const extractListBetween = (text: string, startLabel: string, endLabel: string) => {
          const re = new RegExp(startLabel + '[\s\S]*?' + endLabel, 'i');
          const m = text.match(re);
          const list: string[] = [];
          if (!m) return list;
          const block = m[0];
          // capture lines that look like bullets
          const lines = block.split(/[\r\n]+/).map(l => l.trim());
          for (const line of lines) {
            const bullet = line.replace(/^[-*\t\u2022\+]+\s*/, '').trim();
            if (!bullet) continue;
            // stop on the header line itself
            if (/^matching skills[:]?/i.test(line) || /^missing skills[:]?/i.test(line)) continue;
            if (/^\*\*/.test(line)) continue;
            // include lines that look like items (contain letters & maybe commas)
            if (/[A-Za-z]/.test(bullet) && bullet.length < 200) list.push(bullet.replace(/^\+\s*/, '').replace(/^•\s*/, '').trim());
          }
          return Array.from(new Set(list));
        };

        const matching = extractListBetween(rawText, 'Matching Skills:', 'Missing Skills:');
        const missing = extractListBetween(rawText, 'Missing Skills:', '\*\*Weighted Match Score\*\*|Weighted Match Score|\*\*Weighted Match Score\*\*');

        // impliedSkills: try to capture any code block labeled impliedSkills or python dict
        let implied = '';
        const impliedRe = /```(?:python)?[\s\S]*?impliedSkills\s*=\s*({[\s\S]*?})[\s\S]*?```/i;
        const im = rawText.match(impliedRe);
        if (im) {
          try {
            // naive: convert single quotes to double and parse JSON-like dict
            const maybe = im[1].replace(/([A-Za-z0-9_\-]+)\s*:/g, '"$1":').replace(/'/g, '"');
            implied = JSON.stringify(JSON.parse(maybe), null, 2);
          } catch (e) {
            // fallback: include the raw code block
            implied = im[1];
          }
        } else if (normalized && typeof normalized === 'object' && Object.keys(normalized).length > 0) {
          // If normalization produced a dict-like implied skills, stringify it.
          implied = JSON.stringify(normalized, null, 2);
        }

        return {
          matchScore: ms,
          status,
          matchingSkills: matching,
          missingSkills: missing,
          impliedSkills: implied,
        };
      } catch (err) {
        return null;
      }
    };

    if ((finalObj.matchScore === 0 || !finalObj.matchScore) && (!finalObj.matchingSkills || finalObj.matchingSkills.length === 0)) {
      const extracted = tryExtractFromText(raw as any);
      if (extracted) {
        if (extracted.matchScore != null) finalObj.matchScore = extracted.matchScore;
        if (extracted.status) finalObj.status = extracted.status;
        if (extracted.matchingSkills && extracted.matchingSkills.length) finalObj.matchingSkills = extracted.matchingSkills;
        if (extracted.missingSkills && extracted.missingSkills.length) finalObj.missingSkills = extracted.missingSkills;
        if (extracted.impliedSkills) finalObj.impliedSkills = extracted.impliedSkills;
      }
    }
    console.debug('[analyzeSkills] - final object AFTER extraction:', JSON.stringify(finalObj, null, 2));

    // Server-side deterministic scoring fallback / strict mode.
    // Use this when the model's score is missing/unreliable or when
    // STRICT_MATCHING=true is set in the environment. This prevents the LLM
    // from inflating scores based on loose mapping or high project multipliers.
    const STRICT = process.env.STRICT_MATCHING === 'true';

    const categorizeSkill = (s: string) => {
      const sLower = s.toLowerCase();
      if (/react|vue|angular|next/.test(sLower)) return 'frontend';
      if (/node|express|django|flask|rails/.test(sLower)) return 'backend';
      if (/sql|postgres|mysql|mongodb|hadoop|spark|spark|etl|data|pytorch|tensorflow|scikit|spark/.test(sLower)) return 'data';
      if (/docker|kubernetes|ci\/cd|jenkins|aws|azure|gcp|s3|cloud/.test(sLower)) return 'infra';
      return 'other';
    };

    const computeServerScore = (obj: any) => {
      // If the model didn't provide matchingSkills, try extracting skills from
      // the resume and job description (simple ATS-like extraction) and use
      // their intersection.
      let matching = Array.isArray(obj.matchingSkills) ? obj.matchingSkills.length : 0;
      if ((!matching || matching === 0) && obj._input) {
        const resumeSkills = extractSkillsFromText(String(obj._input.resume || ''));
        const jdSkills = extractSkillsFromText(String(obj._input.jobDescription || ''));
        const inter = jdSkills.filter(s => resumeSkills.includes(s));
        matching = inter.length;
        // also populate matchingSkills list for transparency
        obj.matchingSkills = inter;
      }
      // Categorize matching skills to enforce coverage rules
      const categories = { frontend: 0, backend: 0, data: 0, infra: 0, other: 0 } as Record<string, number>;
      if (Array.isArray(obj.matchingSkills)) {
        for (const s of obj.matchingSkills) {
          const cat = categorizeSkill(String(s));
          categories[cat] = (categories[cat] || 0) + 1;
        }
      }

      // Lower per-skill weight to reduce single-skill inflation
      const perSkillWeight = 12; // each direct match ~12 points
      let score = Math.min(100, Math.round(matching * perSkillWeight));

      // Small conditional bonus for implied skills: only apply when >=2 direct matches
      if (obj.impliedSkills && String(obj.impliedSkills).trim().length > 30 && matching >= 2) score += 2;

      // Apply missing skills penalty: stronger penalty for many core misses
      const missing = Array.isArray(obj.missingSkills) ? obj.missingSkills.length : 0;
      score = Math.max(0, score - Math.min(20, missing * 2));

      // Enforce Full-Stack coverage: if JD mentions both front and back but one side missing, apply a large penalty
      const jdText = String(obj._input?.jobDescription || '').toLowerCase();
      const jdWantsFrontend = /frontend|react|vue|angular|next/.test(jdText);
      const jdWantsBackend = /backend|node|express|django|flask|api|rest/.test(jdText);
      if (jdWantsFrontend && jdWantsBackend) {
        // require at least one frontend and one backend direct match
        const hasFrontend = categories.frontend > 0;
        const hasBackend = categories.backend > 0;
        if (!hasFrontend || !hasBackend) {
          // Apply a strong cap: maximum 45 if missing one side
          score = Math.min(score, 45);
        }
      }

      // final clamp
      score = Math.max(0, Math.min(100, Math.round(score)));

      // return an object with rationale for API visibility
      return {
        score,
        reason: `Computed from ${matching} direct matches (perSkill=${perSkillWeight}), missing=${missing}, categories=${JSON.stringify(categories)}`,
      };
    };

    const modelScoreValid = typeof finalObj.matchScore === 'number' && finalObj.matchScore >= 0 && finalObj.matchScore <= 100;
    if (STRICT || !modelScoreValid) {
      const serverScoreObj = await computeServerScoreFor(finalObj);
      finalObj.scoreRationale = `Server-side computed score: ${serverScoreObj.score} based on ${finalObj.matchingSkills.length} matching skills, ${finalObj.missingSkills.length} missing skills. (${serverScoreObj.reason})`;
      finalObj.matchScore = serverScoreObj.score;
      // recompute status
      if (serverScoreObj.score >= 75) finalObj.status = 'Approved';
      else if (serverScoreObj.score >= 50) finalObj.status = 'Needs Improvement';
      else finalObj.status = 'Not a Match';
    } else {
      // Use model score but ensure it's an integer and status consistent
      finalObj.matchScore = Math.round(finalObj.matchScore);
      if (!finalObj.scoreRationale) finalObj.scoreRationale = 'Model-provided score accepted.';
      const sc = finalObj.matchScore;
      if (sc >= 75) finalObj.status = 'Approved';
      else if (sc >= 50) finalObj.status = 'Needs Improvement';
      else finalObj.status = 'Not a Match';
    }

    try {
      const validated = AnalyzeSkillsOutputSchema.parse(finalObj);
      return validated;
    } catch (err) {
      console.error('[analyzeSkills] - Validation failed after normalization and fallback:', err);
      const debugErr: any = new Error('Validation failed after normalization and fallback');
      debugErr.normalized = normalized;
      debugErr.raw = raw;
      debugErr.final = finalObj;
      throw debugErr;
    }
  }
);
