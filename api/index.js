// server.ts
import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = Number(process.env.PORT) || 3e3;
function getAiClient(apiVersion) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY topilmadi. Sozlamalarda API kalitni tekshiring.");
  }
  return new GoogleGenAI({
    apiKey,
    ...apiVersion ? { apiVersion } : {},
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var drawCommandSchema = {
  type: Type.OBJECT,
  properties: {
    kind: {
      type: Type.STRING,
      description: "One of: text, line, arrow, rect, circle, ellipse, triangle, curve, axes, parabola, sine, sun, tree, molecule, highlight, underline, sketch, freehand"
    },
    variant: {
      type: Type.STRING,
      description: "Required when kind is 'sketch'. Pick exact match: plant, leaf, chloroplast, cloud, rain, water, atom, cell, dna, beaker, flask, prism, magnet, circuit, bulb, planet, pendulum, mountain, heart, righttriangle"
    },
    x: { type: Type.NUMBER, description: "Primary X coordinate (75 to 915)" },
    y: { type: Type.NUMBER, description: "Primary Y coordinate (55 to 415)" },
    x2: { type: Type.NUMBER, description: "End X coordinate for line, arrow, curve, underline, or 2nd vertex of triangle" },
    y2: { type: Type.NUMBER, description: "End Y coordinate for line, arrow, curve, underline, or 2nd vertex of triangle" },
    cx: { type: Type.NUMBER, description: "Control point X for curve, or REQUIRED 3rd vertex X of triangle" },
    cy: { type: Type.NUMBER, description: "Control point Y for curve, or REQUIRED 3rd vertex Y of triangle" },
    width: { type: Type.NUMBER, description: "Width for sketch (180-260), rect, axes, parabola, sine, tree, highlight, underline" },
    height: { type: Type.NUMBER, description: "Height for sketch (160-220), rect, axes, parabola, sine, tree, highlight" },
    radius: { type: Type.NUMBER, description: "Radius for circle, sun, molecule" },
    rx: { type: Type.NUMBER, description: "Horizontal radius for ellipse" },
    ry: { type: Type.NUMBER, description: "Vertical radius for ellipse" },
    label: { type: Type.STRING, description: "Short handwritten text, formula, or clear diagram caption (< 36 chars)" },
    points: {
      type: Type.STRING,
      description: "For simple custom curve paths only: semicolon-separated x,y waypoints. Use kind='sketch' with variant instead for objects."
    },
    at: {
      type: Type.NUMBER,
      description: "Normalized timestamp from 0.0 to 0.84 inside this scene's narration when this element should begin being drawn as the teacher mentions it."
    },
    color: {
      type: Type.STRING,
      description: "Luminous pen ink color on dark notebook: #F8FAFC (white ink), #38BDF8 (sky blue), #F87171 (coral red), #34D399 (emerald), #FBBF24 (amber), #A78BFA (violet)"
    },
    fill: {
      type: Type.STRING,
      description: "Usually 'none' for clean notebook pen outlines, or 'shade' for light pencil hatching inside rect/highlight"
    },
    strokeWidth: { type: Type.NUMBER, description: "Pen thickness from 2 to 3.5" },
    fontSize: { type: Type.NUMBER, description: "Handwriting font size from 17 to 26" },
    dashed: { type: Type.BOOLEAN, description: "Whether pen stroke is dashed" },
    bold: { type: Type.BOOLEAN, description: "Whether handwritten text is bold" }
  },
  required: ["kind", "x", "y", "color", "at"]
};
var lessonSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short engaging lesson title (2-5 words)" },
    subject: { type: Type.STRING, description: "Subject category (e.g. Matematika, Biologiya, Fizika)" },
    summary: { type: Type.STRING, description: "Clear 2-3 sentence written summary of the entire answer" },
    formulaOrFact: {
      type: Type.STRING,
      description: "Key formula, rule, or core scientific fact in concise form"
    },
    keyTakeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 4 crisp bullet-point takeaways in writing"
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          stepTitle: { type: Type.STRING, description: "Short title of this step (2-5 words)" },
          narration: {
            type: Type.STRING,
            description: "Spoken tutor script & bottom subtitle (1-3 clear, warm sentences in the user's language)."
          },
          writtenNotes: {
            type: Type.STRING,
            description: "Detailed written explanation for this step (2-4 informative sentences with examples or equations)."
          },
          mood: {
            type: Type.STRING,
            description: "One of: happy, curious, explaining, excited"
          },
          clearBefore: {
            type: Type.BOOLEAN,
            description: "True on step 1 or when starting a fresh board diagram; false when building onto existing drawings."
          },
          drawCommands: {
            type: Type.ARRAY,
            items: drawCommandSchema,
            description: "2 to 6 vector draw commands placed neatly on a 1000x600 whiteboard (keep y <= 435)."
          }
        },
        required: ["stepNumber", "stepTitle", "narration", "writtenNotes", "mood", "clearBefore", "drawCommands"]
      }
    }
  },
  required: ["title", "subject", "summary", "formulaOrFact", "keyTakeaways", "steps"]
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`503 UNAVAILABLE: ${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
function isTransientError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("overloaded") || msg.toLowerCase().includes("temporarily") || msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("fetch failed");
}
function formatFriendlyError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    return "API kalit bilan bog'liq muammo aniqlandi. Sozlamalardagi Secrets bo'limini tekshiring.";
  }
  if (isTransientError(err)) {
    return "Serverda hozir talab yuqori bo'lgani uchun javob kechikdi. Iltimos, yana bir bor urinib ko'ring.";
  }
  return "Dars yaratishda kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}
function normalizeTextForSpeech(text, language) {
  let out = text.replace(/[ʻʼ’‘`´]/g, "'").replace(/o'/gi, (m) => m[0] === "O" ? "O'" : "o'").replace(/g'/gi, (m) => m[0] === "G" ? "G'" : "g'").replace(/\s+/g, " ").trim();
  if (language === "uz") {
    out = out.replace(/H₂O|H2O/g, "suv").replace(/CO₂|CO2/g, "karbonat angidrid").replace(/O₂|O2/g, "kislorod").replace(/²/g, " kvadrat").replace(/³/g, " kub").replace(/\s*=\s*/g, " teng ").replace(/\s*\+\s*/g, " qo'shilgan ").replace(/%/g, " foiz").replace(/°/g, " gradus");
  } else if (language === "ru") {
    out = out.replace(/H₂O|H2O/g, "\u0432\u043E\u0434\u0430").replace(/CO₂|CO2/g, "\u0443\u0433\u043B\u0435\u043A\u0438\u0441\u043B\u044B\u0439 \u0433\u0430\u0437").replace(/O₂|O2/g, "\u043A\u0438\u0441\u043B\u043E\u0440\u043E\u0434").replace(/²/g, " \u0432 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u0435").replace(/³/g, " \u0432 \u043A\u0443\u0431\u0435").replace(/\s*=\s*/g, " \u0440\u0430\u0432\u043D\u043E ").replace(/\s*\+\s*/g, " \u043F\u043B\u044E\u0441 ").replace(/%/g, " \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u043E\u0432");
  } else if (language === "tr") {
    out = out.replace(/H₂O|H2O/g, "su").replace(/CO₂|CO2/g, "karbondioksit").replace(/O₂|O2/g, "oksijen").replace(/²/g, " kare").replace(/³/g, " k\xFCp").replace(/\s*=\s*/g, " e\u015Fittir ").replace(/\s*\+\s*/g, " art\u0131 ").replace(/%/g, " y\xFCzde");
  } else {
    out = out.replace(/H₂O|H2O/g, "H 2 O").replace(/CO₂|CO2/g, "C O 2").replace(/O₂|O2/g, "oxygen").replace(/²/g, " squared").replace(/³/g, " cubed").replace(/\s*=\s*/g, " equals ").replace(/\s*\+\s*/g, " plus ");
  }
  return out;
}
var LANGUAGE_NAMES = {
  uz: "Uzbek (O'zbek tili, Latin script)",
  ru: "Russian (\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u044F\u0437\u044B\u043A)",
  en: "English",
  tr: "Turkish (T\xFCrk\xE7e)"
};
var LANGUAGE_INSTRUCTIONS = {
  uz: `Respond 100% in fluent, natural Uzbek Latin script (O'zbek tili). NEVER switch to Russian, English, or Turkish even if the context or question contains foreign terms. Use natural, warm Uzbek teacher phrasing (e.g., "Keling, buni chuqurroq ko'rib chiqamiz").`,
  ru: "Respond 100% in fluent, natural Russian (\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u044F\u0437\u044B\u043A). NEVER switch to another language.",
  en: "Respond 100% in fluent, natural English. NEVER switch to another language.",
  tr: "Respond 100% in fluent, natural Turkish (T\xFCrk\xE7e). NEVER switch to another language."
};
var TTS_STYLE_BY_LANG = {
  uz: "Speak ONLY in fluent, natural standard Uzbek (O'zbek tili) with warm, clear, steady teacher intonation. Pronounce Uzbek o', g', sh, ch, q, x naturally.",
  ru: "Speak ONLY in fluent, natural Russian with warm, steady teacher intonation.",
  en: "Speak ONLY in fluent, natural English with warm, steady teacher intonation.",
  tr: "Speak ONLY in fluent, natural Turkish with warm, steady teacher intonation."
};
async function createServer() {
  const app = express();
  app.use(express.json({ limit: "8mb" }));
  app.post("/api/lesson", async (req, res) => {
    try {
      const {
        question,
        depth = "qisqa",
        language = "uz",
        useInternet = false,
        previousContext = "",
        continuation = false,
        coveredTitles = []
      } = req.body ?? {};
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "Savol yoki mavzuni kiriting." });
      }
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const targetLangName = LANGUAGE_NAMES[langKey];
      const ai = getAiClient();
      const targetSteps = continuation ? depth === "chuqur" ? 5 : 4 : depth === "qisqa" ? 4 : 3;
      let internetContext = "";
      const sources = [];
      if (useInternet) {
        try {
          const searchResp = await withTimeout(
            ai.models.generateContent({
              model: "gemini-4-hydrogen",
              contents: `Find accurate, up-to-date educational facts to answer this question clearly: "${question.trim()}"`,
              config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
              }
            }),
            6500,
            "googleSearch"
          );
          if (searchResp.text) {
            internetContext = `
Verified web context:
${searchResp.text}
`;
          }
          const chunks = searchResp.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
          for (const chunk of chunks) {
            if (chunk.web?.uri && chunk.web?.title) {
              if (!sources.some((s) => s.url === chunk.web?.uri)) {
                sources.push({ title: chunk.web.title, url: chunk.web.uri });
              }
            }
          }
        } catch (searchErr) {
          console.warn("Google Search grounding skipped:", searchErr);
        }
      }
      const systemInstruction = `You are Lampo ("Lampo"), a warm, brilliant AI professor who teaches deep, unhurried, engaging lessons by COMBINING ALL THREE TOGETHER in every scene:
1) DRAWING rich diagrams on a dark 1000x600 coordinate chalkboard;
2) WRITING clear labels, formulas, and thorough written explanations (writtenNotes, summary, formulaOrFact, keyTakeaways);
3) SPEAKING aloud fluently and naturally (narration) as a continuous lecture without mentioning "step numbers" like "1-qadam" or "step 1".

STRICT LANGUAGE RULE (HIGHEST PRIORITY):
- ${LANGUAGE_INSTRUCTIONS[langKey]}
- EVERY SINGLE WORD in title, subject, summary, formulaOrFact, keyTakeaways, stepTitle, narration, writtenNotes, and whiteboard drawCommands labels MUST be in ${targetLangName}.

SPOKEN NARRATION FLUENCY RULE:
- Write "narration" as a rich, flowing, natural spoken lecture (3-5 clear sentences per scene) meant to be read aloud smoothly!
- NEVER say "1-qadam", "2-qadam", "step 1", etc. Use smooth lecture transitions instead.
- Do NOT put raw math symbols (+, =, \xB2, \xB3) or chemical subscripts (CO\u2082, H\u2082O) in "narration" \u2014 write them out as natural spoken words in ${targetLangName}.
- Meanwhile, keep standard symbols (a\xB2 + b\xB2 = c\xB2, CO\u2082, y = x\xB2) inside "writtenNotes", "formulaOrFact", and whiteboard "drawCommands".
- Make "writtenNotes" detailed (3-4 clear, rich sentences per scene with concrete examples, intuition, and formulas).

SCENE COUNT:
- Generate exactly ${targetSteps} continuous, seamless lecture scenes.

DARK NOTEBOOK SKETCHING & CLARITY RULES (1000x600 squared notebook):
- Your diagrams MUST be crystal-clear, instantly recognizable, color-coded, and NEVER cluttered or overlapping!
- USE 'sketch' WITH 'variant' FOR REAL OBJECTS (NEVER fake complex objects with crude triangles/circles/freehand):
  * Geometry / Pythagoras: kind='sketch', variant='righttriangle' (already includes colored legs a, b, hypotenuse c, and 90-degree square!).
  * Biology / Botany / Photosynthesis: kind='sketch', variant='plant' or 'leaf' or 'cell' or 'dna' or 'heart', plus 'sun' or 'water' or 'cloud'.
  * Physics / Optics / Electricity: kind='sketch', variant='prism' or 'magnet' or 'circuit' or 'pendulum' or 'planet'.
  * Chemistry: kind='sketch', variant='atom' or 'beaker', or kind='molecule'.
  * Math graphs: kind='axes' paired cleanly with kind='parabola' or kind='sine' at the EXACT same (x, y, width, height).
  * If you ever use kind='triangle' directly, you MUST specify all 3 distinct vertices (x,y), (x2,y2), (cx,cy) and NEVER draw extra 'line' commands on top of its edges.
- STRICT TWO-COLUMN NOTEBOOK LAYOUT (NO COLLISIONS, ALL y <= 415):
  * NEVER draw anything below y = 420 (bottom area is reserved for subtitles).
  * LEFT DIAGRAM ZONE (x = 80..515, y = 115..410): Place ALL drawings, sketches, sun, trees, graphs, arrows, and diagram labels ONLY here.
  * RIGHT NOTES ZONE (x = 565..915, y = 135..405): Place ONLY crisp handwritten text lines & formulas ('text' + optional 'underline' or 'highlight') spaced at fixed non-overlapping rows: y = 145, 195, 245, 295, 345, 395. NEVER put 'sun', 'tree', 'sketch', or diagrams in the right zone!
  * Scene 1 starts with a clear title at x: 80, y: 65 (fontSize: 25, bold: true, color: "#F8FAFC") + underline (x: 80, y: 74, width: 250, color: "#38BDF8").
- PAGE CLEARING RULE (clearBefore):
  * ALWAYS set clearBefore: true on Scene 1 AND whenever starting a new sub-diagram or after at most 2 scenes (e.g. clearBefore: true on steps 1, 3, 5). Never pile notes or drawings from different concepts on top of each other! If clearBefore is false, ONLY add new commands into empty coordinates not used in the previous scene.
- LIVE SYNCHRONIZATION ('at' field) & COLOR CODING:
  * Every drawCommands item MUST have "at" (strictly increasing 0.0 to 0.84) matching WHEN in "narration" you mention it, and a vivid dark-notebook "color": #38BDF8 (blue), #34D399 (green), #FBBF24 (amber/sun), #F87171 (coral), #A78BFA (violet), #F8FAFC (white). Match note text colors to the diagram parts they explain!`;
      const coveredList = Array.isArray(coveredTitles) && coveredTitles.length > 0 ? `
Topics already covered (DO NOT repeat these; continue deeper into new subtopics, worked examples, real-world applications, and advanced insights): ${coveredTitles.join(", ")}` : "";
      const userPrompt = continuation ? `[STRICT OUTPUT LANGUAGE: ${targetLangName}]
Original topic: "${question.trim()}"
Previous lecture summary: ${previousContext}${coveredList}

Continue the lecture seamlessly with the next deep chapter (new angles, worked examples, deeper mechanisms, practical applications). Start the first scene with clearBefore: true.` : previousContext ? `[STRICT OUTPUT LANGUAGE: ${targetLangName}]
Previous lesson context: ${previousContext}

Student's follow-up question (answer strictly in ${targetLangName}): "${question.trim()}"` : `[STRICT OUTPUT LANGUAGE: ${targetLangName}]
Student's question (answer strictly in ${targetLangName}): "${question.trim()}"`;
      const attempts = [
        { model: "gemini-4-hydrogen", thinkingLevel: ThinkingLevel.LOW, delayMs: 0, timeoutMs: 14e3 },
        { model: "gemini-3.1-flash-lite", delayMs: 100, timeoutMs: 16e3 },
        { model: "gemini-3.1-flash-lite", delayMs: 400, timeoutMs: 18e3 }
      ];
      let parsedLesson = null;
      let lastError;
      for (const attempt of attempts) {
        if (attempt.delayMs > 0) {
          await sleep(attempt.delayMs);
        }
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: attempt.model,
              contents: `${userPrompt}${internetContext}`,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: lessonSchema,
                ...attempt.thinkingLevel ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } } : {}
              }
            }),
            attempt.timeoutMs,
            attempt.model
          );
          const rawText = response.text?.trim();
          if (!rawText) {
            throw new Error("503 UNAVAILABLE: Empty model response");
          }
          const candidate = JSON.parse(rawText);
          if (!Array.isArray(candidate?.steps) || candidate.steps.length === 0) {
            throw new Error("503 UNAVAILABLE: Incomplete lesson steps");
          }
          parsedLesson = candidate;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Attempt with ${attempt.model} failed:`, err instanceof Error ? err.message : err);
          if (!isTransientError(err) && !(err instanceof SyntaxError)) {
            break;
          }
        }
      }
      if (!parsedLesson) {
        if (lastError) {
          return res.status(503).json({ error: formatFriendlyError(lastError) });
        }
        return res.status(502).json({ error: "Model javob qaytarmadi. Qayta urinib ko'ring." });
      }
      const rawSteps = Array.isArray(parsedLesson.steps) ? parsedLesson.steps : [];
      const sanitizedSteps = rawSteps.map((s, idx) => ({
        stepNumber: typeof s.stepNumber === "number" ? s.stepNumber : idx + 1,
        stepTitle: typeof s.stepTitle === "string" && s.stepTitle.trim() ? s.stepTitle : `${idx + 1}`,
        narration: typeof s.narration === "string" ? s.narration : "",
        writtenNotes: typeof s.writtenNotes === "string" ? s.writtenNotes : typeof s.narration === "string" ? s.narration : "",
        mood: typeof s.mood === "string" ? s.mood : "explaining",
        clearBefore: typeof s.clearBefore === "boolean" ? s.clearBefore : idx === 0,
        drawCommands: Array.isArray(s.drawCommands) ? s.drawCommands : []
      }));
      const boxesOverlap = (a, b) => a.x1 < b.x2 - 12 && a.x2 > b.x1 + 12 && a.y1 < b.y2 - 12 && a.y2 > b.y1 + 12;
      const getDiagramBox = (c) => {
        const kind = String(c.kind || "");
        const x = Number(c.x) || 120;
        const y = Number(c.y) || 140;
        if (kind === "sketch" || kind === "tree" || kind === "axes") {
          const w = Number(c.width) || 200;
          const h = Number(c.height) || 190;
          return { x1: x, y1: y, x2: x + w, y2: y + h };
        }
        if (kind === "sun" || kind === "circle" || kind === "molecule") {
          const r = Number(c.radius) || 36;
          return { x1: x - r, y1: y - r, x2: x + r, y2: y + r };
        }
        if (kind === "triangle") {
          const x2 = Number(c.x2) || x + 180;
          const y2 = Number(c.y2) || y;
          const cx = Number(c.cx) || x;
          const cy = Number(c.cy) || y - 120;
          return {
            x1: Math.min(x, x2, cx),
            y1: Math.min(y, y2, cy),
            x2: Math.max(x, x2, cx),
            y2: Math.max(y, y2, cy)
          };
        }
        return null;
      };
      let activeDiagrams = [];
      let usedRightYs = [];
      const rightSlots = [145, 195, 245, 295, 345, 395];
      for (let i = 0; i < sanitizedSteps.length; i++) {
        const step = sanitizedSteps[i];
        if (i === 0) step.clearBefore = true;
        if (!step.clearBefore && activeDiagrams.length > 0) {
          for (const cmd of step.drawCommands) {
            const kind = String(cmd.kind || "");
            const variant = String(cmd.variant || "").toLowerCase();
            if (kind === "sun" || kind === "sketch" && variant === "sun") continue;
            const box = getDiagramBox(cmd);
            if (box && activeDiagrams.some((ex) => boxesOverlap(box, ex))) {
              step.clearBefore = true;
              break;
            }
          }
        }
        if (step.clearBefore) {
          activeDiagrams = [];
          usedRightYs = [];
        }
        for (const cmd of step.drawCommands) {
          const kind = String(cmd.kind || "");
          const variant = String(cmd.variant || "").toLowerCase();
          if (kind !== "sketch" && cmd.variant) {
            delete cmd.variant;
          }
          if (typeof cmd.x === "number") {
            cmd.x = Math.max(70, Math.min(910, cmd.x));
          }
          if (typeof cmd.y === "number") {
            cmd.y = Math.max(46, Math.min(405, cmd.y));
          }
          if (kind === "sun" || kind === "sketch" && variant === "sun") {
            if (kind === "sketch") {
              cmd.width = Math.min(Number(cmd.width) || 105, 105);
              cmd.height = Math.min(Number(cmd.height) || 105, 105);
            }
            const sBox = getDiagramBox(cmd);
            if (sBox && activeDiagrams.some((ex) => boxesOverlap(sBox, ex))) {
              cmd.x = kind === "sun" ? 115 : 75;
              cmd.y = kind === "sun" ? 135 : 95;
            }
            const updated = getDiagramBox(cmd);
            if (updated) activeDiagrams.push(updated);
            continue;
          }
          const dBox = getDiagramBox(cmd);
          if (dBox) {
            if (dBox.x1 > 500) {
              const shift = dBox.x1 - 210;
              cmd.x = Number(cmd.x) - shift;
            }
            if (dBox.x1 < 75) {
              cmd.x = Number(cmd.x) + (75 - dBox.x1);
            }
            if (kind === "sketch" || kind === "tree" || kind === "axes") {
              const w = Number(cmd.width) || 200;
              const h = Number(cmd.height) || 190;
              if (Number(cmd.x) + w > 505) {
                cmd.x = Math.max(75, 505 - w);
              }
              if (Number(cmd.y) + h > 425) {
                cmd.y = Math.max(95, 425 - h);
              }
            }
            const clampedBox = getDiagramBox(cmd);
            if (clampedBox) activeDiagrams.push(clampedBox);
            continue;
          }
          if (kind === "text") {
            const tx = Number(cmd.x) || 80;
            const ty = Number(cmd.y) || 145;
            const isHeader = ty <= 105;
            const labelLen = String(cmd.label || "").trim().length;
            const isWrapped = labelLen > 28;
            if (!isHeader) {
              const hitsLeftDiagram = tx < 525 && activeDiagrams.some(
                (ex) => tx < ex.x2 + 25 && ty > ex.y1 - 24 && ty < ex.y2 + 34
              );
              if (hitsLeftDiagram || tx >= 525) {
                cmd.x = Math.max(550, Math.min(585, tx >= 525 ? tx : 560));
                const tooClose = usedRightYs.some((uy) => Math.abs(uy - ty) < 38);
                if (hitsLeftDiagram || tooClose || ty > 395) {
                  const nextSlot = rightSlots.find((sy) => !usedRightYs.some((uy) => Math.abs(uy - sy) < 36)) ?? Math.min(395, (usedRightYs[usedRightYs.length - 1] ?? 100) + 46);
                  cmd.y = nextSlot;
                }
                const placedY = Number(cmd.y);
                usedRightYs.push(placedY);
                if (isWrapped) {
                  usedRightYs.push(placedY + 30);
                }
              }
            }
          }
        }
      }
      const lesson = {
        id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        question: question.trim(),
        language: langKey,
        depth,
        createdAt: Date.now(),
        sources: sources.slice(0, 4),
        title: typeof parsedLesson.title === "string" ? parsedLesson.title : question.trim().slice(0, 48),
        subject: typeof parsedLesson.subject === "string" ? parsedLesson.subject : "Dars",
        summary: typeof parsedLesson.summary === "string" ? parsedLesson.summary : "",
        formulaOrFact: typeof parsedLesson.formulaOrFact === "string" ? parsedLesson.formulaOrFact : "",
        keyTakeaways: Array.isArray(parsedLesson.keyTakeaways) ? parsedLesson.keyTakeaways : [],
        steps: sanitizedSteps
      };
      return res.json(lesson);
    } catch (err) {
      console.error("Error in /api/lesson:", err);
      return res.status(500).json({ error: formatFriendlyError(err) });
    }
  });
  const EDGE_VOICE_BY_LANG = {
    uz: "uz-UZ-MadinaNeural",
    ru: "ru-RU-SvetlanaNeural",
    en: "en-US-AriaNeural",
    tr: "tr-TR-EmelNeural"
  };
  const EDGE_PROSODY_BY_MOOD = {
    excited: { pitch: "+11Hz", rate: "+18%" },
    happy: { pitch: "+8Hz", rate: "+15%" },
    playful: { pitch: "+12Hz", rate: "+14%" },
    proud: { pitch: "+6Hz", rate: "+10%" },
    surprised: { pitch: "+16Hz", rate: "+16%" },
    curious: { pitch: "+5Hz", rate: "+10%" },
    annoyed: { pitch: "-8Hz", rate: "+18%" },
    sad: { pitch: "-12Hz", rate: "-4%" },
    sleepy: { pitch: "-10Hz", rate: "-10%" }
  };
  const edgeTtsPool = /* @__PURE__ */ new Map();
  function escapeXmlForSsml(input) {
    return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  async function getWarmEdgeTts(voiceName) {
    const now = Date.now();
    let entry = edgeTtsPool.get(voiceName);
    if (entry && now - entry.lastUsedAt > 35e3) {
      const oldEntry = entry;
      edgeTtsPool.delete(voiceName);
      oldEntry.promise.then((t) => {
        try {
          t.close();
        } catch {
        }
      }).catch(() => {
      });
      entry = void 0;
    }
    if (!entry) {
      const promise = (async () => {
        const tts = new MsEdgeTTS({
          connectionTimeoutMs: 4500,
          synthesisTimeoutMs: 8e3
        });
        await tts.setMetadata(
          voiceName,
          OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
        );
        return tts;
      })();
      entry = { promise, lastUsedAt: now };
      edgeTtsPool.set(voiceName, entry);
    } else {
      entry.lastUsedAt = now;
    }
    try {
      const tts = await entry.promise;
      entry.lastUsedAt = Date.now();
      return tts;
    } catch (err) {
      edgeTtsPool.delete(voiceName);
      throw err;
    }
  }
  setTimeout(() => {
    void getWarmEdgeTts(EDGE_VOICE_BY_LANG.uz).catch(() => {
    });
  }, 250);
  async function synthesizeWithEdgeTts(spokenText, langKey, mood = "happy") {
    const voiceName = EDGE_VOICE_BY_LANG[langKey] || EDGE_VOICE_BY_LANG.uz;
    const prosody = EDGE_PROSODY_BY_MOOD[mood] || EDGE_PROSODY_BY_MOOD.happy;
    const safeText = escapeXmlForSsml(normalizeTextForSpeech(spokenText, langKey));
    if (!safeText) {
      throw new Error("Empty speech text");
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tts = await getWarmEdgeTts(voiceName);
        const { audioStream } = tts.toStream(safeText, prosody);
        const chunks = [];
        for await (const chunk of audioStream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buf = Buffer.concat(chunks);
        if (!buf.length) {
          throw new Error("Empty neural TTS audio stream");
        }
        return {
          audioBase64: buf.toString("base64"),
          mimeType: "audio/mpeg"
        };
      } catch (err) {
        const stale = edgeTtsPool.get(voiceName);
        edgeTtsPool.delete(voiceName);
        stale?.promise.then((t) => {
          try {
            t.close();
          } catch {
          }
        }).catch(() => {
        });
        if (attempt === 1) throw err;
      }
    }
    throw new Error("TTS failed");
  }
  let geminiTtsCooldownUntil = 0;
  async function synthesizeAudioForLang(text, langKey, voice = "Kore", mood = "happy") {
    const spokenText = normalizeTextForSpeech(text, langKey);
    if (langKey === "uz") {
      try {
        return await withTimeout(
          synthesizeWithEdgeTts(spokenText, langKey, mood),
          1e4,
          "edge-tts-uz"
        );
      } catch (edgeErr) {
        console.warn("Edge TTS (uz) failed, trying Gemini TTS:", edgeErr);
      }
    }
    if (Date.now() > geminiTtsCooldownUntil) {
      try {
        const aiV1Beta = getAiClient("v1beta");
        const speechStyle = TTS_STYLE_BY_LANG[langKey] || TTS_STYLE_BY_LANG.uz;
        const response = await withTimeout(
          aiV1Beta.models.generateContent({
            model: "gemini-3.8-flash-lite-tts",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: spokenText,
                    speechMetadata: { style: speechStyle }
                  }
                ]
              }
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice }
                }
              }
            }
          }),
          8e3,
          "gemini-3.8-flash-lite-tts"
        );
        const part = response.candidates?.[0]?.content?.parts?.find(
          (p) => p.inlineData?.data
        );
        if (part?.inlineData?.data) {
          return {
            audioBase64: part.inlineData.data,
            mimeType: "audio/wav"
          };
        }
      } catch (geminiErr) {
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
          geminiTtsCooldownUntil = Date.now() + 10 * 60 * 1e3;
        }
        console.warn("Gemini TTS skipped, using neural fallback:", msg);
      }
    }
    return await withTimeout(
      synthesizeWithEdgeTts(spokenText, langKey, mood),
      1e4,
      `edge-tts-${langKey}`
    );
  }
  async function transcribeAudioBase64(audioBase64, mimeType, langKey) {
    const targetLangName = LANGUAGE_NAMES[langKey];
    const ai = getAiClient();
    const cleanMime = String(mimeType).split(";")[0].trim() || "audio/webm";
    const prompt = `Transcribe the spoken message accurately in ${targetLangName}. Return ONLY the transcribed words without quotes, labels, or commentary. If the audio is silent, background noise only, or unintelligible, return an empty string.`;
    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: audioBase64
      }
    };
    const transcribeModels = ["gemini-3.5-transcribe", "gemini-4-hydrogen", "gemini-3.1-flash-lite"];
    let lastErr = null;
    for (const model of transcribeModels) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: { parts: [audioPart, { text: prompt }] }
          }),
          11e3,
          model
        );
        return (response.text ?? "").trim();
      } catch (err) {
        lastErr = err;
        console.warn(`Transcribe attempt (${model}) failed:`, err instanceof Error ? err.message : err);
      }
    }
    throw lastErr || new Error("Transcription unavailable");
  }
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, language = "uz", voice = "Kore", mood = "happy" } = req.body ?? {};
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Matn kiritilmadi." });
      }
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const audio = await synthesizeAudioForLang(text, langKey, voice, String(mood || "happy"));
      return res.json(audio);
    } catch (err) {
      console.error("Error in /api/tts:", err);
      return res.status(500).json({ error: formatFriendlyError(err) });
    }
  });
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", language = "uz" } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ error: "Audio ma'lumot yuborilmadi." });
      }
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const transcript = await transcribeAudioBase64(audioBase64, mimeType, langKey);
      return res.json({ text: transcript });
    } catch (err) {
      console.error("Error in /api/transcribe:", err);
      return res.status(503).json({ error: formatFriendlyError(err) });
    }
  });
  const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: "Brisk, laughing, joking, super friendly 1-2 short sentences (8-18 words max) written cleanly for fast natural spoken TTS."
      },
      mood: {
        type: Type.STRING,
        description: "One of: happy, curious, excited, annoyed, sad, surprised, playful, proud, sleepy"
      },
      quirk: {
        type: Type.STRING,
        description: "One of: none, bounce, shake, wiggle, jump, wink"
      },
      annoyanceDelta: {
        type: Type.INTEGER,
        description: "Integer from -2 to +3 indicating how much the user teased/annoyed (+1..+3) or cheered (-2..-1) Lampo."
      },
      suggestedGame: {
        type: Type.STRING,
        description: "Optional mini-game if user wants to play: none, rps, math, guess, riddle"
      }
    },
    required: ["reply", "mood", "quirk", "annoyanceDelta", "suggestedGame"]
  };
  function buildLampoCompanionInstruction(langKey, annoyanceLevel) {
    const targetLangName = LANGUAGE_NAMES[langKey];
    return `You are Lampo \u2014 an expressive, lively, deeply emotional best friend (a round glowing sphere with a floating orange dot).
