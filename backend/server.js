// =========================================================
// CAREER.OS BACKEND
// =========================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const {
  MongoClient,
  ObjectId,
} = require("mongodb");

const {
  PDFParse,
} = require("pdf-parse");

// =========================================================
// SERVICES
// =========================================================

const {
  calculateSemanticMatch,
} = require("./services/semanticMatcher");

const {
  calculateFinalMatch,
} = require("./services/finalMatcher");

const {
  authenticateToken,
} = require("./middleware/authMiddleware");

// =========================================================
// ROUTERS
// =========================================================

const createResumeAnalysisRouter =
  require("./routes/resumeAnalysis");

const createCareerChatRouter =
  require("./routes/careerChat");

const createMatchExplanationRouter =
  require("./routes/matchExplanation");

// =========================================================
// EXPRESS APP
// =========================================================

const app = express();

const PORT =
  Number(process.env.PORT) || 5000;

const DB_NAME =
  "ai-career-assistant";

// =========================================================
// ENVIRONMENT VALIDATION
// =========================================================

if (!process.env.MONGO_URI) {
  console.error(
    "❌ MONGO_URI is missing from .env"
  );

  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error(
    "❌ JWT_SECRET is missing from .env"
  );

  process.exit(1);
}

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// =========================================================
// UPLOADS
// =========================================================

const uploadsFolder =
  path.join(
    __dirname,
    "uploads"
  );

if (
  !fs.existsSync(
    uploadsFolder
  )
) {
  fs.mkdirSync(
    uploadsFolder,
    {
      recursive: true,
    }
  );
}

app.use(
  "/uploads",
  express.static(
    uploadsFolder
  )
);

