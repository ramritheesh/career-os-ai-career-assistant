const {
  createEmbedding,
} = require("./embeddingService");

const {
  cosineSimilarity,
  similarityToPercentage,
} = require("./similarityService");

/* =========================================================
   NORMALIZE RESUME TEXT
========================================================= */

function getResumeText(resumeInput) {
  /*
    Support either:
      calculateSemanticMatch("resume text", job)

    or:
      calculateSemanticMatch(resumeObject, job)
  */

  if (
    typeof resumeInput ===
    "string"
  ) {
    return resumeInput.trim();
  }

  if (
    resumeInput &&
    typeof resumeInput ===
      "object"
  ) {
    if (
      typeof resumeInput.text ===
      "string"
    ) {
      return resumeInput.text.trim();
    }

    if (
      typeof resumeInput.resumeText ===
      "string"
    ) {
      return resumeInput.resumeText.trim();
    }

    if (
      typeof resumeInput.content ===
      "string"
    ) {
      return resumeInput.content.trim();
    }
  }

  return "";
}

/* =========================================================
   BUILD JOB TEXT
========================================================= */

function buildJobText(job) {
  if (!job) {
    return "";
  }

  const skills = Array.isArray(
    job.skills
  )
    ? job.skills.join(", ")
    : "";

  const responsibilities =
    Array.isArray(
      job.responsibilities
    )
      ? job.responsibilities.join(
          ". "
        )
      : "";

  const requirements =
    Array.isArray(
      job.requirements
    )
      ? job.requirements.join(
          ". "
        )
      : "";

  const niceToHave =
    Array.isArray(
      job.niceToHave
    )
      ? job.niceToHave.join(
          ". "
        )
      : "";

  return [
    job.title
      ? `Job Title: ${job.title}`
      : "",

    job.company
      ? `Company: ${job.company}`
      : "",

    job.location
      ? `Location: ${job.location}`
      : "",

    skills
      ? `Required Skills: ${skills}`
      : "",

    job.description
      ? `Description: ${job.description}`
      : "",

    responsibilities
      ? `Responsibilities: ${responsibilities}`
      : "",

    requirements
      ? `Requirements: ${requirements}`
      : "",

    niceToHave
      ? `Nice To Have: ${niceToHave}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
   CALCULATE SEMANTIC MATCH
========================================================= */

async function calculateSemanticMatch(
  resumeInput,
  job
) {
  const resumeText =
    getResumeText(
      resumeInput
    );

  if (!resumeText) {
    return {
      score: 0,
      similarity: 0,
      percentage: 0,
    };
  }

  const jobText =
    buildJobText(job);

  if (!jobText) {
    return {
      score: 0,
      similarity: 0,
      percentage: 0,
    };
  }

  try {
    const [
      resumeEmbedding,
      jobEmbedding,
    ] = await Promise.all([
      createEmbedding(
        resumeText
      ),

      createEmbedding(
        jobText
      ),
    ]);

    const similarity =
      cosineSimilarity(
        resumeEmbedding,
        jobEmbedding
      );

    const percentage =
      similarityToPercentage(
        similarity
      );

    return {
      score: percentage,

      similarity,

      percentage,

      resumeTextLength:
        resumeText.length,

      jobTextLength:
        jobText.length,
    };
  } catch (error) {
    console.error(
      "❌ Semantic matching failed:",
      error
    );

    throw error;
  }
}

module.exports = {
  calculateSemanticMatch,
  buildJobText,
};