import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import "./App.css";

import Login from "./components/Login";
import Register from "./components/Register";
import ResumeAnalysis from "./components/ResumeAnalysis";
import CareerChat from "./components/CareerChat";

import {
  authFetch,
  getUser,
  logout,
} from "./utils/auth";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/* =========================================================
   HELPERS
========================================================= */

async function readJson(response) {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text || "Unexpected server response.",
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function formatSalary(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not specified";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return `₹${number.toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getJobId(job) {
  return job?.jobId || job?._id || job?.id || null;
}

function getScoreClass(score) {
  const numericScore = Number(score);

  if (numericScore >= 80) {
    return "score-high";
  }

  if (numericScore >= 60) {
    return "score-medium";
  }

  return "score-low";
}

function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

/* =========================================================
   APP
========================================================= */

function App() {
  /* -------------------- AUTHENTICATION -------------------- */

  const [user, setUser] = useState(() => getUser());

  const currentPath =
    window.location.pathname.replace(/\/+$/, "") || "/";

  function handleLogin(loggedInUser) {
    window.history.replaceState({}, "", "/");
    setUser(loggedInUser);
  }

  function handleRegistration(registeredUser) {
    window.history.replaceState({}, "", "/");
    setUser(registeredUser);
  }

  function handleLogout() {
    logout();

    setUser(null);
    setProfile(null);
    setResume(null);
    setResumeFile(null);
    setMatches([]);
    setSelectedJob(null);
    setResumeAnalysis(null);
    setMatchExplanation(null);

    setProfileMessage("");
    setProfileError("");
    setResumeMessage("");
    setResumeError("");
  }

  /* -------------------- NAVIGATION -------------------- */

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function handleNavigation(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);

    const element = document.getElementById(section);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  /* -------------------- PROFILE -------------------- */

  const [profile, setProfile] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    skills: "",
    experience: "",
    location: "",
    github: "",
    linkedin: "",
  });

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [profileError, setProfileError] =
    useState("");

  async function loadProfile() {
    try {
      setProfileError("");

      const response = await authFetch(
        `${API_URL}/api/profile`
      );

      const data = await readJson(response);
      const profileData = data?.profile || null;

      setProfile(profileData);

      setProfileForm({
        name: profileData?.name || "",
        skills: Array.isArray(profileData?.skills)
          ? profileData.skills.join(", ")
          : profileData?.skills || "",
        experience: profileData?.experience || "",
        location: profileData?.location || "",
        github: profileData?.github || "",
        linkedin: profileData?.linkedin || "",
      });
    } catch (error) {
      console.error("Profile loading error:", error);

      setProfileError(
        error.message || "Failed to load profile."
      );
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();

    try {
      setProfileSaving(true);
      setProfileMessage("");
      setProfileError("");

      const response = await authFetch(
        `${API_URL}/api/profile`,
        {
          method: "POST",
          body: JSON.stringify(profileForm),
        }
      );

      const data = await readJson(response);
      const savedProfile = data?.profile || data;

      setProfile(savedProfile);
      setProfileMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Profile save error:", error);

      setProfileError(
        error.message || "Failed to save profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  /* -------------------- RESUME -------------------- */

  const [resume, setResume] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  const [resumeLoading, setResumeLoading] =
    useState(false);

  const [resumeUploading, setResumeUploading] =
    useState(false);

  const [resumeError, setResumeError] =
    useState("");

  const [resumeMessage, setResumeMessage] =
    useState("");

  async function loadResume() {
    try {
      setResumeLoading(true);

      const response = await authFetch(
        `${API_URL}/api/resume`
      );

      const data = await readJson(response);

      // Support either a direct resume object
      // or a response shaped like { resume: ... }.
      setResume(data?.resume || data || null);
    } catch (error) {
      console.error("Resume loading error:", error);
      setResume(null);
    } finally {
      setResumeLoading(false);
    }
  }

  function handleResumeFileChange(event) {
    const file = event.target.files?.[0] || null;

    setResumeFile(file);
    setResumeMessage("");
    setResumeError("");
  }

  async function uploadResume(event) {
    event.preventDefault();

    if (!resumeFile) {
      setResumeError("Please select a PDF resume first.");
      return;
    }

    if (
      resumeFile.type !== "application/pdf" &&
      !resumeFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setResumeError("Please select a PDF file.");
      return;
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      setResumeError(
        "The maximum resume file size is 5MB."
      );
      return;
    }

    try {
      setResumeUploading(true);
      setResumeMessage("");
      setResumeError("");

      const formData = new FormData();
      formData.append("resume", resumeFile);

      const token = localStorage.getItem(
        "career_assistant_token"
      );

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      // The backend upload route is POST /api/resume/upload.
      const response = await fetch(
        `${API_URL}/api/resume/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await readJson(response);

      setResume(data?.resume || data);
      setResumeFile(null);

      const input = document.getElementById(
        "resume-file-input"
      );

      if (input) {
        input.value = "";
      }

      setResumeMessage("Resume uploaded successfully.");

      await loadMatches();
    } catch (error) {
      console.error("Resume upload error:", error);

      setResumeError(
        error.message || "Failed to upload resume."
      );
    } finally {
      setResumeUploading(false);
    }
  }

  async function deleteResume() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your resume?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setResumeLoading(true);
      setResumeError("");
      setResumeMessage("");

      const response = await authFetch(
        `${API_URL}/api/resume`,
        {
          method: "DELETE",
        }
      );

      await readJson(response);

      setResume(null);
      setMatches([]);
      setResumeAnalysis(null);

      setResumeMessage("Resume deleted successfully.");
    } catch (error) {
      console.error("Resume delete error:", error);

      setResumeError(
        error.message || "Failed to delete resume."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  /* -------------------- JOB MATCHES -------------------- */

  const [matches, setMatches] = useState([]);

  const [matchesLoading, setMatchesLoading] =
    useState(false);

  const [matchesError, setMatchesError] =
    useState("");

  async function loadMatches() {
    try {
      setMatchesLoading(true);
      setMatchesError("");

      const response = await authFetch(
        `${API_URL}/api/jobs/final-matches`
      );

      const data = await readJson(response);

      const finalMatches = Array.isArray(data)
        ? data
        : Array.isArray(data?.matches)
        ? data.matches
        : [];

      setMatches(finalMatches);
    } catch (error) {
      console.error("Matches loading error:", error);

      setMatchesError(
        error.message || "Failed to load job matches."
      );

      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }

  const topMatches = useMemo(() => {
    return [...matches]
      .sort(
        (a, b) =>
          Number(b.finalScore || 0) -
          Number(a.finalScore || 0)
      )
      .slice(0, 6);
  }, [matches]);

  const averageMatchScore = useMemo(() => {
    if (!matches.length) {
      return 0;
    }

    const total = matches.reduce(
      (sum, item) =>
        sum + Number(item.finalScore || 0),
      0
    );

    return Math.round(total / matches.length);
  }, [matches]);

  const bestMatchScore = useMemo(() => {
    if (!matches.length) {
      return 0;
    }

    return Math.max(
      ...matches.map((item) =>
        Number(item.finalScore || 0)
      )
    );
  }, [matches]);

  const skillsCount = useMemo(() => {
    const skills = profile?.skills || "";

    if (Array.isArray(skills)) {
      return skills.length;
    }

    return String(skills)
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean).length;
  }, [profile]);

  /* -------------------- SELECTED JOB -------------------- */

  const [selectedJob, setSelectedJob] =
    useState(null);

  function handleSelectJob(job) {
    if (!job) {
      return;
    }

    setSelectedJob(job);
    setMatchExplanation(null);
    setMatchExplanationError("");
    setActiveSection("job-details");
  }

  /*
   * VIEW MATCH FIX:
   * When selectedJob changes, React renders the job-details
   * section. This effect then scrolls to that section.
   */
  useEffect(() => {
    if (!selectedJob) {
      return;
    }

    const detailsSection =
      document.getElementById("job-details");

    if (detailsSection) {
      detailsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedJob]);

  /* -------------------- MATCH EXPLANATION -------------------- */

  const [matchExplanation, setMatchExplanation] =
    useState(null);

  const [
    matchExplanationLoading,
    setMatchExplanationLoading,
  ] = useState(false);

  const [
    matchExplanationError,
    setMatchExplanationError,
  ] = useState("");

  async function explainMyMatch(job) {
    if (!job) {
      return;
    }

    const jobId = getJobId(job);

    if (!jobId) {
      setMatchExplanationError(
        "This job does not have a valid job ID."
      );
      return;
    }

    try {
      setMatchExplanationLoading(true);
      setMatchExplanationError("");
      setMatchExplanation(null);

      const response = await authFetch(
        `${API_URL}/api/jobs/${jobId}/explain-match`,
        {
          method: "POST",
          body: JSON.stringify({
            question: `
Explain why I am a ${job.finalScore ?? 0}% match for this ${
              job.title || "job"
            } role.

Explain:
1. My strengths.
2. My matched skills.
3. My missing skills.
4. Why the score is what it is.
5. What I should improve to become a stronger candidate.
            `,
          }),
        }
      );

      const data = await readJson(response);

      setMatchExplanation(data);
    } catch (error) {
      console.error("Explain match error:", error);

      setMatchExplanationError(
        error.message ||
          "Failed to generate match explanation."
      );
    } finally {
      setMatchExplanationLoading(false);
    }
  }

  /* -------------------- RESUME ANALYSIS -------------------- */

  const [resumeAnalysis, setResumeAnalysis] =
    useState(null);

  const [
    resumeAnalysisLoading,
    setResumeAnalysisLoading,
  ] = useState(false);

  const [
    resumeAnalysisError,
    setResumeAnalysisError,
  ] = useState("");

  async function loadResumeAnalysis() {
    try {
      setResumeAnalysisLoading(true);
      setResumeAnalysisError("");

      const response = await authFetch(
        `${API_URL}/api/resume/analyze`
      );

      const data = await readJson(response);

      setResumeAnalysis(data?.analysis || null);
    } catch (error) {
      console.error("Resume analysis error:", error);

      setResumeAnalysisError(
        error.message || "Failed to analyze resume."
      );
    } finally {
      setResumeAnalysisLoading(false);
    }
  }

  /* -------------------- INITIAL DATA LOADING -------------------- */

  useEffect(() => {
    if (!user) {
      return;
    }

    loadProfile();
    loadResume();
    loadMatches();
  }, [user]);

  /* =========================================================
     LOGIN AND REGISTRATION ROUTING
  ========================================================= */

  if (!user && currentPath === "/login") {
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => {
          window.location.href = "/register";
        }}
      />
    );
  }

  if (!user && currentPath === "/register") {
    return (
      <Register
        onRegister={handleRegistration}
        onSwitchToLogin={() => {
          window.location.href = "/login";
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="auth-required-screen">
        <div className="auth-required-card">
          <div className="brand-mark">C</div>

          <h1>Career.OS</h1>

          <p>
            Please log in to access your AI career
            assistant.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     AUTHENTICATED DASHBOARD
  ========================================================= */

  return (
    <div className="career-app">
      {/* SIDEBAR */}

      <aside
        className={`sidebar ${
          mobileMenuOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">C</div>

          <div>
            <div className="brand-name">Career.OS</div>

            <div className="brand-subtitle">
              AI Career Assistant
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {[
            ["dashboard", "◉", "Dashboard"],
            ["profile", "◎", "Profile"],
            ["resume", "▣", "Resume"],
            ["matches", "✦", "Job Matches"],
            ["analysis", "◫", "Resume Analysis"],
            ["career-chat", "✧", "Career AI Chat"],
          ].map(([section, icon, label]) => (
            <button
              key={section}
              type="button"
              className={
                activeSection === section
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => handleNavigation(section)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {getInitials(
                profile?.name || user?.name || user?.email
              )}
            </div>

            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {profile?.name || user?.name || "User"}
              </div>

              <div className="sidebar-user-email">
                {user?.email || ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
          >
            ☰
          </button>

          <div className="topbar-left">
            <span className="topbar-label">
              AI Career Intelligence
            </span>
          </div>

          <div className="topbar-right">
            <div className="status-pill">
              <span className="status-dot" />
              AI Online
            </div>
          </div>
        </header>

        {/* DASHBOARD */}

        <section
          id="dashboard"
          className="hero-section"
        >
          <div className="hero-content">
            <div className="eyebrow">
              YOUR CAREER COPILOT
            </div>

            <h1>
              Welcome back,{" "}
              <span>
                {profile?.name || user?.name || "there"}
              </span>
            </h1>

            <p>
              Build your career with AI-powered resume
              analysis, semantic job matching and
              personalized career guidance.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => handleNavigation("matches")}
              >
                ✦ Find My Best Jobs
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => handleNavigation("career-chat")}
              >
                Ask Career AI
              </button>
            </div>
          </div>

          <div className="hero-glow-card">
            <div className="hero-glow-orb" />

            <div className="hero-mini-card">
              <div className="mini-label">Best Match</div>

              <div className="mini-score">
                {bestMatchScore}%
              </div>

              <div className="mini-caption">
                Based on semantic + keyword matching
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}

        <section className="metrics-grid">
          {[
            ["✦", "Jobs Analyzed", matches.length],
            ["◎", "Average Match", `${averageMatchScore}%`],
            ["◈", "Best Match", `${bestMatchScore}%`],
            ["◉", "Skills", skillsCount],
          ].map(([icon, label, value]) => (
            <div className="metric-card" key={label}>
              <div className="metric-icon">{icon}</div>

              <div className="metric-content">
                <div className="metric-label">{label}</div>
                <div className="metric-value">{value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* PROFILE */}

        <section
          id="profile"
          className="section-block"
        >
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">PROFILE</div>

              <h2>Your Career Profile</h2>

              <p>
                Keep your profile updated so Career.OS
                can personalize your recommendations.
              </p>
            </div>
          </div>

          <div className="panel">
            {profileMessage && (
              <div className="success-message">
                {profileMessage}
              </div>
            )}

            {profileError && (
              <div className="error-message">
                {profileError}
              </div>
            )}

            <form
              className="profile-form"
              onSubmit={saveProfile}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Name</label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location</label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={profileForm.location}
                    onChange={handleProfileChange}
                    placeholder="Bangalore"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="experience">
                    Experience
                  </label>

                  <input
                    id="experience"
                    name="experience"
                    type="text"
                    value={profileForm.experience}
                    onChange={handleProfileChange}
                    placeholder="0-1 years"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="skills">Skills</label>

                  <textarea
                    id="skills"
                    name="skills"
                    value={profileForm.skills}
                    onChange={handleProfileChange}
                    placeholder="Python, SQL, Machine Learning, RAG..."
                    rows={4}
                  />

                  <div className="field-help">
                    Separate skills with commas.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="github">GitHub</label>

                  <input
                    id="github"
                    name="github"
                    type="text"
                    value={profileForm.github}
                    onChange={handleProfileChange}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="linkedin">LinkedIn</label>

                  <input
                    id="linkedin"
                    name="linkedin"
                    type="text"
                    value={profileForm.linkedin}
                    onChange={handleProfileChange}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={profileSaving}
                >
                  {profileSaving
                    ? "Saving..."
                    : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* RESUME */}

        <section
          id="resume"
          className="section-block"
        >
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">RESUME</div>

              <h2>Your Resume</h2>

              <p>
                Upload a PDF and let Career.OS extract
                your skills, experience and career signals.
              </p>
            </div>
          </div>

          <div className="panel resume-panel">
            {resumeMessage && (
              <div className="success-message">
                {resumeMessage}
              </div>
            )}

            {resumeError && (
              <div className="error-message">
                {resumeError}
              </div>
            )}

            {resumeLoading && !resume && (
              <div className="loading-panel">
                <div className="loading-spinner" />
                <p>Loading resume...</p>
              </div>
            )}

            {resume ? (
              <div className="resume-existing">
                <div className="resume-file-card">
                  <div className="resume-file-icon">PDF</div>

                  <div className="resume-file-info">
                    <div className="resume-file-name">
                      {resume.filename || "Resume.pdf"}
                    </div>

                    <div className="resume-file-meta">
                      Uploaded{" "}
                      {formatDate(
                        resume.createdAt || resume.uploadedAt
                      )}
                    </div>
                  </div>
                </div>

                <div className="resume-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={deleteResume}
                    disabled={resumeLoading}
                  >
                    Delete Resume
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleNavigation("analysis")}
                  >
                    Analyze Resume
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="resume-upload"
                onSubmit={uploadResume}
              >
                <div className="upload-icon">↑</div>

                <h3>Upload your resume</h3>

                <p>PDF only. Maximum file size: 5MB.</p>

                <label
                  htmlFor="resume-file-input"
                  className="file-picker"
                >
                  <span>
                    {resumeFile
                      ? resumeFile.name
                      : "Choose PDF"}
                  </span>
                </label>

                <input
                  id="resume-file-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleResumeFileChange}
                  hidden
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={resumeUploading || !resumeFile}
                >
                  {resumeUploading
                    ? "Uploading..."
                    : "Upload Resume"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* JOB MATCHES */}

        <section
          id="matches"
          className="section-block"
        >
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">
                AI JOB MATCHING
              </div>

              <h2>Your Best Job Matches</h2>

              <p>
                Matches combine keyword-based skill coverage
                with semantic resume-to-job similarity.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={loadMatches}
              disabled={matchesLoading}
            >
              {matchesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {matchesError && (
            <div className="error-message">
              {matchesError}
            </div>
          )}

          {matchesLoading ? (
            <div className="loading-panel">
              <div className="loading-spinner" />
              <p>Analyzing your resume against jobs...</p>
            </div>
          ) : topMatches.length === 0 ? (
            <div className="empty-panel">
              <div className="empty-icon">✦</div>

              <h3>No matches yet</h3>

              <p>
                Upload a resume and make sure jobs are
                available in the system.
              </p>
            </div>
          ) : (
            <div className="jobs-grid">
              {topMatches.map((job, index) => {
                const jobId = getJobId(job);

                const score = Number(
                  job.finalScore ?? job.score ?? 0
                );

                const skills = Array.isArray(job.skills)
                  ? job.skills
                  : [];

                return (
                  <article
                    key={jobId || index}
                    className="job-card"
                    onClick={() => handleSelectJob(job)}
                  >
                    <div className="job-card-top">
                      <div>
                        <div className="job-company">
                          {job.company || "Company"}
                        </div>

                        <h3>{job.title || "Job Role"}</h3>
                      </div>

                      <div
                        className={`score-badge ${getScoreClass(score)}`}
                      >
                        {score}%
                      </div>
                    </div>

                    <div className="job-location">
                      {job.location || "Location not specified"}
                    </div>

                    <div className="job-salary">
                      {formatSalary(job.salary)}
                    </div>

                    <div className="job-skills">
                      {skills.slice(0, 5).map(
                        (skill, skillIndex) => (
                          <span
                            key={`${skill}-${skillIndex}`}
                            className="skill-chip"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>

                    <div className="job-card-footer">
                      <span>
                        Keyword{" "}
                        {Math.round(
                          Number(job.keywordScore || 0)
                        )}
                        %
                      </span>

                      <span>
                        Semantic{" "}
                        {Math.round(
                          Number(job.semanticScore || 0)
                        )}
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      className="job-view-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectJob(job);
                      }}
                    >
                      View Match →
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SELECTED JOB DETAILS */}

        {selectedJob && (
          <section
            id="job-details"
            className="section-block"
          >
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">
                  MATCH DETAILS
                </div>

                <h2>
                  {selectedJob.title || "Job Details"}
                </h2>

                <p>
                  {selectedJob.company || "Company"}
                  {" • "}
                  {selectedJob.location || "Location"}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => explainMyMatch(selectedJob)}
                  disabled={matchExplanationLoading}
                >
                  {matchExplanationLoading
                    ? "Analyzing Match..."
                    : "✦ Explain My Match"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSelectedJob(null);
                    setMatchExplanation(null);
                    setMatchExplanationError("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="job-detail-layout">
              <div className="panel">
                <div className="detail-score-row">
                  <div className="detail-score-card">
                    <div className="detail-score-label">
                      Final Match
                    </div>

                    <div
                      className={`detail-score ${getScoreClass(
                        selectedJob.finalScore || 0
                      )}`}
                    >
                      {selectedJob.finalScore || 0}%
                    </div>
                  </div>

                  <div className="detail-score-card">
                    <div className="detail-score-label">
                      Keyword
                    </div>

                    <div className="detail-score">
                      {Math.round(
                        Number(selectedJob.keywordScore || 0)
                      )}
                      %
                    </div>
                  </div>

                  <div className="detail-score-card">
                    <div className="detail-score-label">
                      Semantic
                    </div>

                    <div className="detail-score">
                      {Math.round(
                        Number(selectedJob.semanticScore || 0)
                      )}
                      %
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Job Description</h3>

                  <p>
                    {selectedJob.description ||
                      "No job description provided."}
                  </p>
                </div>

                <div className="detail-section">
                  <h3>Matched Skills</h3>

                  {(
                    selectedJob.matchedSkills ||
                    selectedJob.matchingSkills ||
                    []
                  ).length > 0 ? (
                    <div className="skill-chip-list">
                      {(
                        selectedJob.matchedSkills ||
                        selectedJob.matchingSkills ||
                        []
                      ).map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="skill-chip matched"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">
                      No matched skills reported.
                    </p>
                  )}
                </div>

                <div className="detail-section">
                  <h3>Missing Skills</h3>

                  {(selectedJob.missingSkills || []).length > 0 ? (
                    <div className="skill-chip-list">
                      {selectedJob.missingSkills.map(
                        (skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="skill-chip missing"
                          >
                            + {skill}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="muted-text">
                      No important missing skills detected.
                    </p>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="detail-side-heading">
                  <span>Salary</span>
                  <strong>
                    {formatSalary(selectedJob.salary)}
                  </strong>
                </div>

                <div className="detail-side-heading">
                  <span>Company</span>
                  <strong>
                    {selectedJob.company || "Not specified"}
                  </strong>
                </div>

                <div className="detail-side-heading">
                  <span>Location</span>
                  <strong>
                    {selectedJob.location || "Not specified"}
                  </strong>
                </div>

                <div className="detail-side-heading">
                  <span>Skills Required</span>
                  <strong>
                    {Array.isArray(selectedJob.skills)
                      ? selectedJob.skills.length
                      : 0}
                  </strong>
                </div>
              </div>
            </div>

            {matchExplanationError && (
              <div className="error-message">
                {matchExplanationError}
              </div>
            )}

            {matchExplanationLoading && (
              <div
                className="panel"
                style={{ marginTop: "20px" }}
              >
                <div className="loading-panel">
                  <div className="loading-spinner" />

                  <p>
                    Career AI is analyzing your resume
                    against this job...
                  </p>
                </div>
              </div>
            )}

            {matchExplanation && (
              <div
                className="panel"
                style={{ marginTop: "20px" }}
              >
                <div className="section-heading compact-heading">
                  <div>
                    <div className="section-eyebrow">
                      AI EXPLANATION
                    </div>

                    <h2>Why You Match</h2>

                    <p>
                      Career AI analyzed the selected role
                      using your resume and job context.
                    </p>
                  </div>
                </div>

                <div
                  className="markdown-content"
                  style={{ lineHeight: "1.75" }}
                >
                  <ReactMarkdown>
                    {matchExplanation.answer ||
                      "No explanation was returned."}
                  </ReactMarkdown>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "18px",
                      flexWrap: "wrap",
                      fontSize: "13px",
                      opacity: 0.7,
                    }}
                  >
                    {matchExplanation.model && (
                      <span>
                        Model: {matchExplanation.model}
                      </span>
                    )}

                    {matchExplanation.source && (
                      <span>
                        Source: {matchExplanation.source}
                      </span>
                    )}
                  </div>

                  {Array.isArray(matchExplanation.sources) &&
                    matchExplanation.sources.length > 0 && (
                      <div style={{ marginTop: "14px" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: "8px",
                          }}
                        >
                          Sources
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {matchExplanation.sources
                            .slice(0, 6)
                            .map((source, index) => (
                              <div
                                key={index}
                                style={{
                                  fontSize: "13px",
                                  opacity: 0.75,
                                }}
                              >
                                {typeof source === "string"
                                  ? source
                                  : source?.title ||
                                    source?.content ||
                                    `Source ${index + 1}`}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* RESUME ANALYSIS */}

        <section
          id="analysis"
          className="section-block"
        >
          <ResumeAnalysis
            analysis={resumeAnalysis}
            loading={resumeAnalysisLoading}
            error={resumeAnalysisError}
            onAnalyze={loadResumeAnalysis}
          />
        </section>

        {/* CAREER AI CHAT */}

        <section
          id="career-chat"
          className="section-block"
        >
          <CareerChat />
        </section>

        {/* FOOTER */}

        <footer className="app-footer">
          <div>Career.OS</div>

          <div>
            AI-powered career intelligence platform
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;