// =========================================================
// MULTER
// =========================================================

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        uploadsFolder
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1000000000
        )}${path.extname(
          file.originalname
        )}`;

      cb(
        null,
        uniqueName
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      if (
        file.mimetype ===
        "application/pdf"
      ) {
        cb(
          null,
          true
        );
      } else {
        cb(
          new Error(
            "Only PDF files are allowed."
          )
        );
      }
    },
  });

// =========================================================
// MONGODB
// =========================================================

const MONGO_URI =
  process.env.MONGO_URI;

const client =
  new MongoClient(
    MONGO_URI
  );

let db = null;

let usersCollection = null;
let profilesCollection = null;
let jobsCollection = null;
let resumesCollection = null;
let chatHistoryCollection = null;

// =========================================================
// HELPERS
// =========================================================

function getUserId(req) {
  if (
    !req.user?.userId ||
    !ObjectId.isValid(
      req.user.userId
    )
  ) {
    return null;
  }

  return new ObjectId(
    req.user.userId
  );
}

function normalizeEmail(email) {
  return String(
    email || ""
  )
    .trim()
    .toLowerCase();
}

function normalizeSkills(
  skills
) {
  if (
    Array.isArray(skills)
  ) {
    return [
      ...new Set(
        skills
          .map((skill) =>
            String(
              skill || ""
            ).trim()
          )
          .filter(Boolean)
      ),
    ];
  }

  if (
    typeof skills ===
    "string"
  ) {
    return [
      ...new Set(
        skills
          .split(",")
          .map((skill) =>
            skill.trim()
          )
          .filter(Boolean)
      ),
    ];
  }

  return [];
}

function getResumeText(
  resume
) {
  if (!resume) {
    return "";
  }

  if (
    typeof resume.text ===
    "string"
  ) {
    return resume.text;
  }

  if (
    typeof resume.resumeText ===
    "string"
  ) {
    return resume.resumeText;
  }

  return "";
}

function sanitizeUser(
  user
) {
  if (!user) {
    return null;
  }

  return {
    id:
      user._id?.toString?.() ||
      null,

    email:
      user.email ||
      "",

    createdAt:
      user.createdAt ||
      null,
  };
}

function generateToken(
  user
) {
  return jwt.sign(
    {
      userId:
        user._id.toString(),

      email:
        user.email,
    },

    process.env.JWT_SECRET,

    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "7d",
    }
  );
}

function normalizeSkill(
  skill
) {
  const value =
    String(skill || "")
      .trim()
      .toLowerCase();

  const aliases = {
    ai:
      "artificial intelligence",

    ml:
      "machine learning",

    dl:
      "deep learning",

    reactjs:
      "react",

    "react.js":
      "react",

    node:
      "node.js",

    nodejs:
      "node.js",

    "restful api":
      "rest api",

    rest:
      "rest api",

    postgres:
      "postgresql",

    mongo:
      "mongodb",

    js:
      "javascript",

    ts:
      "typescript",

    sklearn:
      "scikit-learn",

    "gemini api":
      "google gemini api",

    llm:
      "large language models",

    llms:
      "large language models",

    "large language model":
      "large language models",

    "retrieval augmented generation":
      "rag",
  };

  return (
    aliases[value] ||
    value
  );
}

function calculateKeywordMatch(
  resumeSkills,
  jobSkills
) {
  const resumeSet =
    new Set(
      resumeSkills.map(
        normalizeSkill
      )
    );

  const required =
    normalizeSkills(
      jobSkills
    );

  if (
    required.length ===
    0
  ) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const matchedSkills = [];
  const missingSkills = [];

  for (
    const originalSkill
    of required
  ) {
    const normalized =
      normalizeSkill(
        originalSkill
      );

    if (
      resumeSet.has(
        normalized
      )
    ) {
      matchedSkills.push(
        originalSkill
      );
    } else {
      missingSkills.push(
        originalSkill
      );
    }
  }

  const score =
    Math.round(
      (
        matchedSkills.length /
        required.length
      ) * 100
    );

  return {
    score,
    matchedSkills,
    missingSkills,
  };
}

async function getLatestResume(
  userId
) {
  return resumesCollection.findOne(
    {
      userId,
    },
    {
      sort: {
        uploadedAt: -1,
      },
    }
  );
}

// =========================================================
// CONNECT TO MONGODB
// =========================================================

async function connectToMongoDB() {
  await client.connect();

  db =
    client.db(
      DB_NAME
    );

  usersCollection =
    db.collection(
      "users"
    );

  profilesCollection =
    db.collection(
      "profiles"
    );

  jobsCollection =
    db.collection(
      "jobs"
    );

  resumesCollection =
    db.collection(
      "resumes"
    );

  chatHistoryCollection =
    db.collection(
      "chat_history"
    );

  // -------------------------------------------------------
  // INDEXES
  // -------------------------------------------------------

  await usersCollection.createIndex(
    {
      email: 1,
    },
    {
      unique: true,
    }
  );

  // Existing MongoDB index:
  // userId_1 | unique: true | sparse: true
  await profilesCollection.createIndex(
    {
      userId: 1,
    },
    {
      unique: true,
      sparse: true,
    }
  );

  await resumesCollection.createIndex(
    {
      userId: 1,
      uploadedAt: -1,
    }
  );

  await chatHistoryCollection.createIndex(
    {
      userId: 1,
      createdAt: -1,
    }
  );

  console.log(
    "✅ Connected to MongoDB"
  );

  console.log(
    `📦 Database: ${DB_NAME}`
  );

  console.log(
    "📁 Collections ready:"
  );

  console.log(
    "   users"
  );

  console.log(
    "   profiles"
  );

  console.log(
    "   jobs"
  );

  console.log(
    "   resumes"
  );

  console.log(
    "   chat_history"
  );
}

// =========================================================
// ROOT
// =========================================================

app.get(
  "/",
  (req, res) => {
    res.json({
      message:
        "Career.OS backend is running.",

      status:
        "ok",
    });
  }
);

// =========================================================
// HEALTH
// =========================================================

app.get(
  "/api/health",
  async (
    req,
    res
  ) => {
    try {
      await db.command({
        ping: 1,
      });

      res.json({
        status:
          "ok",

        database:
          "connected",

        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status:
          "error",

        database:
          "disconnected",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// AUTH ROUTES
// =========================================================

// ---------------------------------------------------------
// REGISTER
// ---------------------------------------------------------

app.post(
  "/api/auth/register",
  async (
    req,
    res
  ) => {
    try {
      const {
        email,
        password,
      } = req.body;

      const normalizedEmail =
        normalizeEmail(
          email
        );

      if (
        !normalizedEmail ||
        !password
      ) {
        return res
          .status(400)
          .json({
            message:
              "Email and password are required.",
          });
      }

      if (
        password.length <
        6
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password must contain at least 6 characters.",
          });
      }

      const existingUser =
        await usersCollection.findOne(
          {
            email:
              normalizedEmail,
          }
        );

      if (existingUser) {
        return res
          .status(409)
          .json({
            message:
              "An account with this email already exists.",
          });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user = {
        email:
          normalizedEmail,

        passwordHash,

        createdAt:
          new Date(),
      };

      const result =
        await usersCollection.insertOne(
          user
        );

      const savedUser =
        {
          ...user,
          _id:
            result.insertedId,
        };

      const token =
        generateToken(
          savedUser
        );

      res.status(201).json({
        success: true,

        token,

        user:
          sanitizeUser(
            savedUser
          ),
      });
    } catch (error) {
      console.error(
        "❌ Register error:",
        error
      );

      res.status(500).json({
        message:
          "Registration failed.",
        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------

app.post(
  "/api/auth/login",
  async (
    req,
    res
  ) => {
    try {
      const {
        email,
        password,
      } = req.body;

      const normalizedEmail =
        normalizeEmail(
          email
        );

      if (
        !normalizedEmail ||
        !password
      ) {
        return res
          .status(400)
          .json({
            message:
              "Email and password are required.",
          });
      }

      const user =
        await usersCollection.findOne(
          {
            email:
              normalizedEmail,
          }
        );

      if (!user) {
        return res
          .status(401)
          .json({
            message:
              "Invalid email or password.",
          });
      }

      const passwordValid =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordValid) {
        return res
          .status(401)
          .json({
            message:
              "Invalid email or password.",
          });
      }

      const token =
        generateToken(
          user
        );

      res.json({
        success: true,

        token,

        user:
          sanitizeUser(
            user
          ),
      });
    } catch (error) {
      console.error(
        "❌ Login error:",
        error
      );

      res.status(500).json({
        message:
          "Login failed.",
        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// CURRENT USER
// ---------------------------------------------------------

app.get(
  "/api/auth/me",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const user =
        await usersCollection.findOne(
          {
            _id: userId,
          }
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "User not found.",
          });
      }

      res.json({
        success: true,

        user:
          sanitizeUser(
            user
          ),
      });
    } catch (error) {
      console.error(
        "❌ /me error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch user.",
        error:
          error.message,
      });
    }
  }
);

// =========================================================
// PROFILE ROUTES
// =========================================================

// ---------------------------------------------------------
// GET PROFILE
// ---------------------------------------------------------

app.get(
  "/api/profile",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const profile =
        await profilesCollection.findOne(
          {
            userId,
          }
        );

      // IMPORTANT:
      // Always return an object.
      // The frontend expects data.profile.
      res.json({
        profile:
          profile || null,
      });
    } catch (error) {
      console.error(
        "❌ Get profile error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch profile.",

        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// CREATE / SAVE PROFILE
// ---------------------------------------------------------

app.post(
  "/api/profile",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const {
        name,
        skills,
        experience,
        location,
        education,
        summary,
        github,
        linkedin,
      } = req.body;

      const profileData =
        {
          userId,

          name:
            String(
              name || ""
            ).trim(),

          skills:
            Array.isArray(
              skills
            )
              ? skills
              : String(
                  skills || ""
                ),

          experience:
            String(
              experience || ""
            ).trim(),

          location:
            String(
              location || ""
            ).trim(),

          education:
            String(
              education || ""
            ).trim(),

          summary:
            String(
              summary || ""
            ).trim(),

          github:
            String(
              github || ""
            ).trim(),

          linkedin:
            String(
              linkedin || ""
            ).trim(),

          updatedAt:
            new Date(),
        };

      await profilesCollection.updateOne(
        {
          userId,
        },
        {
          $set:
            profileData,
        },
        {
          upsert: true,
        }
      );

      const profile =
        await profilesCollection.findOne(
          {
            userId,
          }
        );

      res.json({
        success: true,

        message:
          "Profile saved successfully.",

        profile,
      });
    } catch (error) {
      console.error(
        "❌ Save profile error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to save profile.",

        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// UPDATE PROFILE
// ---------------------------------------------------------

app.put(
  "/api/profile",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const {
        name,
        skills,
        experience,
        location,
        education,
        summary,
        github,
        linkedin,
      } = req.body;

      const update = {
        updatedAt:
          new Date(),
      };

      if (
        name !==
        undefined
      ) {
        update.name =
          String(
            name
          ).trim();
      }

      if (
        skills !==
        undefined
      ) {
        update.skills =
          skills;
      }

      if (
        experience !==
        undefined
      ) {
        update.experience =
          String(
            experience
          ).trim();
      }

      if (
        location !==
        undefined
      ) {
        update.location =
          String(
            location
          ).trim();
      }

      if (
        education !==
        undefined
      ) {
        update.education =
          String(
            education
          ).trim();
      }

      if (
        summary !==
        undefined
      ) {
        update.summary =
          String(
            summary
          ).trim();
      }

      if (
        github !==
        undefined
      ) {
        update.github =
          String(
            github
          ).trim();
      }

      if (
        linkedin !==
        undefined
      ) {
        update.linkedin =
          String(
            linkedin
          ).trim();
      }

      await profilesCollection.updateOne(
        {
          userId,
        },
        {
          $set:
            update,
        },
        {
          upsert: true,
        }
      );

      const profile =
        await profilesCollection.findOne(
          {
            userId,
          }
        );

      res.json({
        success: true,

        message:
          "Profile updated successfully.",

        profile,
      });
    } catch (error) {
      console.error(
        "❌ Update profile error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update profile.",

        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// DELETE PROFILE
// ---------------------------------------------------------

app.delete(
  "/api/profile",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const result =
        await profilesCollection.deleteOne(
          {
            userId,
          }
        );

      res.json({
        success: true,

        message:
          "Profile deleted successfully.",

        deletedCount:
          result.deletedCount,
      });
    } catch (error) {
      console.error(
        "❌ Delete profile error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete profile.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// JOB ROUTES
// =========================================================

// ---------------------------------------------------------
// GET ALL JOBS
// ---------------------------------------------------------

app.get(
  "/api/jobs",
  async (
    req,
    res
  ) => {
    try {
      const jobs =
        await jobsCollection
          .find({})
          .sort({
            createdAt:
              -1,
          })
          .toArray();

      res.json(
        jobs
      );
    } catch (error) {
      console.error(
        "❌ Get jobs error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch jobs.",

        error:
          error.message,
      });
    }
  }
);

// ---------------------------------------------------------
// CREATE JOB
// ---------------------------------------------------------

app.post(
  "/api/jobs",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const {
        title,
        company,
        location,
        salary,
        skills,
        description,
        responsibilities,
        requirements,
        niceToHave,
      } = req.body;

      if (
        !title ||
        !company
      ) {
        return res
          .status(400)
          .json({
            message:
              "Title and company are required.",
          });
      }

      const job = {
        title:
          String(
            title
          ).trim(),

        company:
          String(
            company
          ).trim(),

        location:
          String(
            location || ""
          ).trim(),

        salary:
          Number(
            salary
          ) || 0,

        skills:
          normalizeSkills(
            skills
          ),

        description:
          String(
            description || ""
          ).trim(),

        responsibilities:
          Array.isArray(
            responsibilities
          )
            ? responsibilities
            : [],

        requirements:
          Array.isArray(
            requirements
          )
            ? requirements
            : [],

        niceToHave:
          Array.isArray(
            niceToHave
          )
            ? niceToHave
            : [],

        createdAt:
          new Date(),
      };

      const result =
        await jobsCollection.insertOne(
          job
        );

      res.status(201).json({
        success: true,

        message:
          "Job created successfully.",

        jobId:
          result.insertedId,
      });
    } catch (error) {
      console.error(
        "❌ Create job error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create job.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// KEYWORD MATCHING
// =========================================================

app.get(
  "/api/jobs/matches",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found. Upload a resume first.",
          });
      }

      const resumeSkills =
        Array.isArray(
          resume.skills
        )
          ? resume.skills
          : [];

      if (
        resumeSkills.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            message:
              "No skills found in resume. Extract skills first.",
          });
      }

      const jobs =
        await jobsCollection
          .find({})
          .toArray();

      const matches =
        jobs.map(
          (job) => {
            const result =
              calculateKeywordMatch(
                resumeSkills,
                job.skills
              );

            return {
              jobId:
                job._id,

              title:
                job.title,

              company:
                job.company,

              location:
                job.location,

              salary:
                job.salary,

              requiredSkills:
                job.skills || [],

              matchPercentage:
                result.score,

              matchedSkills:
                result.matchedSkills,

              missingSkills:
                result.missingSkills,
            };
          }
        );

      matches.sort(
        (a, b) =>
          b.matchPercentage -
          a.matchPercentage
      );

      res.json({
        resumeSkills,

        totalJobs:
          jobs.length,

        matches,
      });
    } catch (error) {
      console.error(
        "❌ Keyword matching error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to calculate keyword matches.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// SEMANTIC MATCHING
// =========================================================

app.get(
  "/api/jobs/semantic-matches",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found. Upload a resume first.",
          });
      }

      const resumeText =
        getResumeText(
          resume
        );

      if (
        !resumeText.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Resume text is empty.",
          });
      }

      const jobs =
        await jobsCollection
          .find({})
          .toArray();

      const matches = [];

      for (
        const job of jobs
      ) {
        const semantic =
          await calculateSemanticMatch(
            resumeText,
            job
          );

        const semanticScore =
          Number(
            semantic.percentage ??
              semantic.score ??
              0
          );

        matches.push({
          jobId:
            job._id,

          title:
            job.title,

          company:
            job.company,

          location:
            job.location,

          salary:
            job.salary,

          requiredSkills:
            job.skills || [],

          semanticScore,

          similarity:
            semantic.similarity ??
            0,
        });
      }

      matches.sort(
        (a, b) =>
          b.semanticScore -
          a.semanticScore
      );

      res.json({
        totalJobs:
          jobs.length,

        matches,
      });
    } catch (error) {
      console.error(
        "❌ Semantic matching error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to calculate semantic matches.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// FINAL MATCHING
// Keyword = 40%
// Semantic = 60%
// =========================================================

app.get(
  "/api/jobs/final-matches",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found. Upload a resume first.",
          });
      }

      const resumeText =
        getResumeText(
          resume
        );

      if (
        !resumeText.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Resume text is empty.",
          });
      }

      const resumeSkills =
        Array.isArray(
          resume.skills
        )
          ? resume.skills
          : [];

      const jobs =
        await jobsCollection
          .find({})
          .toArray();

      const matches = [];

      for (
        const job of jobs
      ) {
        const keyword =
          calculateKeywordMatch(
            resumeSkills,
            job.skills
          );

        const semantic =
          await calculateSemanticMatch(
            resumeText,
            job
          );

        const semanticScore =
          Number(
            semantic.percentage ??
              semantic.score ??
              0
          );

        const final =
          calculateFinalMatch(
            keyword.score,
            semanticScore
          );

        matches.push({
          jobId:
            job._id,

          title:
            job.title,

          company:
            job.company,

          location:
            job.location,

          salary:
            job.salary,

          skills:
            job.skills || [],

          matchedSkills:
            keyword.matchedSkills,

          missingSkills:
            keyword.missingSkills,

          keywordScore:
            final.keywordScore,

          semanticScore:
            final.semanticScore,

          finalScore:
            final.finalScore,

          weights:
            final.weights,
        });
      }

      matches.sort(
        (a, b) =>
          b.finalScore -
          a.finalScore
      );

      res.json({
        totalJobs:
          jobs.length,

        weights: {
          keyword:
            0.4,

          semantic:
            0.6,
        },

        matches,
      });
    } catch (error) {
      console.error(
        "❌ Final matching error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to calculate final job matches.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// GET SINGLE JOB
// =========================================================

app.get(
  "/api/jobs/:id",
  async (
    req,
    res
  ) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid job ID.",
          });
      }

      const job =
        await jobsCollection.findOne(
          {
            _id:
              new ObjectId(
                req.params.id
              ),
          }
        );

      if (!job) {
        return res
          .status(404)
          .json({
            message:
              "Job not found.",
          });
      }

      res.json(
        job
      );
    } catch (error) {
      console.error(
        "❌ Get job error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch job.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// UPDATE JOB
// =========================================================

app.put(
  "/api/jobs/:id",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid job ID.",
          });
      }

      const update =
        {};

      if (
        req.body.title !==
        undefined
      ) {
        update.title =
          String(
            req.body.title
          ).trim();
      }

      if (
        req.body.company !==
        undefined
      ) {
        update.company =
          String(
            req.body.company
          ).trim();
      }

      if (
        req.body.location !==
        undefined
      ) {
        update.location =
          String(
            req.body.location
          ).trim();
      }

      if (
        req.body.description !==
        undefined
      ) {
        update.description =
          String(
            req.body.description
          ).trim();
      }

      if (
        req.body.salary !==
        undefined
      ) {
        update.salary =
          Number(
            req.body.salary
          ) || 0;
      }

      if (
        req.body.skills !==
        undefined
      ) {
        update.skills =
          normalizeSkills(
            req.body.skills
          );
      }

      if (
        req.body.responsibilities !==
        undefined
      ) {
        update.responsibilities =
          Array.isArray(
            req.body.responsibilities
          )
            ? req.body
                .responsibilities
            : [];
      }

      if (
        req.body.requirements !==
        undefined
      ) {
        update.requirements =
          Array.isArray(
            req.body.requirements
          )
            ? req.body.requirements
            : [];
      }

      if (
        req.body.niceToHave !==
        undefined
      ) {
        update.niceToHave =
          Array.isArray(
            req.body.niceToHave
          )
            ? req.body
                .niceToHave
            : [];
      }

      update.updatedAt =
        new Date();

      const result =
        await jobsCollection.updateOne(
          {
            _id:
              new ObjectId(
                req.params.id
              ),
          },
          {
            $set:
              update,
          }
        );

      if (
        result.matchedCount ===
        0
      ) {
        return res
          .status(404)
          .json({
            message:
              "Job not found.",
          });
      }

      const job =
        await jobsCollection.findOne(
          {
            _id:
              new ObjectId(
                req.params.id
              ),
          }
        );

      res.json({
        success: true,

        message:
          "Job updated successfully.",

        job,
      });
    } catch (error) {
      console.error(
        "❌ Update job error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update job.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// DELETE JOB
// =========================================================

app.delete(
  "/api/jobs/:id",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid job ID.",
          });
      }

      const result =
        await jobsCollection.deleteOne(
          {
            _id:
              new ObjectId(
                req.params.id
              ),
          }
        );

      if (
        result.deletedCount ===
        0
      ) {
        return res
          .status(404)
          .json({
            message:
              "Job not found.",
          });
      }

      res.json({
        success: true,

        message:
          "Job deleted successfully.",
      });
    } catch (error) {
      console.error(
        "❌ Delete job error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete job.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// RESUME UPLOAD
// =========================================================

app.post(
  "/api/resume/upload",
  authenticateToken,
  upload.single("resume"),
  async (
    req,
    res
  ) => {
    let parser = null;

    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            message:
              "Please upload a PDF resume.",
          });
      }

      const pdfBuffer =
        fs.readFileSync(
          req.file.path
        );

      parser =
        new PDFParse({
          data: pdfBuffer,
        });

      const pdfData =
        await parser.getText();

      const resumeText =
        String(
          pdfData.text || ""
        ).trim();

      if (
        !resumeText
      ) {
        return res
          .status(400)
          .json({
            message:
              "Could not extract readable text from the PDF.",
          });
      }

      const resumeDocument =
        {
          userId,

          originalName:
            req.file.originalname,

          fileName:
            req.file.filename,

          filePath:
            `uploads/${req.file.filename}`,

          fileSize:
            req.file.size,

          fileType:
            req.file.mimetype,

          text:
            resumeText,

          resumeText:
            resumeText,

          skills: [],

          uploadedAt:
            new Date(),
        };

      const result =
        await resumesCollection.insertOne(
          resumeDocument
        );

      res.status(201).json({
        success: true,

        message:
          "Resume uploaded successfully.",

        resumeId:
          result.insertedId,

        file: {
          originalName:
            req.file.originalname,

          fileName:
            req.file.filename,

          filePath:
            `uploads/${req.file.filename}`,

          fileSize:
            req.file.size,

          fileType:
            req.file.mimetype,
        },

        resumeText,
      });
    } catch (error) {
      console.error(
        "❌ Resume upload error:",
        error
      );

      if (
        req.file?.path &&
        fs.existsSync(
          req.file.path
        )
      ) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (deleteError) {
          console.error(
            "Failed to remove uploaded file:",
            deleteError.message
          );
        }
      }

      res.status(500).json({
        message:
          "Failed to upload and process resume.",

        error:
          error.message,
      });
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // Ignore cleanup errors.
        }
      }
    }
  }
);

// =========================================================
// GET LATEST RESUME
// =========================================================

app.get(
  "/api/resume",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found.",
          });
      }

      res.json(
        resume
      );
    } catch (error) {
      console.error(
        "❌ Get resume error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch resume.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// DELETE RESUME
// =========================================================

app.delete(
  "/api/resume",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found.",
          });
      }

      if (
        resume.filePath
      ) {
        const safeFileName =
          path.basename(
            resume.filePath
          );

        const filePath =
          path.join(
            uploadsFolder,
            safeFileName
          );

        if (
          fs.existsSync(
            filePath
          )
        ) {
          fs.unlinkSync(
            filePath
          );
        }
      }

      await resumesCollection.deleteOne(
        {
          _id:
            resume._id,

          userId,
        }
      );

      res.json({
        success: true,

        message:
          "Resume deleted successfully.",
      });
    } catch (error) {
      console.error(
        "❌ Delete resume error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete resume.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// EXTRACT RESUME SKILLS
// =========================================================

app.post(
  "/api/resume/extract-skills",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found. Please upload a resume first.",
          });
      }

      const resumeText =
        getResumeText(
          resume
        );

      if (
        !resumeText.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Resume text is empty.",
          });
      }

      const skillList = [
        "python",
        "javascript",
        "typescript",
        "java",
        "c++",
        "sql",
        "bash",

        "machine learning",
        "deep learning",
        "generative ai",
        "artificial intelligence",
        "llm",
        "llms",
        "large language models",
        "prompt engineering",
        "rag",
        "retrieval augmented generation",

        "google gemini api",
        "gemini api",
        "google gen ai sdk",

        "hugging face",
        "transformers",
        "scikit-learn",
        "xgboost",
        "pytorch",
        "tensorflow",

        "fastapi",
        "express",
        "node.js",
        "nodejs",
        "rest api",
        "restful api",
        "pydantic",

        "react",
        "react.js",
        "html",
        "html5",
        "css",
        "css3",

        "mongodb",
        "postgresql",
        "mysql",
        "duckdb",

        "pandas",
        "numpy",
        "apache parquet",

        "pytest",

        "git",
        "github",
        "docker",
        "postman",

        "vercel",
        "render",

        "rest",
        "api",
      ];

      const lowerText =
        resumeText.toLowerCase();

      const extractedSkills =
        skillList.filter(
          (skill) =>
            lowerText.includes(
              skill.toLowerCase()
            )
        );

      const uniqueSkills =
        [
          ...new Set(
            extractedSkills.map(
              (skill) => {
                if (
                  skill === "llm" ||
                  skill === "llms"
                ) {
                  return "large language models";
                }

                if (
                  skill ===
                  "retrieval augmented generation"
                ) {
                  return "RAG";
                }

                return skill;
              }
            )
          ),
        ];

      await resumesCollection.updateOne(
        {
          _id:
            resume._id,

          userId,
        },
        {
          $set: {
            skills:
              uniqueSkills,

            skillsExtractedAt:
              new Date(),
          },
        }
      );

      res.json({
        success: true,

        message:
          "Skills extracted successfully.",

        skills:
          uniqueSkills,

        totalSkills:
          uniqueSkills.length,
      });
    } catch (error) {
      console.error(
        "❌ Skill extraction error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to extract skills.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// GET RESUME SKILLS
// =========================================================

app.get(
  "/api/resume/skills",
  authenticateToken,
  async (
    req,
    res
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            message:
              "Invalid user ID.",
          });
      }

      const resume =
        await getLatestResume(
          userId
        );

      if (!resume) {
        return res
          .status(404)
          .json({
            message:
              "No resume found.",
          });
      }

      const skills =
        Array.isArray(
          resume.skills
        )
          ? resume.skills
          : [];

      res.json({
        skills,

        totalSkills:
          skills.length,
      });
    } catch (error) {
      console.error(
        "❌ Get resume skills error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch resume skills.",

        error:
          error.message,
      });
    }
  }
);

// =========================================================
// START SERVER
// =========================================================

async function startServer() {
  try {
    // IMPORTANT:
    // MongoDB MUST connect before routers are created.

    await connectToMongoDB();

    // =====================================================
    // ADVANCED ROUTERS
    // =====================================================

    console.log(
      "🔌 Mounting advanced API routers..."
    );

    // -----------------------------------------------------
    // RESUME ANALYSIS
    // -----------------------------------------------------

    app.use(
      "/api/resume",
      createResumeAnalysisRouter({
        resumesCollection,
        profilesCollection,
      })
    );

    // -----------------------------------------------------
    // CAREER AI CHAT
    // -----------------------------------------------------

    app.use(
      "/api/chat",
      createCareerChatRouter({
        resumesCollection,
        profilesCollection,
        jobsCollection,
        chatHistoryCollection,
      })
    );

    // -----------------------------------------------------
    // EXPLAIN MY MATCH
    // -----------------------------------------------------

    app.use(
      "/api/jobs",
      createMatchExplanationRouter({
        resumesCollection,
        profilesCollection,
        jobsCollection,
      })
    );

    console.log(
      "✅ Advanced routers mounted."
    );

    // =====================================================
    // 404 HANDLER
    // =====================================================

    app.use(
      (
        req,
        res
      ) => {
        res.status(404).json({
          message:
            "API route not found.",

          path:
            req.originalUrl,
        });
      }
    );

    // =====================================================
    // GLOBAL ERROR HANDLER
    // =====================================================

    app.use(
      (
        error,
        req,
        res,
        next
      ) => {
        console.error(
          "❌ Server error:",
          error
        );

        if (
          error instanceof
          multer.MulterError
        ) {
          return res
            .status(400)
            .json({
              message:
                error.message,
            });
        }

        if (
          error.message ===
          "Only PDF files are allowed."
        ) {
          return res
            .status(400)
            .json({
              message:
                error.message,
            });
        }

        res.status(500).json({
          message:
            error.message ||
            "Internal server error.",
        });
      }
    );

    // =====================================================
    // LISTEN
    // =====================================================

    app.listen(
      PORT,
      () => {
        console.log("");

        console.log(
          "========================================"
        );

        console.log(
          "🚀 Career.OS Backend Started"
        );

        console.log(
          "========================================"
        );

        console.log(
          `🌐 http://localhost:${PORT}`
        );

        console.log(
          `❤️  http://localhost:${PORT}/api/health`
        );

        console.log(
          "🔐 Auth: /api/auth"
        );

        console.log(
          "📄 Resume: /api/resume"
        );

        console.log(
          "🧠 Resume Analysis: /api/resume/analyze"
        );

        console.log(
          "🎯 Final Matching: /api/jobs/final-matches"
        );

        console.log(
          "🤖 Career AI: /api/chat/ask"
        );

        console.log(
          "💾 Chat History: /api/chat/history"
        );

        console.log(
          "🎯 Explain Match: /api/jobs/:id/explain-match"
        );

        console.log(
          "========================================"
        );

        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "❌ Failed to start server:",
      error
    );

    process.exit(1);
  }
}

// =========================================================
// GRACEFUL SHUTDOWN
// =========================================================

async function shutdown(
  signal
) {
  console.log(
    `\n🛑 ${signal} received. Shutting down...`
  );

  try {
    await client.close();

    console.log(
      "✅ MongoDB connection closed."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ Shutdown error:",
      error
    );

    process.exit(1);
  }
}

process.on(
  "SIGINT",
  () =>
    shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () =>
    shutdown("SIGTERM")
);

// =========================================================
// RUN
// =========================================================

startServer();