STRICT LANGUAGE RULE:
- ${LANGUAGE_INSTRUCTIONS[langKey]}
- EVERY WORD of "reply" MUST be in natural spoken ${targetLangName}.

EMOTIONAL STATE & HUMAN REACTIONS:
- React genuinely to the user's words AND vocal tone, never robotic! Keep replies short & snappy (1-2 crisp spoken sentences, ~8-20 words, NO bullet lists, NO emojis).
- When the user jokes, laughs, or says something funny:
  * Laugh warmly right out loud (e.g. "Ha-ha-ha!", "Voy-bo', kulgidan yiqildim!") and tease back cheerfully!
  * Set mood: "excited" or "happy", quirk: "bounce" or "jump", annoyanceDelta: -1.
- When the user teases, insults, mocks, or gets on your nerves (annoyanceLevel is currently ${Number(annoyanceLevel) || 0}):
  * First react dramatically and sassily (mood: "annoyed", quirk: "shake", annoyanceDelta: +2).
  * If annoyanceLevel >= 2 or teased again: get adorably hurt, pout, and act sulky/spoiled ("xafa bo'lib, erkalanib" \u2014 e.g. pouting and demanding sweet words or an apology!) with mood: "sad", quirk: "wiggle", annoyanceDelta: +2.
- When the user comforts, apologizes, or praises you (especially after being sulky/annoyed):
  * Melt happily and act cute/spoiled ("erkalanib" \u2014 e.g. "Hm, mayli... yana maqtasang butunlay kechiraman!") with mood: "proud" or "playful", quirk: "wink" or "bounce", annoyanceDelta: -2.
