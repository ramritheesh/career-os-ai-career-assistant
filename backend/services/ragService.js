const {
  createEmbedding,
} = require("./embeddingService");

const {
  cosineSimilarity,
} = require("./similarityService");

/* =========================================================
   TEXT HELPERS
========================================================= */

function normalizeText(text) {
  if (!text) {
    return "";
  }

  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForComparison(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const value of values) {
    const cleaned = String(value || "").trim();

    if (!cleaned) {
      continue;
    }

    const key = normalizeForComparison(cleaned);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

/* =========================================================
   DOCUMENT DEDUPLICATION
========================================================= */

function documentDeduplicationKey(document) {
  if (!document) {
    return "";
  }

  /*
    Skills are treated as one canonical resume document.
    This prevents:
      "Resume - skills"
      "Resume - Skills"
    from appearing separately.
  */
  if (
    document.type === "resume" &&
    document.section === "skills"
  ) {
    return "resume::skills";
  }

  /*
    Jobs are deduplicated by their actual content.
    This removes exact duplicate job postings without
    collapsing genuinely different job descriptions.
  */
  if (document.type === "job") {
    return [
      "job",
      normalizeForComparison(document.content),
    ].join("::");
  }

  /*
    Profile is a single logical document.
  */
  if (document.type === "profile") {
    return "profile";
  }

  /*
    Resume sections:
    deduplicate only exact content within the same section.
  */
  return [
    document.type || "",
    document.section || "",
    normalizeForComparison(document.content),
  ].join("::");
}

function deduplicateDocuments(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const document of documents) {
    if (!document) {
      continue;
    }

    const key = documentDeduplicationKey(document);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(document);
  }

  return result;
}

/* =========================================================
   RESUME SECTION DETECTION
========================================================= */

const SECTION_PATTERNS = [
  {
    name: "summary",
    patterns: [
      /^summary$/i,
      /^professional summary$/i,
      /^profile$/i,
      /^objective$/i,
      /^career objective$/i,
    ],
  },

  {
    name: "skills",
    patterns: [
      /^skills$/i,
      /^technical skills$/i,
      /^technical expertise$/i,
      /^core skills$/i,
      /^skills & technologies$/i,
      /^technologies$/i,
    ],
  },

  {
    name: "experience",
    patterns: [
      /^experience$/i,
      /^work experience$/i,
      /^professional experience$/i,
      /^employment history$/i,
      /^internship experience$/i,
      /^internships$/i,
    ],
  },

  {
    name: "projects",
    patterns: [
      /^projects$/i,
      /^academic projects$/i,
      /^personal projects$/i,
      /^key projects$/i,
      /^project experience$/i,
    ],
  },

  {
    name: "education",
    patterns: [
      /^education$/i,
      /^academic background$/i,
      /^educational qualifications$/i,
    ],
  },

  {
    name: "certifications",
    patterns: [
      /^certifications$/i,
      /^certificates$/i,
      /^certification$/i,
    ],
  },

  {
    name: "achievements",
    patterns: [
      /^achievements$/i,
      /^accomplishments$/i,
      /^awards$/i,
    ],
  },
];

/* =========================================================
   NORMALIZE HEADING
========================================================= */

function normalizeHeading(line) {
  if (!line) {
    return "";
  }

  return String(line)
    .trim()
    .replace(/^[\s\-•*#:]+/, "")
    .replace(/[\s\-•*#:]+$/, "")
    .trim();
}

/* =========================================================
   DETECT SECTION
========================================================= */

function detectSection(line) {
  const heading = normalizeHeading(line);

  if (!heading) {
    return null;
  }

  for (const section of SECTION_PATTERNS) {
    for (const pattern of section.patterns) {
      if (pattern.test(heading)) {
        return section.name;
      }
    }
  }

  return null;
}

/* =========================================================
   SPLIT RESUME INTO SECTIONS
========================================================= */

function splitResumeIntoSections(resumeText) {
  const text = normalizeText(resumeText);

  if (!text) {
    return [];
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [];

  let currentSection = "header";
  let currentLines = [];

  function flushSection() {
    if (currentLines.length === 0) {
      return;
    }

    const content = currentLines
      .join("\n")
      .trim();

    if (content) {
      sections.push({
        section: currentSection,
        content,
      });
    }

    currentLines = [];
  }

  for (const line of lines) {
    const detectedSection = detectSection(line);

    if (detectedSection) {
      flushSection();

      currentSection = detectedSection;

      continue;
    }

    currentLines.push(line);
  }

  flushSection();

  return sections;
}

/* =========================================================
   SPLIT LARGE SECTION
========================================================= */

function splitLargeSection(
  section,
  maxCharacters = 1400
) {
  const content = String(
    section.content || ""
  ).trim();

  if (!content) {
    return [];
  }

  if (content.length <= maxCharacters) {
    return [
      {
        section: section.section,
        content,
      },
    ];
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];

  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate =
      `${current}\n\n${paragraph}`;

    if (candidate.length <= maxCharacters) {
      current = candidate;
    } else {
      chunks.push({
        section: section.section,
        content: current,
      });

      current = paragraph;
    }
  }

  if (current.trim()) {
    chunks.push({
      section: section.section,
      content: current,
    });
  }

  const finalChunks = [];

  for (const chunk of chunks) {
    if (chunk.content.length <= maxCharacters) {
      finalChunks.push(chunk);
      continue;
    }

    for (
      let start = 0;
      start < chunk.content.length;
      start += maxCharacters
    ) {
      const piece = chunk.content.slice(
        start,
        start + maxCharacters
      );

      if (piece.trim()) {
        finalChunks.push({
          section: chunk.section,
          content: piece.trim(),
        });
      }
    }
  }

  return finalChunks;
}

/* =========================================================
   CREATE RESUME DOCUMENTS
========================================================= */

function createResumeDocuments(resume) {
  if (
    !resume?.text ||
    !String(resume.text).trim()
  ) {
    return [];
  }

  const documents = [];

  const sections = splitResumeIntoSections(
    resume.text
  );

  /*
    Build one canonical skills document.

    Old behavior:
      1. Resume - skills
      2. Resume - Skills

    New behavior:
      1. Resume - Skills
  */

  const parsedSkillsSection = sections.find(
    (section) =>
      section.section === "skills"
  );

  const resumeSkills = uniqueStrings(
    resume.skills
  );

  if (
    parsedSkillsSection ||
    resumeSkills.length > 0
  ) {
    const skillsParts = [];

    if (
      parsedSkillsSection?.content
    ) {
      skillsParts.push(
        parsedSkillsSection.content
      );
    }

    if (resumeSkills.length > 0) {
      skillsParts.push(
        `Skills detected from the user's resume:\n${resumeSkills.join(
          ", "
        )}`
      );
    }

    const skillsContent = uniqueStrings(
      skillsParts
    ).join("\n\n");

    if (skillsContent.trim()) {
      documents.push({
        type: "resume",
        section: "skills",
        title: "Resume - Skills",
        content: skillsContent,
      });
    }
  }

  /*
    Create all other resume sections.

    IMPORTANT:
    Skip the original skills section because we already
    created the canonical Resume - Skills document above.
  */

  for (const section of sections) {
    if (section.section === "skills") {
      continue;
    }

    const chunks = splitLargeSection(section);

    for (
      let index = 0;
      index < chunks.length;
      index++
    ) {
      const chunk = chunks[index];

      let title =
        section.section === "header"
          ? "Resume - Header"
          : `Resume - ${section.section}`;

      if (chunks.length > 1) {
        title += ` (${index + 1}/${chunks.length})`;
      }

      documents.push({
        type: "resume",
        section: chunk.section,
        title,
        content: chunk.content,
      });
    }
  }

  return deduplicateDocuments(
    documents
  );
}

/* =========================================================
   CREATE PROFILE DOCUMENTS
========================================================= */

function createProfileDocuments(profile) {
  if (!profile) {
    return [];
  }

  const profileText = [
    profile.name
      ? `Name: ${profile.name}`
      : "",

    profile.skills
      ? `Skills: ${profile.skills}`
      : "",

    profile.experience
      ? `Experience: ${profile.experience}`
      : "",

    profile.location
      ? `Location: ${profile.location}`
      : "",

    profile.education
      ? `Education: ${profile.education}`
      : "",

    profile.summary
      ? `Summary: ${profile.summary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!profileText.trim()) {
    return [];
  }

  return [
    {
      type: "profile",
      title: "Candidate Profile",
      content: profileText,
    },
  ];
}

/* =========================================================
   CREATE JOB DOCUMENTS
========================================================= */

function createJobDocuments(jobs) {
  if (!Array.isArray(jobs)) {
    return [];
  }

  const documents = [];

  for (const job of jobs) {
    const content = [
      `Job Title: ${job.title || ""}`,

      `Company: ${job.company || ""}`,

      `Location: ${job.location || ""}`,

      `Salary: ${
        job.salary
          ? `₹${job.salary}`
          : "Not specified"
      }`,

      Array.isArray(job.skills) &&
      job.skills.length > 0
        ? `Required Skills: ${job.skills.join(
            ", "
          )}`
        : "",

      job.description
        ? `Description: ${job.description}`
        : "",

      Array.isArray(job.responsibilities) &&
      job.responsibilities.length > 0
        ? `Responsibilities: ${job.responsibilities.join(
            "; "
          )}`
        : "",

      Array.isArray(job.requirements) &&
      job.requirements.length > 0
        ? `Requirements: ${job.requirements.join(
            "; "
          )}`
        : "",

      Array.isArray(job.niceToHave) &&
      job.niceToHave.length > 0
        ? `Nice to Have: ${job.niceToHave.join(
            "; "
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!content.trim()) {
      continue;
    }

    documents.push({
      type: "job",

      title:
        `${job.title || "Job"} at ${
          job.company || "Company"
        }`,

      jobId:
        job._id?.toString?.() ||
        job.id ||
        null,

      content,
    });
  }

  return deduplicateDocuments(
    documents
  );
}

/* =========================================================
   QUERY INTENT
========================================================= */

function detectQueryIntent(question) {
  const q = String(question || "")
    .toLowerCase()
    .trim();

  const asksAboutSkills =
    /\b(skill|skills|technology|technologies|stack|tools|know|good at)\b/.test(
      q
    );

  const asksAboutMyProfile =
    /\b(my|i have|i know|my resume|my profile)\b/.test(
      q
    );

  const asksAboutJobs =
    /\b(job|jobs|role|roles|position|positions|company|companies)\b/.test(
      q
    );

  const asksAboutExperience =
    /\b(experience|project|projects|internship|internships)\b/.test(
      q
    );

  return {
    asksAboutSkills,
    asksAboutMyProfile,
    asksAboutJobs,
    asksAboutExperience,
  };
}

/* =========================================================
   BUILD KNOWLEDGE BASE
========================================================= */

async function buildKnowledgeBase({
  resume,
  profile,
  jobs,
}) {
  const rawDocuments = [
    ...createResumeDocuments(resume),
    ...createProfileDocuments(profile),
    ...createJobDocuments(jobs),
  ];

  const documents =
    deduplicateDocuments(rawDocuments);

  console.log(
    `📚 RAG documents created: ${documents.length}`
  );

  const counts = documents.reduce(
    (result, document) => {
      result[document.type] =
        (result[document.type] || 0) + 1;

      return result;
    },
    {}
  );

  console.log(
    "📊 RAG document counts:",
    counts
  );

  if (documents.length === 0) {
    return [];
  }

  const embeddedDocuments = [];

  for (const document of documents) {
    try {
      const textForEmbedding = [
        `Type: ${document.type}`,

        document.section
          ? `Section: ${document.section}`
          : "",

        `Title: ${document.title}`,

        document.content,
      ]
        .filter(Boolean)
        .join("\n");

      const embedding =
        await createEmbedding(
          textForEmbedding
        );

      embeddedDocuments.push({
        ...document,
        embedding,
      });
    } catch (error) {
      console.error(
        "⚠️ Failed to embed:",
        document.title,
        error.message
      );
    }
  }

  console.log(
    `✅ RAG embeddings created: ${embeddedDocuments.length}`
  );

  return embeddedDocuments;
}

/* =========================================================
   RETRIEVE RELEVANT DOCUMENTS
========================================================= */

async function retrieveRelevantDocuments({
  question,
  documents,
  topK = 5,
}) {
  if (
    !question ||
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  const questionEmbedding =
    await createEmbedding(question);

  const intent =
    detectQueryIntent(question);

  const scoredDocuments =
    documents.map((document) => {
      const similarity =
        cosineSimilarity(
          questionEmbedding,
          document.embedding
        );

      let adjustedScore =
        similarity;

      /* ---------------------------------------------------
         QUERY-AWARE BOOSTING
      --------------------------------------------------- */

      const isResumeSkillsDocument =
        document.type === "resume" &&
        document.section === "skills";

      const isAnyResumeDocument =
        document.type === "resume";

      const isJobDocument =
        document.type === "job";

      /*
        Strongly prefer the user's own skills
        when asking about skills.
      */
      if (
        intent.asksAboutSkills &&
        isResumeSkillsDocument
      ) {
        adjustedScore += 0.20;
      }

      /*
        Prefer resume/profile information when
        the user asks about themselves.
      */
      if (
        intent.asksAboutMyProfile &&
        isAnyResumeDocument
      ) {
        adjustedScore += 0.08;
      }

      /*
        Keep jobs useful, but prevent job text from
        dominating a question about the user's own skills.
      */
      if (
        intent.asksAboutSkills &&
        isJobDocument
      ) {
        adjustedScore -= 0.03;
      }

      return {
        ...document,
        rawScore: similarity,
        score: adjustedScore,
      };
    });

  scoredDocuments.sort(
    (a, b) =>
      b.score - a.score
  );

  /*
    Remove duplicates after scoring as a second
    safety layer.

    This makes retrieval resilient even if duplicate
    documents somehow enter the knowledge base.
  */
  const uniqueScoredDocuments = [];
  const seenKeys = new Set();

  for (const document of scoredDocuments) {
    const key =
      documentDeduplicationKey(
        document
      );

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueScoredDocuments.push(
      document
    );
  }

  let selected =
    uniqueScoredDocuments.slice(
      0,
      topK
    );

  /*
    Always include the canonical resume skills
    document for explicit skill questions.
  */
  if (intent.asksAboutSkills) {
    const skillsDocument =
      uniqueScoredDocuments.find(
        (document) =>
          document.type === "resume" &&
          document.section === "skills"
      );

    if (
      skillsDocument &&
      !selected.some(
        (document) =>
          document.type === "resume" &&
          document.section === "skills"
      )
    ) {
      selected =
        selected.slice(
          0,
          Math.max(0, topK - 1)
        );

      selected.push(
        skillsDocument
      );

      selected.sort(
        (a, b) =>
          b.score - a.score
      );
    }
  }

  return selected.map(
    (document) => ({
      type:
        document.type,

      section:
        document.section ||
        null,

      title:
        document.title,

      jobId:
        document.jobId ||
        null,

      score:
        Math.round(
          Math.max(
            0,
            Math.min(
              1,
              document.rawScore
            )
          ) * 100
        ),

      content:
        document.content,
    })
  );
}

/* =========================================================
   BUILD RAG CONTEXT
========================================================= */

function buildRAGContext(documents) {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return "";
  }

  return documents
    .map(
      (document, index) => {
        return [
          `SOURCE ${index + 1}`,

          `TYPE: ${document.type}`,

          document.section
            ? `SECTION: ${document.section}`
            : "",

          `TITLE: ${document.title}`,

          `RELEVANCE: ${document.score}%`,

          `CONTENT:`,

          document.content,
        ]
          .filter(Boolean)
          .join("\n");
      }
    )
    .join(
      "\n\n--------------------\n\n"
    );
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  buildKnowledgeBase,

  retrieveRelevantDocuments,

  buildRAGContext,

  createResumeDocuments,

  createProfileDocuments,

  createJobDocuments,

  splitResumeIntoSections,
};