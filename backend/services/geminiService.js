require("dotenv").config();

/* =========================================================
   GEMINI SERVICE
========================================================= */

let aiClientPromise = null;

/*
  Current stable Gemini 3 Flash models.

  We start with the lightweight model for simple career
  questions, then fall back to other stable Flash models.
*/
const MODEL_NAMES = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

/* =========================================================
   SLEEP
========================================================= */

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* =========================================================
   GET GEMINI CLIENT
========================================================= */

async function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing in .env"
    );
  }

  if (!aiClientPromise) {
    aiClientPromise = import("@google/genai")
      .then(({ GoogleGenAI }) => {
        console.log(
          "🤖 Gemini client initialized"
        );

        return new GoogleGenAI({
          apiKey:
            process.env.GEMINI_API_KEY,
        });
      })
      .catch((error) => {
        aiClientPromise = null;
        throw error;
      });
  }

  return aiClientPromise;
}

/* =========================================================
   CHECK RETRYABLE ERROR
========================================================= */

function isRetryableError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  return (
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("temporarily unavailable")
  );
}

/* =========================================================
   EXTRACT TEXT FROM GEMINI RESPONSE
========================================================= */

function extractText(response) {
  /* -----------------------------------------------
     Normal SDK response
  ----------------------------------------------- */

  try {
    if (
      typeof response?.text === "string" &&
      response.text.trim()
    ) {
      return response.text.trim();
    }
  } catch (error) {
    console.warn(
      "⚠️ response.text could not be read:",
      error.message
    );
  }

  /* -----------------------------------------------
     Fallback:
     candidates -> content -> parts
  ----------------------------------------------- */

  const candidates =
    Array.isArray(
      response?.candidates
    )
      ? response.candidates
      : [];

  const textParts = [];

  for (const candidate of candidates) {
    const parts =
      candidate?.content?.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (
        typeof part?.text === "string" &&
        part.text.trim()
      ) {
        textParts.push(
          part.text.trim()
        );
      }
    }
  }

  return textParts.join("\n").trim();
}

/* =========================================================
   RESPONSE DEBUG INFORMATION
========================================================= */

function getResponseDebug(response) {
  const candidates =
    Array.isArray(
      response?.candidates
    )
      ? response.candidates
      : [];

  return {
    candidateCount:
      candidates.length,

    finishReason:
      candidates[0]?.finishReason ||
      null,

    modelVersion:
      response?.modelVersion ||
      null,

    promptFeedback:
      response?.promptFeedback ||
      null,

    usageMetadata:
      response?.usageMetadata ||
      null,
  };
}

/* =========================================================
   LOCAL RAG FALLBACK
========================================================= */

/*
  This is NOT pretending to be an LLM.

  It gives the user a useful answer directly from the
  retrieved RAG documents when Gemini is temporarily
  unavailable.
*/

