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
   CONSTANTS
========================================================= */

const MAX_HISTORY_MESSAGES = 12;

/* =========================================================
   HELPERS
========================================================= */

function buildConversationPrompt({
  question,
  history,
}) {
  const cleanQuestion = String(
    question || ""
  ).trim();

  if (!Array.isArray(history) || history.length === 0) {
    return cleanQuestion;
  }

  const historyText = history
    .map((message) => {
      const role =
        message.role === "assistant"
          ? "Career.OS"
          : "User";

      return `${role}: ${String(
        message.content || ""
      ).trim()}`;
    })
    .filter((line) => line.trim())
    .join("\n\n");

  return `
You are continuing an ongoing career conversation.

Use the conversation history only to understand references,
follow-up questions, and context.

IMPORTANT:
- The latest RAG context is the source of truth for the user's
  resume, profile, and jobs.
- Do not invent information that is not supported by the RAG context.
- Do not treat previous AI responses as more authoritative than
  the retrieved resume/job/profile information.
- Answer the user's latest question directly.
- If the latest question refers to "it", "that skill", "the role",
  "those jobs", etc., resolve the reference using the conversation
  history.

CONVERSATION HISTORY:
--------------------
${historyText}
--------------------

LATEST USER QUESTION:
${cleanQuestion}
`.trim();
}