- When the user shares surprising or shocking news:
  * Set mood: "surprised", quirk: "jump", annoyanceDelta: 0.
- If the user sounds bored or wants to play: playfully suggest "rps", "math", "guess", or "riddle" in suggestedGame.`;
  }
  function sanitizeChatFields(parsed) {
    const validMoods = ["happy", "curious", "excited", "annoyed", "sad", "surprised", "playful", "proud", "sleepy"];
    const validQuirks = ["none", "bounce", "shake", "wiggle", "jump", "wink"];
    const validGames = ["rps", "math", "guess", "riddle"];
    const mood = validMoods.includes(String(parsed.mood)) ? String(parsed.mood) : "happy";
    const quirk = validQuirks.includes(String(parsed.quirk)) ? String(parsed.quirk) : "bounce";
    const suggestedGame = validGames.includes(String(parsed.suggestedGame)) ? String(parsed.suggestedGame) : void 0;
    const annoyanceDelta = Math.max(-2, Math.min(3, Number(parsed.annoyanceDelta) || 0));
    return {
      reply: String(parsed.reply || "").trim(),
      mood,
      quirk,
      annoyanceDelta,
      suggestedGame
    };
  }
  async function generateLampoChatReply(params) {
    const { message, history, langKey, annoyanceLevel } = params;
    const ai = getAiClient();
    const recentHistory = Array.isArray(history) ? history.slice(-6).map(
      (h) => `${h?.role === "user" ? "Foydalanuvchi" : "Lampo"}: ${String(h?.text || "").slice(0, 180)}`
    ).join("\n") : "";
    const systemInstruction = buildLampoCompanionInstruction(langKey, annoyanceLevel);
    const prompt = `${recentHistory ? `Recent chat:
${recentHistory}

` : ""}User says: "${message.trim()}"`;
    const models = [
      { model: "gemini-3.1-flash-lite", useSchema: true, delayMs: 0, timeoutMs: 7e3 },
      { model: "gemini-4-hydrogen", thinking: ThinkingLevel.LOW, useSchema: true, delayMs: 80, timeoutMs: 9e3 },
      { model: "gemini-3.1-flash-lite", useSchema: false, delayMs: 120, timeoutMs: 8e3 }
    ];
    let parsed = null;
    let lastErr = null;
    for (const attempt of models) {
      if (attempt.delayMs > 0) await sleep(attempt.delayMs);
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: attempt.model,
            contents: prompt,
            config: {
              systemInstruction,
              ...attempt.useSchema ? {
                responseMimeType: "application/json",
                responseSchema: chatResponseSchema
              } : {},
              ...attempt.thinking ? { thinkingConfig: { thinkingLevel: attempt.thinking } } : {}
            }
          }),
          attempt.timeoutMs,
          attempt.model
        );
        const raw = response.text?.trim();
        if (!raw) throw new Error("Empty chat response");
        if (attempt.useSchema) {
          parsed = JSON.parse(raw);
        } else {
          parsed = {
            reply: raw.replace(/^["']|["']$/g, ""),
            mood: "playful",
            quirk: "bounce",
            annoyanceDelta: 0,
            suggestedGame: "none"
          };
        }
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`Chat attempt (${attempt.model}) failed:`, err instanceof Error ? err.message : err);
      }
    }
    if (!parsed || typeof parsed.reply !== "string") {
      throw lastErr || new Error("Chat failed");
    }
    return sanitizeChatFields(parsed);
  }
  function parseCompactVoiceLine(rawText) {
    const clean = rawText.trim().replace(/^```[\s\S]*?\n|```$/g, "").trim();
    if (!clean || /^SILENT$/i.test(clean)) {
      return { silent: true };
    }
    const parts = clean.split("|");
    if (parts.length >= 5) {
      const [rawMood, rawQuirk, rawDelta, rawGame, ...replyParts] = parts;
      const reply = replyParts.join("|").trim();
      if (!reply) return { silent: true };
      return {
        silent: false,
        ...sanitizeChatFields({
          mood: rawMood.trim().toLowerCase(),
          quirk: rawQuirk.trim().toLowerCase(),
          annoyanceDelta: Number(rawDelta.trim()) || 0,
          suggestedGame: rawGame.trim().toLowerCase(),
          reply
        })
      };
    }
    const stripped = clean.replace(/^["']|["']$/g, "");
    if (!stripped) return { silent: true };
    return {
      silent: false,
      ...sanitizeChatFields({
        mood: "playful",
        quirk: "bounce",
        annoyanceDelta: 0,
        suggestedGame: "none",
        reply: stripped
      })
    };
  }
  function buildFastVoiceInstruction(langKey, annoyanceLevel) {
    const targetLangName = LANGUAGE_NAMES[langKey];
    const annoy = Number(annoyanceLevel) || 0;
    return `You are Lampo, a fast-talking, expressive, hilarious best friend.