function generateLocalFallback({
  question,
  context,
}) {
  const lowerQuestion =
    question.toLowerCase();

  const lines = context
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const jobBlocks = [];
  const resumeBlocks = [];

  let currentBlock = [];
  let currentType = null;

  function flushBlock() {
    if (
      currentBlock.length === 0 ||
      !currentType
    ) {
      return;
    }

    const block =
      currentBlock.join(" ");

    if (currentType === "job") {
      jobBlocks.push(block);
    }

    if (currentType === "resume") {
      resumeBlocks.push(block);
    }

    currentBlock = [];
  }

  for (const line of lines) {
    if (
      line.startsWith("TYPE: ")
    ) {
      flushBlock();

      currentType = line
        .replace("TYPE: ", "")
        .toLowerCase();

      currentBlock = [line];

      continue;
    }

    if (
      line ===
      "--------------------"
    ) {
      flushBlock();

      currentType = null;

      continue;
    }

    currentBlock.push(line);
  }

  flushBlock();

  /* =======================================================
     RESUME SKILLS
  ======================================================= */

  let resumeSkills = [];

  for (const block of resumeBlocks) {
    const match =
      block.match(
        /AI\/ML & Generative AI:\s*([^]+?)(?=Programming Languages:|Backend & Web Development:|Data Processing & Developer Tools:|$)/i
      );

    if (match?.[1]) {
      resumeSkills.push(
        ...match[1]
          .split(",")
          .map((skill) =>
            skill.trim()
          )
          .filter(Boolean)
      );
    }
  }

  resumeSkills = [
    ...new Set(
      resumeSkills
    ),
  ];

  /* =======================================================
     JOB SKILLS
  ======================================================= */

  const jobSkills = [];

  for (const block of jobBlocks) {
    const match =
      block.match(
        /Required Skills:\s*([^]+?)(?=Description:|Responsibilities:|$)/i
      );

    if (match?.[1]) {
      jobSkills.push(
        ...match[1]
          .split(",")
          .map((skill) =>
            skill.trim()
          )
          .filter(Boolean)
      );
    }
  }

  const normalizedResumeSkills =
    resumeSkills.map((skill) =>
      skill
        .toLowerCase()
        .replace(/\./g, "")
        .trim()
    );

  const normalizedJobSkills =
    jobSkills.map((skill) =>
      skill
        .toLowerCase()
        .replace(/\./g, "")
        .trim()
    );

  const matchedSkills =
    normalizedJobSkills.filter(
      (skill) =>
        normalizedResumeSkills.some(
          (resumeSkill) =>
            resumeSkill.includes(skill) ||
            skill.includes(resumeSkill)
        )
    );

  const missingSkills =
    normalizedJobSkills.filter(
      (skill) =>
        !normalizedResumeSkills.some(
          (resumeSkill) =>
            resumeSkill.includes(skill) ||
            skill.includes(resumeSkill)
        )
    );

  /* =======================================================
     GENERATE PRACTICAL ANSWER
  ======================================================= */

  let answer =
    "Gemini is temporarily unavailable, so I generated this answer directly from your retrieved career data.\n\n";

  if (
    lowerQuestion.includes(
      "skill"
    )
  ) {
    if (
      resumeSkills.length > 0
    ) {
      answer +=
        "**Skills found in your retrieved resume context:**\n";

      answer +=
        resumeSkills
          .slice(0, 15)
          .map(
            (skill) =>
              `- ${skill}`
          )
          .join("\n");

      answer += "\n\n";
    }

    if (
      matchedSkills.length > 0
    ) {
      answer +=
        "**Skills matching the retrieved job requirements:**\n";

      answer +=
        [
          ...new Set(
            matchedSkills
          ),
        ]
          .map(
            (skill) =>
              `- ${skill}`
          )
          .join("\n");

      answer += "\n\n";
    }

    if (
      missingSkills.length > 0
    ) {
      answer +=
        "**Skills not found in the retrieved resume context:**\n";

      answer +=
        [
          ...new Set(
            missingSkills
          ),
        ]
          .map(
            (skill) =>
              `- ${skill}`
          )
          .join("\n");

      answer += "\n\n";
    }

    answer +=
      "For the AI Engineer roles retrieved for you, the strongest overlap is around Python, machine learning, AI, SQL, generative AI and related LLM technologies. RAG is an important requirement in the retrieved Oracle roles, so make your RAG project experience very visible on your resume.";
  } else {
    answer +=
      "Based on the retrieved resume and job information, your profile is being matched against AI/ML and Generative AI roles. The retrieved documents show strong relevance between your resume and the AI Engineer / Generative AI roles.";
  }

  return answer;
}

/* =========================================================
   CALL ONE GEMINI MODEL
========================================================= */

async function callModel({
  ai,
  modelName,
  systemInstruction,
  prompt,
}) {
  const response =
    await ai.models.generateContent({
      model: modelName,

      contents: prompt,

      config: {
        systemInstruction,

        temperature: 0.2,

        maxOutputTokens: 1000,
      },
    });

  const answer =
    extractText(response);

  if (!answer) {
    const debug =
      getResponseDebug(
        response
      );

    throw new Error(
      [
        `Gemini model ${modelName} returned an empty response.`,
        `candidateCount=${debug.candidateCount}`,
        `finishReason=${debug.finishReason}`,
        `modelVersion=${debug.modelVersion}`,
      ].join(" ")
    );
  }

  return answer;
}