function formatHistoryForResponse(messages) {
  return messages.map((message) => ({
    id: message._id?.toString?.() || null,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

/* =========================================================
   ROUTER
========================================================= */

function createCareerChatRouter({
  resumesCollection,
  profilesCollection,
  jobsCollection,
  chatHistoryCollection,
}) {
  const router = express.Router();

  /* =======================================================
     GET /api/chat/history

     Load previous conversation messages.
  ======================================================= */

  router.get(
    "/history",
    authenticateToken,
    async (req, res) => {
      try {
        if (
          !req.user?.userId ||
          !ObjectId.isValid(req.user.userId)
        ) {
          return res.status(401).json({
            message: "Invalid user ID.",
          });
        }

        if (!chatHistoryCollection) {
          return res.status(500).json({
            message:
              "Chat history collection is not configured.",
          });
        }

        const userId = new ObjectId(
          req.user.userId
        );

        const messages =
          await chatHistoryCollection
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(MAX_HISTORY_MESSAGES)
            .toArray();

        messages.reverse();

        return res.json({
          success: true,
          messages:
            formatHistoryForResponse(
              messages
            ),
        });
      } catch (error) {
        console.error(
          "❌ Load chat history error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to load chat history.",
          error: error.message,
        });
      }
    }
  );

  /* =======================================================
     DELETE /api/chat/history

     Clear the user's Career.OS chat history.
  ======================================================= */

  router.delete(
    "/history",
    authenticateToken,
    async (req, res) => {
      try {
        if (
          !req.user?.userId ||
          !ObjectId.isValid(req.user.userId)
        ) {
          return res.status(401).json({
            message: "Invalid user ID.",
          });
        }

        if (!chatHistoryCollection) {
          return res.status(500).json({
            message:
              "Chat history collection is not configured.",
          });
        }

        const userId = new ObjectId(
          req.user.userId
        );

        const result =
          await chatHistoryCollection.deleteMany({
            userId,
          });

        return res.json({
          success: true,
          message:
            "Career AI chat history cleared.",
          deletedCount:
            result.deletedCount,
        });
      } catch (error) {
        console.error(
          "❌ Clear chat history error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to clear chat history.",
          error: error.message,
        });
      }
    }
  );

  /* =======================================================
     POST /api/chat/retrieve

     RAG retrieval only.
  ======================================================= */

  router.post(
    "/retrieve",
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
            message: "Invalid user ID.",
          });
        }

        /* -----------------------------------------------
           Validate question
        ----------------------------------------------- */

        const { question } = req.body;

        if (
          !question ||
          typeof question !== "string" ||
          !question.trim()
        ) {
          return res.status(400).json({
            message: "Question is required.",
          });
        }

        const userId = new ObjectId(
          req.user.userId
        );

        /* -----------------------------------------------
           Load resume
        ----------------------------------------------- */

        const resume =
          await resumesCollection.findOne({
            userId,
          });

        /* -----------------------------------------------
           Load profile
        ----------------------------------------------- */

        const profile =
          await profilesCollection.findOne({
            userId,
          });

        /* -----------------------------------------------
           Load global jobs
        ----------------------------------------------- */

        const jobs =
          await jobsCollection
            .find({})
            .toArray();

        /* -----------------------------------------------
           Build knowledge base
        ----------------------------------------------- */

        const knowledgeBase =
          await buildKnowledgeBase({
            resume,
            profile,
            jobs,
          });

        if (knowledgeBase.length === 0) {
          return res.status(404).json({
            message:
              "No career information found. Upload a resume or complete your profile first.",
          });
        }

        /* -----------------------------------------------
           Retrieve relevant documents
        ----------------------------------------------- */

        const retrievedDocuments =
          await retrieveRelevantDocuments({
            question: question.trim(),
            documents: knowledgeBase,
            topK: 5,
          });

        /* -----------------------------------------------
           Build RAG context
        ----------------------------------------------- */

        const context =
          buildRAGContext(
            retrievedDocuments
          );

        /* -----------------------------------------------
           Response
        ----------------------------------------------- */

        return res.json({
          success: true,

          question:
            question.trim(),

          retrievedDocuments,

          context,

          metadata: {
            totalDocuments:
              knowledgeBase.length,

            retrievedDocuments:
              retrievedDocuments.length,
          },
        });
      } catch (error) {
        console.error(
          "❌ RAG retrieval error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to retrieve career information.",
          error: error.message,
        });
      }
    }
  );

  /* =======================================================
     POST /api/chat/ask

     Full RAG:
     Retrieval + conversation history + Gemini generation
  ======================================================= */

  router.post(
    "/ask",
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
            message: "Invalid user ID.",
          });
        }

        /* -----------------------------------------------
           Validate question
        ----------------------------------------------- */

        const { question } = req.body;

        if (
          !question ||
          typeof question !== "string" ||
          !question.trim()
        ) {
          return res.status(400).json({
            message:
              "Question is required.",
          });
        }

        const cleanQuestion =
          question.trim();

        const userId = new ObjectId(
          req.user.userId
        );

        /* -----------------------------------------------
           Load previous conversation
        ----------------------------------------------- */

        let history = [];

        if (chatHistoryCollection) {
          history =
            await chatHistoryCollection
              .find({ userId })
              .sort({ createdAt: -1 })
              .limit(MAX_HISTORY_MESSAGES)
              .toArray();

          history.reverse();
        }

        /* -----------------------------------------------
           Load user's resume
        ----------------------------------------------- */

        const resume =
          await resumesCollection.findOne({
            userId,
          });

        /* -----------------------------------------------
           Load user's profile
        ----------------------------------------------- */

        const profile =
          await profilesCollection.findOne({
            userId,
          });

        /* -----------------------------------------------
           Load jobs
        ----------------------------------------------- */

        const jobs =
          await jobsCollection
            .find({})
            .toArray();

        /* -----------------------------------------------
           Build knowledge base
        ----------------------------------------------- */

        const knowledgeBase =
          await buildKnowledgeBase({
            resume,
            profile,
            jobs,
          });

        if (knowledgeBase.length === 0) {
          return res.status(404).json({
            message:
              "No career information found. Upload a resume or complete your profile first.",
          });
        }

        /* -----------------------------------------------
           Retrieve relevant documents
        ----------------------------------------------- */

        const retrievedDocuments =
          await retrieveRelevantDocuments({
            question: cleanQuestion,
            documents: knowledgeBase,
            topK: 5,
          });

        if (
          retrievedDocuments.length === 0
        ) {
          return res.status(404).json({
            message:
              "No relevant career information was found.",
          });
        }

        /* -----------------------------------------------
           Build RAG context
        ----------------------------------------------- */

        const context =
          buildRAGContext(
            retrievedDocuments
          );

        /* -----------------------------------------------
           Build conversation-aware prompt
        ----------------------------------------------- */

        const conversationAwareQuestion =
          buildConversationPrompt({
            question: cleanQuestion,
            history,
          });

        /* -----------------------------------------------
           Generate answer
        ----------------------------------------------- */

        const generated =
          await generateCareerAnswer({
            question:
              conversationAwareQuestion,

            context,
          });

        /* -----------------------------------------------
           Save conversation
        ----------------------------------------------- */

        if (chatHistoryCollection) {
          const now =
            new Date();

          await chatHistoryCollection.insertMany(
            [
              {
                userId,
                role: "user",
                content:
                  cleanQuestion,
                createdAt: now,
              },

              {
                userId,
                role: "assistant",
                content:
                  generated.answer,
                createdAt:
                  new Date(
                    now.getTime() + 1
                  ),
                model:
                  generated.model ||
                  null,
              },
            ]
          );

          /*
            Keep the collection small.

            We keep the latest 40 messages
            (20 user/assistant turns) for each user.
          */

          const allMessages =
            await chatHistoryCollection
              .find({ userId })
              .sort({
                createdAt: -1,
              })
              .toArray();

          if (
            allMessages.length > 40
          ) {
            const messagesToDelete =
              allMessages.slice(40);

            const idsToDelete =
              messagesToDelete
                .map(
                  (message) =>
                    message._id
                )
                .filter(Boolean);

            if (
              idsToDelete.length > 0
            ) {
              await chatHistoryCollection.deleteMany(
                {
                  _id: {
                    $in: idsToDelete,
                  },
                }
              );
            }
          }
        }

        /* -----------------------------------------------
           Response
        ----------------------------------------------- */

        return res.json({
          success: true,

          question:
            cleanQuestion,

          answer:
            generated.answer,

          model:
            generated.model,

          source:
            generated.source ||
            "gemini",

          geminiError:
            generated.geminiError ||
            null,

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

          retrievedDocuments,

          historyUsed:
            history.length,

          metadata: {
            totalDocuments:
              knowledgeBase.length,

            retrievedDocuments:
              retrievedDocuments.length,

            historyMessages:
              history.length,
          },
        });
      } catch (error) {
        console.error(
          "❌ Career chat error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to generate career answer.",
          error: error.message,
        });
      }
    }
  );

  return router;
}

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  createCareerChatRouter;