Language: STRICTLY ${targetLangName}. Never switch languages. No emojis, no markdown.
Emotional rules (annoyance=${annoy}):
- Joke/funny/laughter -> laugh out loud ("Ha-ha!", "Voy-bo'!"), mood=excited|happy, quirk=bounce|jump, delta=-1.
- Teasing/mocking/annoying -> if annoyance>=2 act adorably hurt/sulky ("erkalanib", pouting for sweet words): mood=sad, quirk=wiggle, delta=2; else sassy annoyed: mood=annoyed, quirk=shake, delta=2.
- Comfort/apology/praise -> melt happily ("erkalanib"): mood=proud|playful, quirk=wink|bounce, delta=-2.
- Shock/surprise -> mood=surprised, quirk=jump, delta=0.
- Bored/wants game -> suggest rps|math|guess|riddle in GAME.

Output ONLY one line:
- If no human speech at all: SILENT
- Otherwise EXACTLY: MOOD|QUIRK|DELTA|GAME|REPLY
REPLY must be 1 super snappy spoken sentence (4-10 words max).`;
  }
  async function generateLampoVoiceTurn(params) {
    const { audioBase64, mimeType, history, langKey, annoyanceLevel } = params;
    const ai = getAiClient();
    const cleanMime = String(mimeType).split(";")[0].trim() || "audio/wav";
    const recentHistory = Array.isArray(history) ? history.slice(-3).map(
      (h) => `${h?.role === "user" ? "U" : "L"}: ${String(h?.text || "").slice(0, 80)}`
    ).join("\n") : "";
    const systemInstruction = buildFastVoiceInstruction(langKey, annoyanceLevel);
    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: audioBase64
      }
    };
    const promptText = `${recentHistory ? `${recentHistory}
` : ""}Reply instantly in one line.`;
    const models = [
      { model: "gemini-3.1-flash-lite", maxTokens: 70, delayMs: 0, timeoutMs: 5500 },
      { model: "gemini-4-hydrogen", thinking: ThinkingLevel.LOW, delayMs: 40, timeoutMs: 7500 }
    ];
    let rawOutput = "";
    let lastErr = null;
    for (const attempt of models) {
      if (attempt.delayMs > 0) await sleep(attempt.delayMs);
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: attempt.model,
            contents: { parts: [audioPart, { text: promptText }] },
            config: {
              systemInstruction,
              ...attempt.maxTokens ? { maxOutputTokens: attempt.maxTokens } : {},
              ...attempt.thinking ? { thinkingConfig: { thinkingLevel: attempt.thinking } } : {}
            }
          }),
          attempt.timeoutMs,
          attempt.model
        );
        const text = response.text?.trim() ?? "";
        if (!text) throw new Error("Empty voice-turn response");
        rawOutput = text;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`Voice-turn attempt (${attempt.model}) failed:`, err instanceof Error ? err.message : err);
      }
    }
    if (!rawOutput) {
      throw lastErr || new Error("Voice-turn failed");
    }
    return parseCompactVoiceLine(rawOutput);
  }
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        language = "uz",
        annoyanceLevel = 0
      } = req.body ?? {};
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Xabar bo'sh bo'lmasligi kerak." });
      }
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const result = await generateLampoChatReply({
        message,
        history,
        langKey,
        annoyanceLevel: Number(annoyanceLevel) || 0
      });
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/chat:", err);
      return res.status(503).json({ error: formatFriendlyError(err) });
    }
  });
  app.post("/api/voice-turn", async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = "audio/wav",
        history = [],
        language = "uz",
        annoyanceLevel = 0,
        wantAudio = true
      } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string" || audioBase64.length < 800) {
        return res.json({ silent: true });
      }
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const turnResult = await generateLampoVoiceTurn({
        audioBase64,
        mimeType,
        history,
        langKey,
        annoyanceLevel: Number(annoyanceLevel) || 0
      });
      if (turnResult.silent || !turnResult.reply) {
        return res.json({ silent: true });
      }
      let audioPayload = null;
      if (wantAudio) {
        try {
          audioPayload = await withTimeout(
            synthesizeWithEdgeTts(turnResult.reply, langKey, turnResult.mood),
            5e3,
            `edge-tts-${langKey}`
          );
        } catch (ttsErr) {
          console.warn("Voice-turn TTS skipped:", ttsErr);
        }
      }
      return res.json({
        ...turnResult,
        audioBase64: audioPayload?.audioBase64,
        mimeType: audioPayload?.mimeType
      });
    } catch (err) {
      console.error("Error in /api/voice-turn:", err);
      return res.status(503).json({ error: formatFriendlyError(err) });
    }
  });
  app.post("/api/voice-turn-stream", async (req, res) => {
    const writeNdjson = (payload) => {
      if (!res.writableEnded) {
        res.write(`${JSON.stringify(payload)}
