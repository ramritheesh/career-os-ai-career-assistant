const express = require("express");
const { ObjectId } = require("mongodb");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  buildKnowledgeBase,
  retrieveRelevantDocuments,
  buildRAGContext,
} = require("../services/ragService");

const {
  generateCareerAnswer,
} = require("../services/geminiService");

/* =========================================================
   ROUTER
========================================================= */

function createMatchExplanationRouter({
  resumesCollection,
  profilesCollection,
  jobsCollection,
}) {
  const router = express.Router();

  /* =======================================================
     POST /api/jobs/:id/explain-match
  ======================================================= */

  router.post(
    "/:id/explain-match",
    authenticateToken,
    async (req, res) => {
      try {
        /* -----------------------------------------------
           Validate user
        ----------------------------------------------- */

        if (
          !req.user?.userId ||
          !ObjectId.isValid(
            req.user.userId
          )
        ) {
          return res.status(401).json({
            message:
              "Invalid user ID.",
          });
        }

        /* -----------------------------------------------
           Validate job ID
        ----------------------------------------------- */

        const {
          id,
        } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            message:
              "Invalid job ID.",
          });
        }

        const userId =
          new ObjectId(
            req.user.userId
          );

        const jobId =
          new ObjectId(id);

        /* -----------------------------------------------
           Get resume
        ----------------------------------------------- */

        const resume =
          await resumesCollection.findOne({
            userId,
          });

        if (
          !resume ||
          !resume.text?.trim()
        ) {
          return res.status(404).json({
            message:
              "Please upload a resume first.",
          });
        }

        /* -----------------------------------------------
           Get profile
        ----------------------------------------------- */

        const profile =
          await profilesCollection.findOne({
            userId,
          });

        /* -----------------------------------------------
           Get job
        ----------------------------------------------- */

        const job =
          await jobsCollection.findOne({
            _id: jobId,
          });

        if (!job) {
          return res.status(404).json({
            message:
              "Job not found.",
          });
        }

        /* -----------------------------------------------
           Build KB using user's resume + profile
           + ONLY selected job
        ----------------------------------------------- */

        const knowledgeBase =
          await buildKnowledgeBase({
            resume,

            profile,

            jobs: [job],
          });

        if (
          knowledgeBase.length === 0
        ) {
          return res.status(404).json({
            message:
              "No career information available for analysis.",
          });
        }

        /* -----------------------------------------------
           Ask a very specific question
        ----------------------------------------------- */

        const question = `
Explain why I am or am not a good match for the selected job.

Selected job:
${job.title || "Unknown role"} at ${
          job.company ||
          "Unknown company"
        }

Analyze my resume and the selected job.

Give the answer in these sections:

1. Overall Match
2. Why I Match
3. Matching Skills
4. Missing or Weak Skills
5. Recommended Improvements

Be factual. Use only the supplied career context.
Do not invent experience or skills.
`;

        /* -----------------------------------------------
           Retrieve relevant documents
        ----------------------------------------------- */

        const retrievedDocuments =
          await retrieveRelevantDocuments({
            question,

            documents:
              knowledgeBase,

            topK: 6,
          });

        /* -----------------------------------------------
           Ensure selected job is present
        ----------------------------------------------- */

        const selectedJobInResults =
          retrievedDocuments.some(
            (document) =>
              document.jobId ===
              id
          );

        if (
          !selectedJobInResults
        ) {
          retrievedDocuments.push({
            type: "job",

            section: null,

            title:
              `${job.title || "Job"} at ${
                job.company ||
                "Company"
              }`,

            jobId: id,

            score: 100,

            content: [
              `Job Title: ${
                job.title || ""
              }`,

              `Company: ${
                job.company || ""
              }`,

              `Location: ${
                job.location || ""
              }`,

              Array.isArray(
                job.skills
              )
                ? `Required Skills: ${job.skills.join(
                    ", "
                  )}`
                : "",

              job.description
                ? `Description: ${job.description}`
                : "",

              Array.isArray(
                job.responsibilities
              )
                ? `Responsibilities: ${job.responsibilities.join(
                    "; "
                  )}`
                : "",

              Array.isArray(
                job.requirements
              )
                ? `Requirements: ${job.requirements.join(
                    "; "
                  )}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
          });
        }

        /* -----------------------------------------------
           Build context
        ----------------------------------------------- */

        const context =
          buildRAGContext(
            retrievedDocuments
          );

        /* -----------------------------------------------
           Generate explanation
        ----------------------------------------------- */

        const generated =
          await generateCareerAnswer({
            question,

            context,
          });

        /* -----------------------------------------------
           Response
        ----------------------------------------------- */

        res.json({
          success: true,

          job: {
            id: id,

            title:
              job.title || "",

            company:
              job.company || "",

            location:
              job.location || "",
          },

          answer:
            generated.answer,

          model:
            generated.model,

          source:
            generated.source,

          sources:
            retrievedDocuments.map(
              (document) => ({
                type:
                  document.type,

                title:
                  document.title,

                jobId:
                  document.jobId ||
                  null,

                relevance:
                  document.score,
              })
            ),
        });
      } catch (error) {
        console.error(
          "❌ Match explanation error:",
          error
        );

        res.status(500).json({
          message:
            "Failed to explain job match.",

          error:
            error.message,
        });
      }
    }
  );

  return router;
}

module.exports =
  createMatchExplanationRouter;