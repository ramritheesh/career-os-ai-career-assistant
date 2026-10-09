const {
  createEmbedding,
} = require("./embeddingService");

const {
  cosineSimilarity,
  similarityToPercentage,
} = require("./similarityService");

/* =========================================================
   CONSTANTS
========================================================= */

const ANALYZER_NAME =
  "local-transformer-career-analyzer";

/* =========================================================
   ROLE PROFILES
========================================================= */

const ROLE_PROFILES = [
  {
    role: "AI / ML Engineer",

    skills: [
      "python",
      "machine learning",
      "artificial intelligence",
      "sql",
      "scikit-learn",
      "pytorch",
      "tensorflow",
      "pandas",
      "numpy",
      "fastapi",
      "git",
      "docker",
    ],

    description:
      "Build machine learning and artificial intelligence applications using Python, ML frameworks, APIs and data processing tools.",
  },

  {
    role: "Generative AI Engineer",

    skills: [
      "python",
      "large language models",
      "generative ai",
      "rag",
      "prompt engineering",
      "google gemini api",
      "hugging face",
      "transformers",
      "fastapi",
      "rest api",
      "docker",
      "git",
    ],

    description:
      "Build LLM-powered and generative AI applications, RAG systems, prompts, AI APIs and production-ready backend services.",
  },

  {
    role: "Data Scientist",

    skills: [
      "python",
      "sql",
      "machine learning",
      "scikit-learn",
      "pandas",
      "numpy",
      "statistics",
      "xgboost",
      "pytorch",
      "tensorflow",
      "data visualization",
    ],

    description:
      "Analyze data, develop predictive models, perform experimentation and communicate data-driven insights.",
  },

  {
    role: "Data Engineer",

    skills: [
      "python",
      "sql",
      "postgresql",
      "mysql",
      "duckdb",
      "apache parquet",
      "pandas",
      "numpy",
      "docker",
      "git",
      "bash",
      "data processing",
    ],

    description:
      "Build data processing workflows, SQL-based systems, analytical pipelines and reliable data infrastructure.",
  },
];

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .toLowerCase()
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSkill(value) {
  return normalizeText(value)
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   SKILL ALIASES
========================================================= */

const SKILL_ALIASES = {
  python: [
    "python",
    "python3",
  ],

  sql: [
    "sql",
  ],

  javascript: [
    "javascript",
    "javascript es6",
    "js",
    "ecmascript",
  ],

  typescript: [
    "typescript",
    "typescript 5",
    "ts",
  ],

  "c++": [
    "c++",
    "cpp",
  ],

  java: [
    "java",
  ],

  "machine learning": [
    "machine learning",
    "machine-learning",
    "machinelearning",
  ],

  "deep learning": [
    "deep learning",
    "deeplearning",
  ],

  "artificial intelligence": [
    "artificial intelligence",
    "artificial-intelligence",
  ],

  "generative ai": [
    "generative ai",
    "generativeai",
    "gen ai",
    "genai",
  ],

  "large language models": [
    "large language models",
    "large language model",
    "llm",
    "llms",
  ],

  rag: [
    "rag",
    "retrieval augmented generation",
    "retrieval-augmented generation",
  ],

  "prompt engineering": [
    "prompt engineering",
  ],

  "google gemini api": [
    "google gemini api",
    "gemini api",
  ],

  "google gen ai sdk": [
    "google gen ai sdk",
  ],

  "hugging face": [
    "hugging face",
    "huggingface",
  ],

  transformers: [
    "transformers",
    "hugging face transformers",
  ],

  "scikit-learn": [
    "scikit-learn",
    "scikit learn",
    "sklearn",
  ],

  pytorch: [
    "pytorch",
    "torch",
  ],

  tensorflow: [
    "tensorflow",
  ],

  xgboost: [
    "xgboost",
  ],

  pandas: [
    "pandas",
  ],

  numpy: [
    "numpy",
  ],

  fastapi: [
    "fastapi",
  ],

  uvicorn: [
    "uvicorn",
  ],

  "rest api": [
    "rest api",
    "restful api",
    "rest api design",
    "restful api design",
  ],

  pydantic: [
    "pydantic",
  ],

  react: [
    "react",
    "react.js",
    "reactjs",
  ],

  streamlit: [
    "streamlit",
  ],

  postgresql: [
    "postgresql",
    "postgres",
  ],

  mysql: [
    "mysql",
  ],

  mongodb: [
    "mongodb",
    "mongo db",
    "mongo",
  ],

  duckdb: [
    "duckdb",
  ],

  "apache parquet": [
    "apache parquet",
    "parquet",
  ],

  docker: [
    "docker",
    "docker basics",
  ],

  git: [
    "git",
  ],

  github: [
    "github",
    "git hub",
  ],

  postman: [
    "postman",
  ],

  pytest: [
    "pytest",
  ],

  bash: [
    "bash",
    "bash scripting",
  ],

  shell: [
    "shell",
    "shell scripting",
    "bash/shell",
  ],

  statistics: [
    "statistics",
    "statistical analysis",
  ],

  "data visualization": [
    "data visualization",
    "data visualisation",
  ],

  "data processing": [
    "data processing",
  ],

  html: [
    "html",
    "html5",
  ],

  css: [
    "css",
    "css3",
  ],
};

/* =========================================================
   EXTRACT NORMALIZED SKILLS FROM TEXT
========================================================= */

function extractSkillsFromText(text) {
  const normalized =
    normalizeText(text);

  if (!normalized) {
    return [];
  }

  const found = [];

  for (const [
    canonicalSkill,
    aliases,
  ] of Object.entries(
    SKILL_ALIASES
  )) {
    for (const alias of aliases) {
      const normalizedAlias =
        normalizeText(alias);

      if (!normalizedAlias) {
        continue;
      }

      /*
        For short technical tokens such as "sql",
        avoid matching inside unrelated words.
      */
      const requiresWordBoundary =
        normalizedAlias.length <= 4;

      let matched = false;

      if (requiresWordBoundary) {
        const escaped =
          normalizedAlias.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const pattern =
          new RegExp(
            `(^|\\s|[,;:()/])${escaped}($|\\s|[,;:()/])`,
            "i"
          );

        matched =
          pattern.test(
            normalized
          );
      } else {
        matched =
          normalized.includes(
            normalizedAlias
          );
      }

      if (matched) {
        found.push(
          canonicalSkill
        );

        break;
      }
    }
  }

  return [
    ...new Set(found),
  ];
}

/* =========================================================
   COMBINE STORED + EXTRACTED SKILLS
========================================================= */

function collectResumeSkills(
  resume
) {
  const fromDatabase =
    Array.isArray(
      resume?.skills
    )
      ? resume.skills
      : [];

  const fromText =
    extractSkillsFromText(
      resume?.text || ""
    );

  const combined = [
    ...fromDatabase,
    ...fromText,
  ]
    .map(normalizeSkill)
    .filter(Boolean);

  /*
    Convert aliases into canonical skill names.
  */

  const canonical =
    combined.map(
      (skill) => {
        for (const [
          canonicalSkill,
          aliases,
        ] of Object.entries(
          SKILL_ALIASES
        )) {
          if (
            aliases.some(
              (alias) =>
                normalizeSkill(
                  alias
                ) === skill
            )
          ) {
            return canonicalSkill;
          }
        }

        return skill;
      }
    );

  return [
    ...new Set(canonical),
  ];
}

/* =========================================================
   SECTION DETECTION
========================================================= */

const SECTION_PATTERNS = [
  {
    name: "summary",

    patterns: [
      /\bsummary\b/i,
      /\bprofessional summary\b/i,
      /\bcareer objective\b/i,
      /\bobjective\b/i,
    ],
  },

  {
    name: "skills",

    patterns: [
      /\bskills\b/i,
      /\btechnical skills\b/i,
      /\btechnical expertise\b/i,
      /\btechnologies\b/i,
    ],
  },

  {
    name: "experience",

    patterns: [
      /\bexperience\b/i,
      /\bwork experience\b/i,
      /\bprofessional experience\b/i,
      /\binternship experience\b/i,
      /\binternships\b/i,
    ],
  },

  {
    name: "projects",

    patterns: [
      /\bprojects\b/i,
      /\bkey projects\b/i,
      /\bacademic projects\b/i,
      /\bpersonal projects\b/i,
    ],
  },

  {
    name: "education",

    patterns: [
      /\beducation\b/i,
      /\bacademic background\b/i,
      /\beducational qualifications\b/i,
    ],
  },

  {
    name: "certifications",

    patterns: [
      /\bcertifications\b/i,
      /\bcertificates\b/i,
      /\bcertification\b/i,
    ],
  },

  {
    name: "achievements",

    patterns: [
      /\bachievements\b/i,
      /\baccomplishments\b/i,
      /\bawards\b/i,
    ],
  },
];

/* =========================================================
   DETECT RESUME SECTIONS
========================================================= */

function detectResumeSections(text) {
  const normalized =
    String(text || "")
      .replace(/\r/g, "\n");

  const lines =
    normalized
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const foundSections = [];

  for (const line of lines) {
    const cleanLine =
      line
        .replace(
          /^[\s\-•*#:]+/,
          ""
        )
        .replace(
          /[\s\-•*#:]+$/,
          ""
        )
        .trim();

    if (!cleanLine) {
      continue;
    }

    for (const section of SECTION_PATTERNS) {
      if (
        section.patterns.some(
          (pattern) =>
            pattern.test(
              cleanLine
            )
        )
      ) {
        foundSections.push(
          section.name
        );

        break;
      }
    }
  }

  return [
    ...new Set(
      foundSections
    ),
  ];
}

/* =========================================================
   ATS SIGNALS
========================================================= */

function calculateATSScore(
  resumeText
) {
  const text =
    String(
      resumeText || ""
    );

  const normalized =
    normalizeText(text);

  const sections =
    detectResumeSections(
      text
    );

  const actionVerbPatterns = [
    /\bbuilt\b/gi,
    /\bdeveloped\b/gi,
    /\bdesigned\b/gi,
    /\bimplemented\b/gi,
    /\bcreated\b/gi,
    /\bdeployed\b/gi,
    /\banalyzed\b/gi,
    /\bdevelop\b/gi,
    /\bengineered\b/gi,
    /\boptimized\b/gi,
    /\btested\b/gi,
    /\bintegrated\b/gi,
    /\bautomated\b/gi,
    /\bmanaged\b/gi,
    /\bled\b/gi,
    /\bimproved\b/gi,
    /\bconfigured\b/gi,
  ];

  let actionVerbCount = 0;

  for (const pattern of actionVerbPatterns) {
    const matches =
      text.match(pattern);

    if (matches) {
      actionVerbCount +=
        matches.length;
    }
  }

  const quantifiedPatterns = [
    /\b\d+(?:\.\d+)?%\b/g,
    /\b\d+(?:\.\d+)?x\b/gi,
    /\b\d+\+\b/g,
    /\b\d+\s*(?:users|records|rows|documents|projects|apis|models|days|months|years)\b/gi,
    /₹\s?\d[\d,]*/g,
    /\$\s?\d[\d,]*/g,
  ];

  let quantifiedResults = 0;

  for (const pattern of quantifiedPatterns) {
    const matches =
      text.match(pattern);

    if (matches) {
      quantifiedResults +=
        matches.length;
    }
  }

  const emailPresent =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
      text
    );

  const phonePresent =
    /\+?\d[\d\s().-]{8,}\d/.test(
      text
    );

  const linkedinPresent =
    /linkedin/i.test(
      normalized
    );

  const githubPresent =
    /github/i.test(
      normalized
    );

  const projectPresent =
    /\bprojects?\b/i.test(
      normalized
    );

  const educationPresent =
    /\beducation\b/i.test(
      normalized
    );

  const experiencePresent =
    /\bexperience\b/i.test(
      normalized
    );

  const skillsPresent =
    /\bskills?\b/i.test(
      normalized
    );

  let score = 0;

  /*
    Structure
  */

  score += Math.min(
    sections.length * 7,
    35
  );

  /*
    Contact
  */

  if (emailPresent) {
    score += 5;
  }

  if (phonePresent) {
    score += 5;
  }

  if (linkedinPresent) {
    score += 3;
  }

  if (githubPresent) {
    score += 3;
  }

  /*
    Important resume sections
  */

  if (projectPresent) {
    score += 4;
  }

  if (educationPresent) {
    score += 4;
  }

  if (experiencePresent) {
    score += 4;
  }

  if (skillsPresent) {
    score += 4;
  }

  /*
    Evidence
  */

  if (actionVerbCount > 0) {
    score += Math.min(
      actionVerbCount,
      12
    );
  }

  if (quantifiedResults > 0) {
    score += Math.min(
      quantifiedResults * 2,
      10
    );
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    score,

    sectionsFound:
      sections.length,

    sections,

    quantifiedResults,

    actionVerbs:
      actionVerbCount,
  };
}

/* =========================================================
   FIND STRENGTHS
========================================================= */

function generateStrengths({
  resumeText,
  skills,
  ats,
}) {
  const strengths = [];

  const text =
    normalizeText(
      resumeText
    );

  /*
    Skill breadth
  */

  if (skills.length >= 15) {
    strengths.push(
      `Strong technical breadth with ${skills.length} detected skills across AI/ML, programming, backend and data tooling.`
    );
  } else if (skills.length >= 8) {
    strengths.push(
      `Good technical foundation with ${skills.length} relevant skills detected from the resume.`
    );
  } else if (skills.length > 0) {
    strengths.push(
      `The resume contains a clear technical skill base with ${skills.length} detected skills.`
    );
  }

  /*
    AI / ML strength
  */

  const aiSkills = [
    "machine learning",
    "artificial intelligence",
    "generative ai",
    "large language models",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "transformers",
  ];

  const aiSkillCount =
    aiSkills.filter(
      (skill) =>
        skills.includes(
          skill
        )
    ).length;

  if (aiSkillCount >= 4) {
    strengths.push(
      "Strong alignment with AI/ML and modern generative AI technologies."
    );
  }

  /*
    Backend strength
  */

  if (
    skills.includes(
      "fastapi"
    ) ||
    skills.includes(
      "rest api"
    )
  ) {
    strengths.push(
      "Backend/API development is represented through practical service-oriented technologies."
    );
  }

  /*
    Data strength
  */

  const dataSkills = [
    "sql",
    "pandas",
    "numpy",
    "postgresql",
    "mysql",
    "duckdb",
    "apache parquet",
  ];

  const dataSkillCount =
    dataSkills.filter(
      (skill) =>
        skills.includes(
          skill
        )
    ).length;

  if (dataSkillCount >= 3) {
    strengths.push(
      "Good data-processing foundation with SQL and Python data tooling."
    );
  }

  /*
    Projects / practical evidence
  */

  if (
    /\bproject(s)?\b/i.test(
      text
    )
  ) {
    strengths.push(
      "The resume includes project-based evidence instead of relying only on a skills list."
    );
  }

  /*
    ATS strengths
  */

  if (
    ats.actionVerbs >= 5
  ) {
    strengths.push(
      "Good use of action-oriented language in experience and project descriptions."
    );
  }

  if (
    ats.quantifiedResults >= 2
  ) {
    strengths.push(
      "The resume includes quantified results or measurable evidence."
    );
  }

  return [
    ...new Set(
      strengths
    ),
  ].slice(0, 6);
}

/* =========================================================
   IMPROVEMENT AREAS
========================================================= */

function generateImprovementAreas({
  resumeText,
  skills,
  ats,
}) {
  const areas = [];

  const text =
    normalizeText(
      resumeText
    );

  if (
    !ats.sections.includes(
      "summary"
    )
  ) {
    areas.push(
      "Add a concise professional summary tailored to the target role."
    );
  }

  if (
    !ats.sections.includes(
      "projects"
    )
  ) {
    areas.push(
      "Make project experience easier for ATS systems and recruiters to identify."
    );
  }

  if (
    ats.quantifiedResults === 0
  ) {
    areas.push(
      "Add measurable outcomes such as accuracy, processing volume, latency, users, records or percentage improvements where truthful."
    );
  }

  if (
    ats.actionVerbs < 4
  ) {
    areas.push(
      "Use stronger action verbs such as built, designed, implemented, deployed and optimized."
    );
  }

  if (
    !/github/i.test(
      text
    )
  ) {
    areas.push(
      "Add a visible GitHub link if you maintain relevant public projects."
    );
  }

  if (
    !/linkedin/i.test(
      text
    )
  ) {
    areas.push(
      "Add a visible LinkedIn URL to improve recruiter accessibility."
    );
  }

  if (
    skills.includes(
      "generative ai"
    ) &&
    !skills.includes(
      "rag"
    )
  ) {
    areas.push(
      "RAG is a useful adjacent skill for Generative AI roles; highlight it only when you have actually implemented it."
    );
  }

  if (
    skills.length < 8
  ) {
    areas.push(
      "Make the technical skills section more comprehensive and role-specific."
    );
  }

  return [
    ...new Set(
      areas
    ),
  ].slice(0, 7);
}

/* =========================================================
   SUGGESTIONS
========================================================= */

function generateSuggestions({
  skills,
  ats,
  improvementAreas,
}) {
  const suggestions = [];

  if (
    !skills.includes(
      "rag"
    )
  ) {
    suggestions.push(
      "Add or strengthen RAG project evidence if you have genuinely built retrieval-augmented applications."
    );
  }

  if (
    ats.quantifiedResults === 0
  ) {
    suggestions.push(
      "Rewrite selected project bullets to include measurable outcomes where you can support them."
    );
  }

  if (
    ats.actionVerbs < 5
  ) {
    suggestions.push(
      "Rewrite weak or descriptive bullets using action + technology + outcome."
    );
  }

  if (
    !skills.includes(
      "docker"
    )
  ) {
    suggestions.push(
      "Consider documenting Docker usage for projects that are actually containerized."
    );
  }

  if (
    !skills.includes(
      "sql"
    )
  ) {
    suggestions.push(
      "Add SQL evidence if you have used databases or analytical queries in real projects."
    );
  }

  suggestions.push(
    "Keep the resume focused on the role you are applying for instead of listing every unrelated technology."
  );

  suggestions.push(
    "Make the strongest projects easy to find and include technologies plus concrete outcomes."
  );

  return [
    ...new Set(
      suggestions
    ),
  ]
    .filter(Boolean)
    .slice(0, 7);
}

/* =========================================================
   ROLE TEXT
========================================================= */

function createRoleText(role) {
  return [
    `Role: ${role.role}`,

    `Description: ${role.description}`,

    `Core skills: ${role.skills.join(
      ", "
    )}`,
  ].join("\n");
}

/* =========================================================
   CALCULATE ROLE RECOMMENDATIONS
========================================================= */

async function calculateRoleRecommendations(
  resumeText,
  skills
) {
  const normalizedResume =
    normalizeText(
      resumeText
    );

  if (!normalizedResume) {
    return [];
  }

  const results = [];

  let resumeEmbedding = null;

  try {
    resumeEmbedding =
      await createEmbedding(
        normalizedResume
      );
  } catch (error) {
    console.error(
      "⚠️ Could not create resume embedding for role analysis:",
      error.message
    );
  }

  for (const role of ROLE_PROFILES) {
    let semanticScore = 0;

    if (resumeEmbedding) {
      try {
        const roleEmbedding =
          await createEmbedding(
            createRoleText(role)
          );

        const similarity =
          cosineSimilarity(
            resumeEmbedding,
            roleEmbedding
          );

        semanticScore =
          similarityToPercentage(
            similarity
          );
      } catch (error) {
        console.error(
          `⚠️ Could not calculate semantic score for ${role.role}:`,
          error.message
        );
      }
    }

    const requiredSkills =
      role.skills.map(
        normalizeSkill
      );

    const normalizedSkills =
      new Set(
        skills.map(
          normalizeSkill
        )
      );

    const matchedSkills =
      requiredSkills.filter(
        (skill) =>
          normalizedSkills.has(
            skill
          )
      );

    const missingSkills =
      requiredSkills.filter(
        (skill) =>
          !normalizedSkills.has(
            skill
          )
      );

    const skillCoverage =
      requiredSkills.length === 0
        ? 0
        : Math.round(
            (matchedSkills.length /
              requiredSkills.length) *
              100
          );

    const finalScore =
      Math.round(
        semanticScore * 0.6 +
          skillCoverage *
            0.4
      );

    results.push({
      role:
        role.role,

      score:
        finalScore,

      semanticScore,

      skillCoverage,

      matchedSkills,

      missingSkills,

      reason:
        `Matches ${matchedSkills.length} of ${requiredSkills.length} core skills with ${semanticScore}% semantic alignment.`,
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score
  );

  return results;
}

/* =========================================================
   CAREER READINESS SCORE
========================================================= */

function calculateCareerReadinessScore({
  atsScore,
  bestRoleScore,
  skillCount,
}) {
  /*
    ATS        = 35%
    Best Role  = 45%
    Skills     = 20%
  */

  const skillComponent =
    Math.min(
      100,
      skillCount * 3
    );

  return Math.round(
    atsScore * 0.35 +
      bestRoleScore * 0.45 +
      skillComponent * 0.20
  );
}

/* =========================================================
   BUILD SUMMARY
========================================================= */

function buildSummary({
  skills,
  roleRecommendations,
  ats,
}) {
  const bestRole =
    roleRecommendations[0];

  if (!bestRole) {
    return `The resume contains ${skills.length} detected skills and an ATS signal score of ${ats.score}%.`;
  }

  return (
    `Your resume shows ${skills.length} detected skills. ` +
    `The strongest career direction from the current profile is ${bestRole.role} ` +
    `with an estimated alignment of ${bestRole.score}%. ` +
    `The ATS signal score is ${ats.score}%.`
  );
}

/* =========================================================
   PROFILE SUMMARY
========================================================= */

function buildProfileSummary(
  resume,
  profile
) {
  return {
    name:
      profile?.name ||
      "",

    location:
      profile?.location ||
      "",

    experience:
      profile?.experience ||
      "",

    education:
      profile?.education ||
      "",

    summary:
      profile?.summary ||
      "",

    filename:
      resume?.filename ||
      "",
  };
}

/* =========================================================
   ANALYZE RESUME
========================================================= */

async function analyzeResume(
  resume,
  profile = {}
) {
  if (
    !resume ||
    typeof resume !==
      "object"
  ) {
    throw new Error(
      "Resume data is required."
    );
  }

  const resumeText =
    typeof resume.text ===
    "string"
      ? resume.text.trim()
      : "";

  if (!resumeText) {
    throw new Error(
      "No readable resume text found."
    );
  }

  /*
    IMPORTANT:
    Normalize optional profile data here so no nested
    property such as profile.links.github can crash
    the analyzer.
  */

  const safeProfile =
    profile &&
    typeof profile ===
      "object"
      ? profile
      : {};

  const skills =
    collectResumeSkills(
      resume
    );

  const ats =
    calculateATSScore(
      resumeText
    );

  const strengths =
    generateStrengths({
      resumeText,

      skills,

      ats,
    });

  const improvementAreas =
    generateImprovementAreas({
      resumeText,

      skills,

      ats,
    });

  const suggestions =
    generateSuggestions({
      skills,

      ats,

      improvementAreas,
    });

  const roleRecommendations =
    await calculateRoleRecommendations(
      resumeText,
      skills
    );

  const bestRoleScore =
    roleRecommendations.length >
    0
      ? roleRecommendations[0]
          .score
      : 0;

  const careerReadinessScore =
    calculateCareerReadinessScore({
      atsScore:
        ats.score,

      bestRoleScore,

      skillCount:
        skills.length,
    });

  const summary =
    buildSummary({
      skills,

      roleRecommendations,

      ats,
    });

  const profileSummary =
    buildProfileSummary(
      resume,
      safeProfile
    );

  return {
    generatedAt:
      new Date().toISOString(),

    analyzer:
      ANALYZER_NAME,

    careerReadinessScore,

    summary,

    profile:
      profileSummary,

    resume: {
      filename:
        resume.filename ||
        "",

      textLength:
        resumeText.length,

      skillCount:
        skills.length,

      skills,
    },

    ats: {
      score:
        ats.score,

      sectionsFound:
        ats.sectionsFound,

      sections:
        ats.sections,

      quantifiedResults:
        ats.quantifiedResults,

      actionVerbs:
        ats.actionVerbs,
    },

    strengths,

    improvementAreas,

    suggestions,

    roleRecommendations,
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  analyzeResume,

  extractSkillsFromText,

  collectResumeSkills,

  calculateATSScore,

  calculateRoleRecommendations,

  generateStrengths,

  generateImprovementAreas,

  generateSuggestions,

  ROLE_PROFILES,
};