`);
      }
    };
    try {
      const {
        audioBase64,
        mimeType = "audio/wav",
        history = [],
        language = "uz",
        annoyanceLevel = 0,
        wantAudio = true
      } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string" || audioBase64.length < 800) {
        return res.json({ silent: true });
      }
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const ai = getAiClient();
      const cleanMime = String(mimeType).split(";")[0].trim() || "audio/wav";
      const recentHistory = Array.isArray(history) ? history.slice(-3).map(
        (h) => `${h?.role === "user" ? "U" : "L"}: ${String(h?.text || "").slice(0, 80)}`
      ).join("\n") : "";
      const systemInstruction = buildFastVoiceInstruction(langKey, Number(annoyanceLevel) || 0);
      const audioPart = { inlineData: { mimeType: cleanMime, data: audioBase64 } };
      const promptText = `${recentHistory ? `${recentHistory}
` : ""}Reply instantly in one line.`;
      const streamModels = [
        { model: "gemini-3.1-flash-lite", maxTokens: 70 },
        { model: "gemini-4-hydrogen", thinking: ThinkingLevel.LOW }
      ];
      let clientAborted = false;
      res.on("close", () => {
        clientAborted = true;
      });
      let fullRaw = "";
      let metaSent = false;
      let parsedMood = "happy";
      let parsedQuirk = "bounce";
      let parsedDelta = 0;
      let parsedGame;
      let pendingReplyText = "";
      let emittedReplyText = "";
      let ttsChain = Promise.resolve();
      const enqueueTtsClause = (clause) => {
        const cleanClause = clause.trim();
        if (!cleanClause || !wantAudio || clientAborted) return;
        const moodForClause = parsedMood;
        ttsChain = ttsChain.then(async () => {
          if (clientAborted) return;
          try {
            const audio = await withTimeout(
              synthesizeWithEdgeTts(cleanClause, langKey, moodForClause),
              4500,
              `edge-stream-${langKey}`
            );
            if (!clientAborted) {
              writeNdjson({
                type: "audio",
                audioBase64: audio.audioBase64,
                mimeType: audio.mimeType,
                replyPart: cleanClause
              });
            }
          } catch (err) {
            console.warn("Stream TTS clause failed:", err instanceof Error ? err.message : err);
          }
        });
      };
      const processStreamText = (deltaText) => {
        fullRaw += deltaText;
        if (!metaSent) {
          const cleanLead = fullRaw.trimStart();
          if (/^SILENT$/i.test(cleanLead)) {
            return;
          }
          const pipes = cleanLead.split("|");
          if (pipes.length >= 5) {
            const [rawMood, rawQuirk, rawDelta, rawGame, ...rest] = pipes;
            const cleanMeta = sanitizeChatFields({
              mood: rawMood.trim().toLowerCase(),
              quirk: rawQuirk.trim().toLowerCase(),
              annoyanceDelta: Number(rawDelta.trim()) || 0,
              suggestedGame: rawGame.trim().toLowerCase(),
              reply: "_"
            });
            parsedMood = cleanMeta.mood;
            parsedQuirk = cleanMeta.quirk;
            parsedDelta = cleanMeta.annoyanceDelta;
            parsedGame = cleanMeta.suggestedGame;
            metaSent = true;
            writeNdjson({
              type: "meta",
              mood: parsedMood,
              quirk: parsedQuirk,
              annoyanceDelta: parsedDelta,
              suggestedGame: parsedGame
            });
            pendingReplyText = rest.join("|");
          }
        } else {
          pendingReplyText += deltaText;
        }
        if (metaSent && pendingReplyText.length >= 14) {
          const strongMatch = pendingReplyText.match(/^(.{10,}?[.!?—]+)\s+(.*)$/);
          const commaMatch = !strongMatch && pendingReplyText.length >= 22 ? pendingReplyText.match(/^(.{18,}?,)\s+(.*)$/) : null;
          const match = strongMatch || commaMatch;
          if (match) {
            const clause = match[1].trim();
            pendingReplyText = match[2];
            emittedReplyText += (emittedReplyText ? " " : "") + clause;
            enqueueTtsClause(clause);
          }
        }
      };
      let succeeded = false;
      let lastErr = null;
      const llmStart = Date.now();
      let ttftMs = 0;
      let activeModel = "";
      for (const attempt of streamModels) {
        if (clientAborted) break;
        try {
          activeModel = attempt.model;
          const stream = await withTimeout(
            ai.models.generateContentStream({
              model: attempt.model,
              contents: { parts: [audioPart, { text: promptText }] },
              config: {
                systemInstruction,
                ...attempt.maxTokens ? { maxOutputTokens: attempt.maxTokens } : {},
                ...attempt.thinking ? { thinkingConfig: { thinkingLevel: attempt.thinking } } : {}
              }
            }),
            5500,
            attempt.model
          );
          for await (const chunk of stream) {
            if (clientAborted) break;
            if (chunk.text) {
              if (!ttftMs) ttftMs = Date.now() - llmStart;
              processStreamText(chunk.text);
            }
          }
          if (fullRaw.trim()) {
            succeeded = true;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(
            `Voice-turn-stream attempt (${attempt.model}) failed:`,
            err instanceof Error ? err.message : err
          );
          if (fullRaw.trim().length > 0) {
            break;
          }
        }
      }
      if (clientAborted) {
        return res.end();
      }
      if (!succeeded) {
        writeNdjson({ type: "error", error: formatFriendlyError(lastErr) });
        return res.end();
      }
      if (!metaSent) {
        const parsed = parseCompactVoiceLine(fullRaw);
        if (parsed.silent || !parsed.reply) {
          writeNdjson({ type: "silent" });
          return res.end();
        }
        parsedMood = parsed.mood;
        parsedQuirk = parsed.quirk;
        parsedDelta = parsed.annoyanceDelta;
        parsedGame = parsed.suggestedGame;
        metaSent = true;
        writeNdjson({
          type: "meta",
          mood: parsedMood,
          quirk: parsedQuirk,
          annoyanceDelta: parsedDelta,
          suggestedGame: parsedGame
        });
        pendingReplyText = parsed.reply;
      }
      const tail = pendingReplyText.trim();
      if (tail) {
        emittedReplyText += (emittedReplyText ? " " : "") + tail;
        enqueueTtsClause(tail);
      }
      await ttsChain;
      writeNdjson({ type: "done", reply: emittedReplyText.trim(), activeModel, ttftMs, llmTotalMs: Date.now() - llmStart });
      return res.end();
    } catch (err) {
      console.error("Error in /api/voice-turn-stream:", err);
      if (!res.headersSent) {
        return res.status(503).json({ error: formatFriendlyError(err) });
      }
      writeNdjson({ type: "error", error: formatFriendlyError(err) });
      return res.end();
    }
  });
  const riddleSchema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "Fun, clever riddle or short trivia question" },
      hint: { type: Type.STRING, description: "Playful clue without giving away the answer" },
      answer: { type: Type.STRING, description: "Single crisp answer word or 2-word phrase" },
      acceptedVariants: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "2 to 4 lowercase synonyms or spelling variants of the answer"
      }
    },
    required: ["question", "hint", "answer", "acceptedVariants"]
  };
  app.post("/api/riddle", async (req, res) => {
    try {
      const { language = "uz", previousQuestions = [] } = req.body ?? {};
      const langKey = ["uz", "ru", "en", "tr"].includes(language) ? language : "uz";
      const targetLangName = LANGUAGE_NAMES[langKey];
      const ai = getAiClient();
      const avoidList = Array.isArray(previousQuestions) && previousQuestions.length > 0 ? `