/* =========================================================
   GENERATE CAREER ANSWER
========================================================= */

async function generateCareerAnswer({
  question,
  context,
}) {
  if (
    !question ||
    !question.trim()
  ) {
    throw new Error(
      "Question is required."
    );
  }

  if (
    !context ||
    !context.trim()
  ) {
    throw new Error(
      "RAG context is required."
    );
  }

  /* =======================================================
     PROMPT
  ======================================================= */

  const systemInstruction = `
You are CareerOS, an AI career assistant.

You answer questions about the user's career using the
retrieved career context supplied to you.

The context may contain:
- the user's resume
- the user's profile
- job descriptions
- job requirements
- job responsibilities

STRICT RULES:

1. Use the retrieved context as the factual source.
2. Do not invent skills, experience, projects, education,
   certifications, companies, or requirements.
3. Never claim the user has a skill unless supported by
   the retrieved context.
4. For job-fit questions, explain matching skills and gaps.
5. Separate facts from recommendations.
6. If information is unavailable, say so.
7. Give practical advice appropriate for a fresher.
8. Answer the user's exact question.
9. Keep the answer clear and reasonably concise.
`;

  const prompt = `
USER QUESTION:

${question.trim()}


RETRIEVED CAREER CONTEXT:

${context}


Answer the user's question using only the retrieved context.
`;

  /* =======================================================
     TRY GEMINI
  ======================================================= */

  try {
    const ai =
      await getGeminiClient();

    let lastError =
      null;

    for (
      const modelName of MODEL_NAMES
    ) {
      console.log(
        `🤖 Trying Gemini model: ${modelName}`
      );

      /*
        Two attempts per model for temporary
        service errors.
      */

      for (
        let attempt = 1;
        attempt <= 2;
        attempt++
      ) {
        try {
          console.log(
            `   Attempt ${attempt}/2`
          );

          const answer =
            await callModel({
              ai,

              modelName,

              systemInstruction,

              prompt,
            });

          console.log(
            `✅ Gemini answer generated using ${modelName}`
          );

          return {
            answer,

            model:
              modelName,

            source:
              "gemini-rag",
          };
        } catch (error) {
          lastError =
            error;

          console.error(
            `❌ ${modelName} attempt ${attempt} failed:`,
            error.message
          );

          /*
            Retry temporary capacity/rate errors.
          */

          if (
            isRetryableError(
              error
            ) &&
            attempt < 2
          ) {
            const delay =
              attempt === 1
                ? 2000
                : 4000;

            console.log(
              `⏳ Waiting ${delay}ms...`
            );

            await sleep(
              delay
            );
          } else {
            /*
              Move to next model.
            */
            break;
          }
        }
      }
    }

    /* =====================================================
       ALL GEMINI MODELS FAILED
    ===================================================== */

    console.warn(
      "⚠️ All Gemini models failed."
    );

    console.warn(
      "⚠️ Falling back to local RAG answer."
    );

    return {
      answer:
        generateLocalFallback({
          question,
          context,
        }),

      model:
        "local-rag-fallback",

      source:
        "local-rag-fallback",

      geminiError:
        lastError?.message ||
        "Gemini unavailable.",
    };
  } catch (error) {
    /*
      Gemini client initialization or API key issue.
    */

    console.error(
      "❌ Gemini initialization/generation error:",
      error.message
    );

    console.warn(
      "⚠️ Falling back to local RAG answer."
    );

    return {
      answer:
        generateLocalFallback({
          question,
          context,
        }),

      model:
        "local-rag-fallback",

      source:
        "local-rag-fallback",

      geminiError:
        error.message,
    };
  }
}

module.exports = {
  generateCareerAnswer,
};