// backend/routes/resumeAnalysis.js

const express = require("express");

const {
  ObjectId,
} = require("mongodb");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  analyzeResume,
} = require("../services/resumeAnalyzer");

function createResumeAnalysisRouter({
  resumesCollection,
  profilesCollection,
}) {
  const router =
    express.Router();

  // ===================================================
  // GET AI RESUME ANALYSIS
  // ===================================================

  router.get(
    "/analyze",
    authenticateToken,
    async (req, res) => {
      try {
        if (
          !req.user?.userId ||
          !ObjectId.isValid(
            req.user.userId
          )
        ) {
          return res.status(401).json({
            message:
              "Invalid authenticated user.",
          });
        }

        const userId =
          new ObjectId(
            req.user.userId
          );

        const resume =
          await resumesCollection.findOne({
            userId,
          });

        if (
          !resume ||
          !resume.text ||
          !resume.text.trim()
        ) {
          return res.status(404).json({
            message:
              "No readable resume found. Upload a resume first.",
          });
        }

        const profile =
          await profilesCollection.findOne({
            userId,
          });

        const analysis =
          await analyzeResume(
            resume,
            profile
          );

        res.json({
          success: true,
          analysis,
        });
      } catch (error) {
        console.error(
          "❌ Resume analysis error:",
          error
        );

        res.status(500).json({
          message:
            "Failed to analyze resume.",

          error:
            error.message,
        });
      }
    }
  );

  return router;
}

module.exports =
  createResumeAnalysisRouter;