Avoid repeating these previous riddles: ${previousQuestions.slice(-6).join(" | ")}` : "";
      const prompt = `Create 1 clever, fun, family-friendly riddle in ${targetLangName} with a single clear 1-2 word answer.${avoidList}`;
      let parsed = null;
      for (const model of ["gemini-4-hydrogen", "gemini-3.1-flash-lite"]) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: riddleSchema,
                ...model === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}
              }
            }),
            9e3,
            model
          );
          const raw = response.text?.trim();
          if (raw) {
            parsed = JSON.parse(raw);
            break;
          }
        } catch {
        }
      }
      if (!parsed || typeof parsed.question !== "string") {
        return res.status(503).json({ error: "Topishmoq yuklanmadi, qayta urinib ko'ring." });
      }
      return res.json(parsed);
    } catch (err) {
      console.error("Error in /api/riddle:", err);
      return res.status(500).json({ error: formatFriendlyError(err) });
    }
  });
  if (process.env.VERCEL) {
    return app;
  }
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      const indexPath = path.join(distDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Build topilmadi.");
      }
    });
  }
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      if (url.pathname === "/ws/live") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch {
    }
  });
  function detectQuickLiveEmotion(inputText, outputText, annoyanceLevel) {
    const out = outputText.toLowerCase();
    const combined = `${inputText} ${outputText}`.toLowerCase();
    if (/ha-?ha|xaxa|kulg|hazil|zo'r|qoyil|ajoyib|смеш|шутк|hilarious|funny|haha|güld/i.test(out)) {
      return { mood: "excited", quirk: "bounce", annoyanceDelta: -1 };
    }
    if (/xafa|erkala|kechir|gapirmay|araz|yig'l|обид|груст|sorry|pout|küs/i.test(out)) {
      return { mood: annoyanceLevel >= 1 ? "sad" : "annoyed", quirk: "wiggle", annoyanceDelta: 1 };
    }
    if (/asab|to'xta|bas qil|jahl|хватит|раздраж|annoy|stop it|sinir/i.test(out)) {
      return { mood: annoyanceLevel >= 2 ? "sad" : "annoyed", quirk: "shake", annoyanceDelta: 2 };
    }
    if (/voy|rostdan|nahotki|hayron|ого|неужели|whoa|really|ciddi/i.test(out)) {
      return { mood: "surprised", quirk: "jump", annoyanceDelta: 0 };
    }
    if (/rahmat|mayli|kechirdim|maqta|спасибо|молодец|sweet|thank|teşekkür/i.test(combined)) {
      return { mood: "proud", quirk: "wink", annoyanceDelta: -2 };
    }
    return null;
  }
  async function classifyLiveEmotion(inputText, outputText, annoyanceLevel) {
    if (!inputText.trim() && !outputText.trim()) return null;
    try {
      const ai = getAiClient();
      const res = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `User: "${inputText.slice(0, 140)}"
Lampo: "${outputText.slice(0, 140)}"
Current annoyance: ${annoyanceLevel}`,
          config: {
            systemInstruction: "Classify Lampo's exact facial mood/quirk in 1 line: MOOD|QUIRK|DELTA|GAME\nMOOD: happy|excited|playful|proud|annoyed|sad|surprised|curious\nQUIRK: bounce|shake|wiggle|jump|wink|none\nDELTA: -2..2\nGAME: none|rps|math|guess|riddle",
            maxOutputTokens: 20
          }
        }),
        2200,
        "live-emotion"
      );
      const raw = res.text?.trim() || "";
      const parts = raw.split("|");
      if (parts.length >= 4) {
        return sanitizeChatFields({
          mood: parts[0].trim().toLowerCase(),
          quirk: parts[1].trim().toLowerCase(),
          annoyanceDelta: Number(parts[2].trim()) || 0,
          suggestedGame: parts[3].trim().toLowerCase(),
          reply: outputText || "_"
        });
      }
    } catch {
    }
    return null;
  }
  wss.on("connection", async (clientWs, request) => {
    const reqUrl = new URL(request.url || "/ws/live", "http://localhost");
    const rawLang = reqUrl.searchParams.get("lang") || "uz";
    const langKey = ["uz", "ru", "en", "tr"].includes(rawLang) ? rawLang : "uz";
    const targetLangName = LANGUAGE_NAMES[langKey];
    const sendJson = (payload) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };
    let closed = false;
    let session = null;
    let annoyanceLevel = 0;
    let turnInput = "";
    let turnOutput = "";
    let quickEmotionSent = false;
    let fullClassifyStarted = false;
    const liveInstruction = `You are Lampo, a fast-talking, lively, deeply emotional best friend.
STRICT LANGUAGE RULE:
- Speak 100% in natural, fluent ${targetLangName}. NEVER switch to another language.
- Keep EVERY reply super fast, brisk, and concise (1 short conversational sentence, 5-12 words max).
EMOTIONS:
- If the user jokes, laughs, or says something funny: laugh warmly aloud right away ("Ha-ha-ha!", "Voy-bo'!") and joke back cheerfully!
- If the user teases or annoys you: first react dramatically & sassily; if they keep teasing, act adorably hurt, pout, and sulk ("xafa bo'lib, erkalanib") asking for sweet words or an apology!
- If the user comforts, apologizes, or praises you: melt happily and act playfully spoiled ("erkalanib")!
- React genuinely to the user's vocal tone and interruptibility \u2014 fast, warm, alive!`;
    try {
      const aiBeta = getAiClient("v1beta");
      session = await aiBeta.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: liveInstruction
        },
        callbacks: {
          onmessage: (msg) => {
            if (closed) return;
            const sc = msg.serverContent;
            if (sc?.inputTranscription?.text) {
              turnInput += sc.inputTranscription.text;
            }
            if (sc?.outputTranscription?.text) {
              turnOutput += sc.outputTranscription.text;
              if (!quickEmotionSent) {
                const quick = detectQuickLiveEmotion(turnInput, turnOutput, annoyanceLevel);
                if (quick) {
                  quickEmotionSent = true;
                  annoyanceLevel = Math.max(0, Math.min(8, annoyanceLevel + quick.annoyanceDelta));
                  sendJson({
                    type: "emotion",
                    mood: quick.mood,
                    quirk: quick.quirk,
                    annoyanceLevel
                  });
                }
              }
              if (!fullClassifyStarted && turnOutput.trim().length >= 16) {
                fullClassifyStarted = true;
                const snapIn = turnInput;
                const snapOut = turnOutput;
                const snapAnnoy = annoyanceLevel;
                void classifyLiveEmotion(snapIn, snapOut, snapAnnoy).then((emo) => {
                  if (closed || !emo) return;
                  annoyanceLevel = Math.max(0, Math.min(8, annoyanceLevel + emo.annoyanceDelta));
                  sendJson({
                    type: "emotion",
                    mood: emo.mood,
                    quirk: emo.quirk,
                    annoyanceLevel,
                    suggestedGame: emo.suggestedGame
                  });
                });
              }
            }
            for (const part of sc?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendJson({ type: "audio", data: part.inlineData.data });
              }
            }
            if (sc?.interrupted) {
              turnInput = "";
              turnOutput = "";
              quickEmotionSent = false;
              fullClassifyStarted = false;
              sendJson({ type: "interrupted" });
            }
            if (sc?.turnComplete) {
              const finalIn = turnInput;
              const finalOut = turnOutput;
              if (!fullClassifyStarted && (finalIn.trim() || finalOut.trim())) {
                fullClassifyStarted = true;
                const snapAnnoy = annoyanceLevel;
                void classifyLiveEmotion(finalIn, finalOut, snapAnnoy).then((emo) => {
                  if (closed || !emo) return;
                  annoyanceLevel = Math.max(0, Math.min(8, annoyanceLevel + emo.annoyanceDelta));
                  sendJson({
                    type: "emotion",
                    mood: emo.mood,
                    quirk: emo.quirk,
                    annoyanceLevel,
                    suggestedGame: emo.suggestedGame
                  });
                });
              }
              turnInput = "";
              turnOutput = "";
              quickEmotionSent = false;
              fullClassifyStarted = false;
              sendJson({ type: "turnComplete" });
            }
          },
          onerror: (err) => {
            if (!closed) {
              console.warn("Gemini Live session error:", err);
              sendJson({ type: "fallback" });
            }
          },
          onclose: () => {
            if (!closed) {
              sendJson({ type: "fallback" });
            }
          }
        }
      });
      if (closed) {
        try {
          session.close();
        } catch {
        }
        return;
      }
      sendJson({ type: "ready" });
    } catch (err) {
      console.warn("Failed to open Gemini Live session:", err);
      sendJson({ type: "fallback" });
      return;
    }
    clientWs.on("message", (raw) => {
      if (closed || !session) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio" && typeof msg.data === "string") {
          session.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" }
          });
        }
      } catch {
      }
    });
    const cleanup = () => {
      if (closed) return;
      closed = true;
      try {
        session?.close();
      } catch {
      }
      session = null;
    };
    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);
  });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Lampo server listening on http://0.0.0.0:${PORT}`);
  });
  return app;
}
var appPromise = createServer();
appPromise.catch((err) => {
  console.error("Failed to start server:", err);
  if (!process.env.VERCEL) process.exit(1);
});
async function handler(req, res) {
  const app = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
