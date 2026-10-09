import "./ResumeAnalysis.css";

function clampScore(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(100, Math.round(number))
    );
}

function scoreClass(score) {
    const value = clampScore(score);

    if (value >= 80) {
        return "resume-score-excellent";
    }

    if (value >= 60) {
        return "resume-score-good";
    }

    if (value >= 40) {
        return "resume-score-medium";
    }

    return "resume-score-low";
}

function formatSectionName(section) {
    if (!section) {
        return "Unknown";
    }

    return String(section)
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}

function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return [];
}

function getRoleName(role) {
    if (!role) {
        return "Recommended Role";
    }

    if (typeof role === "string") {
        return role;
    }

    return (
        role.role ||
        role.title ||
        role.name ||
        "Recommended Role"
    );
}

function getRoleScore(role) {
    if (!role || typeof role !== "object") {
        return null;
    }

    return (
        role.score ??
        role.matchScore ??
        role.compatibility ??
        role.percentage ??
        null
    );
}

export default function ResumeAnalysis({
    analysis,
    loading,
    error,
    onAnalyze,
    onRefresh,
}) {
    const handleAnalyze =
        onRefresh || onAnalyze;

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {
        return (
            <section className="resume-analysis-panel">

                <div className="resume-analysis-header">
                    <div>
                        <div className="resume-analysis-eyebrow">
                            RESUME INTELLIGENCE
                        </div>

                        <h2>
                            Analyzing your resume
                        </h2>

                        <p>
                            Career.OS is extracting
                            career signals, ATS
                            information, skills and
                            role recommendations.
                        </p>
                    </div>
                </div>

                <div className="resume-analysis-loading">

                    <div className="analysis-loading-orb">
                        <span>✦</span>
                    </div>

                    <div className="analysis-loading-content">

                        <div className="analysis-loading-title">
                            AI analysis in progress
                        </div>

                        <div className="analysis-loading-subtitle">
                            This may take a few seconds.
                        </div>

                    </div>

                    <div className="analysis-loading-bar">
                        <div />
                    </div>

                </div>

            </section>
        );
    }

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    if (!analysis) {
        return (
            <section className="resume-analysis-panel">

                <div className="resume-analysis-empty">

                    <div className="resume-analysis-empty-orb">
                        <div className="resume-analysis-empty-orb-inner">
                            ✦
                        </div>
                    </div>

                    <div className="resume-analysis-eyebrow">
                        RESUME INTELLIGENCE
                    </div>

                    <h2>
                        Analyze your resume
                    </h2>

                    <p>
                        Get an AI-powered view of
                        your career readiness, ATS
                        signals, strengths, skill
                        gaps and recommended roles.
                    </p>

                    <div className="resume-analysis-benefits">

                        <div className="analysis-benefit">
                            <div className="analysis-benefit-icon">
                                ◈
                            </div>

                            <div>
                                <strong>
                                    Career readiness
                                </strong>

                                <span>
                                    Understand how prepared
                                    you are for target roles.
                                </span>
                            </div>
                        </div>

                        <div className="analysis-benefit">
                            <div className="analysis-benefit-icon">
                                ◎
                            </div>

                            <div>
                                <strong>
                                    ATS intelligence
                                </strong>

                                <span>
                                    Identify resume structure
                                    and keyword signals.
                                </span>
                            </div>
                        </div>

                        <div className="analysis-benefit">
                            <div className="analysis-benefit-icon">
                                ✦
                            </div>

                            <div>
                                <strong>
                                    Role recommendations
                                </strong>

                                <span>
                                    Find roles that fit your
                                    current skill profile.
                                </span>
                            </div>
                        </div>

                    </div>

                    <button
                        type="button"
                        className="resume-analysis-primary-button"
                        onClick={handleAnalyze}
                        disabled={!handleAnalyze}
                    >
                        Analyze Resume
                        <span>→</span>
                    </button>

                </div>

            </section>
        );
    }

    /* =====================================================
       ANALYSIS DATA
    ===================================================== */

    const careerReadiness = clampScore(
        analysis.careerReadinessScore ??
            analysis.careerReadiness ??
            analysis.readinessScore ??
            0
    );

    const atsScore = clampScore(
        analysis.ats?.score ??
            analysis.atsScore ??
            0
    );

    const strengths = normalizeArray(
        analysis.strengths
    );

    const improvementAreas =
        normalizeArray(
            analysis.improvementAreas ??
                analysis.improvements
        );

    const suggestions =
        normalizeArray(
            analysis.suggestions
        );

    const skills =
        normalizeArray(
            analysis.resume?.skills ??
                analysis.skills
        );

    const roleRecommendations =
        normalizeArray(
            analysis.roleRecommendations ??
                analysis.recommendedRoles
        );

    const sections =
        normalizeArray(
            analysis.ats?.sectionsFound ??
                analysis.ats?.sections
        );

    const actionVerbs = normalizeArray(
        analysis.ats?.actionVerbs
    );

    const quantifiedResults =
        normalizeArray(
            analysis.ats?.quantifiedResults
        );

    return (
        <section className="resume-analysis-panel">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="resume-analysis-header">

                <div>

                    <div className="resume-analysis-eyebrow">
                        RESUME INTELLIGENCE
                    </div>

                    <h2>
                        Resume analysis
                    </h2>

                    <p>
                        Career.OS analyzed your
                        resume and converted it
                        into actionable career
                        insights.
                    </p>

                </div>

                <button
                    type="button"
                    className="resume-analysis-refresh"
                    onClick={handleAnalyze}
                    disabled={!handleAnalyze}
                >
                    ↻ Refresh Analysis
                </button>

            </div>

            {/* =================================================
                SUMMARY
            ================================================= */}

            {analysis.summary && (
                <div className="resume-summary-card">

                    <div className="resume-summary-icon">
                        ✦
                    </div>

                    <div>

                        <div className="resume-card-eyebrow">
                            AI SUMMARY
                        </div>

                        <p>
                            {analysis.summary}
                        </p>

                    </div>

                </div>
            )}

            {/* =================================================
                SCORE CARDS
            ================================================= */}

            <div className="resume-score-grid">

                <div className="resume-score-card">

                    <div className="resume-score-card-top">

                        <div>
                            <span>
                                CAREER READINESS
                            </span>

                            <strong
                                className={
                                    scoreClass(
                                        careerReadiness
                                    )
                                }
                            >
                                {careerReadiness}%
                            </strong>
                        </div>

                        <div
                            className={`resume-score-ring ${scoreClass(
                                careerReadiness
                            )}`}
                            style={{
                                "--score":
                                    `${careerReadiness * 3.6}deg`,
                            }}
                        >
                            <div>
                                {careerReadiness}
                            </div>
                        </div>

                    </div>

                    <p>
                        Overall readiness based
                        on your resume, skills
                        and career profile.
                    </p>

                </div>

                <div className="resume-score-card">

                    <div className="resume-score-card-top">

                        <div>
                            <span>
                                ATS SCORE
                            </span>

                            <strong
                                className={
                                    scoreClass(
                                        atsScore
                                    )
                                }
                            >
                                {atsScore}%
                            </strong>
                        </div>

                        <div
                            className={`resume-score-ring ${scoreClass(
                                atsScore
                            )}`}
                            style={{
                                "--score":
                                    `${atsScore * 3.6}deg`,
                            }}
                        >
                            <div>
                                {atsScore}
                            </div>
                        </div>

                    </div>

                    <p>
                        Resume structure,
                        keywords and ATS-friendly
                        signals.
                    </p>

                </div>

            </div>

            {/* =================================================
                RESUME SIGNALS
            ================================================= */}

            <div className="resume-insight-grid">

                <div className="resume-insight-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon">
                            ✓
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                STRENGTHS
                            </div>

                            <h3>
                                What stands out
                            </h3>
                        </div>

                    </div>

                    {strengths.length > 0 ? (
                        <div className="resume-bullet-list">

                            {strengths.map(
                                (item, index) => (
                                    <div
                                        className="resume-bullet-item strength"
                                        key={index}
                                    >
                                        <span>
                                            ✓
                                        </span>

                                        <p>
                                            {typeof item ===
                                            "string"
                                                ? item
                                                : item.text ||
                                                  item.title ||
                                                  item.description ||
                                                  ""}
                                        </p>
                                    </div>
                                )
                            )}

                        </div>
                    ) : (
                        <div className="resume-empty-text">
                            No strengths reported.
                        </div>
                    )}

                </div>


                <div className="resume-insight-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon improvement">
                            !
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                IMPROVEMENT AREAS
                            </div>

                            <h3>
                                What to improve
                            </h3>
                        </div>

                    </div>

                    {improvementAreas.length > 0 ? (
                        <div className="resume-bullet-list">

                            {improvementAreas.map(
                                (item, index) => (
                                    <div
                                        className="resume-bullet-item improvement"
                                        key={index}
                                    >
                                        <span>
                                            +
                                        </span>

                                        <p>
                                            {typeof item ===
                                            "string"
                                                ? item
                                                : item.text ||
                                                  item.title ||
                                                  item.description ||
                                                  ""}
                                        </p>
                                    </div>
                                )
                            )}

                        </div>
                    ) : (
                        <div className="resume-empty-text">
                            No major improvement
                            areas reported.
                        </div>
                    )}

                </div>

            </div>

            {/* =================================================
                SKILLS
            ================================================= */}

            <div className="resume-insight-card resume-skills-card">

                <div className="resume-card-heading">

                    <div className="resume-card-icon">
                        ◉
                    </div>

                    <div>
                        <div className="resume-card-eyebrow">
                            DETECTED SKILLS
                        </div>

                        <h3>
                            Your technical profile
                        </h3>
                    </div>

                    <div className="resume-count-badge">
                        {skills.length}
                    </div>

                </div>

                {skills.length > 0 ? (
                    <div className="resume-skills-list">

                        {skills.map(
                            (skill, index) => (
                                <span
                                    className="resume-skill-chip"
                                    key={index}
                                >
                                    {skill}
                                </span>
                            )
                        )}

                    </div>
                ) : (
                    <div className="resume-empty-text">
                        No skills detected.
                    </div>
                )}

            </div>

            {/* =================================================
                ATS DETAILS
            ================================================= */}

            <div className="resume-ats-grid">

                <div className="resume-ats-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon">
                            ▣
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                ATS STRUCTURE
                            </div>

                            <h3>
                                Resume sections
                            </h3>
                        </div>

                    </div>

                    <div className="resume-ats-list">

                        {sections.length > 0 ? (
                            sections.map(
                                (section, index) => (
                                    <span
                                        key={index}
                                        className="resume-ats-tag positive"
                                    >
                                        ✓{" "}
                                        {formatSectionName(
                                            section
                                        )}
                                    </span>
                                )
                            )
                        ) : (
                            <span className="resume-empty-text">
                                Section information
                                unavailable.
                            </span>
                        )}

                    </div>

                </div>


                <div className="resume-ats-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon">
                            ↗
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                ACTION VERBS
                            </div>

                            <h3>
                                Strong language
                            </h3>
                        </div>

                    </div>

                    <div className="resume-ats-list">

                        {actionVerbs.length > 0 ? (
                            actionVerbs
                                .slice(0, 12)
                                .map(
                                    (verb, index) => (
                                        <span
                                            key={index}
                                            className="resume-ats-tag"
                                        >
                                            {verb}
                                        </span>
                                    )
                                )
                        ) : (
                            <span className="resume-empty-text">
                                No action verbs
                                detected.
                            </span>
                        )}

                    </div>

                </div>


                <div className="resume-ats-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon">
                            #
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                QUANTIFICATION
                            </div>

                            <h3>
                                Measurable impact
                            </h3>
                        </div>

                    </div>

                    <div className="resume-quantified-number">
                        {quantifiedResults.length}
                    </div>

                    <p className="resume-ats-description">
                        Quantified results
                        detected in the resume.
                    </p>

                </div>

            </div>

            {/* =================================================
                ROLE RECOMMENDATIONS
            ================================================= */}

            <div className="resume-role-section">

                <div className="resume-card-heading">

                    <div className="resume-card-icon">
                        ✦
                    </div>

                    <div>
                        <div className="resume-card-eyebrow">
                            CAREER DIRECTION
                        </div>

                        <h3>
                            Recommended roles
                        </h3>
                    </div>

                </div>

                {roleRecommendations.length > 0 ? (
                    <div className="resume-role-grid">

                        {roleRecommendations.map(
                            (role, index) => {

                                const roleScore =
                                    getRoleScore(
                                        role
                                    );

                                return (
                                    <div
                                        className="resume-role-card"
                                        key={index}
                                    >

                                        <div className="resume-role-number">
                                            0{index + 1}
                                        </div>

                                        <div className="resume-role-content">

                                            <h4>
                                                {getRoleName(
                                                    role
                                                )}
                                            </h4>

                                            {roleScore !==
                                                null && (
                                                <div className="resume-role-score">
                                                    {clampScore(
                                                        roleScore
                                                    )}
                                                    % fit
                                                </div>
                                            )}

                                            {typeof role ===
                                                "object" &&
                                                role.reason && (
                                                <p>
                                                    {
                                                        role.reason
                                                    }
                                                </p>
                                            )}

                                        </div>

                                        <span className="resume-role-arrow">
                                            →
                                        </span>

                                    </div>
                                );
                            }
                        )}

                    </div>
                ) : (
                    <div className="resume-empty-text">
                        No role recommendations
                        available yet.
                    </div>
                )}

            </div>

            {/* =================================================
                SUGGESTIONS
            ================================================= */}

            {suggestions.length > 0 && (
                <div className="resume-suggestions-card">

                    <div className="resume-card-heading">

                        <div className="resume-card-icon">
                            ✧
                        </div>

                        <div>
                            <div className="resume-card-eyebrow">
                                NEXT STEPS
                            </div>

                            <h3>
                                Recommended improvements
                            </h3>
                        </div>

                    </div>

                    <div className="resume-suggestion-list">

                        {suggestions.map(
                            (suggestion, index) => (
                                <div
                                    className="resume-suggestion-item"
                                    key={index}
                                >
                                    <span>
                                        {index + 1}
                                    </span>

                                    <p>
                                        {typeof suggestion ===
                                        "string"
                                            ? suggestion
                                            : suggestion.text ||
                                              suggestion.title ||
                                              suggestion.description ||
                                              ""}
                                    </p>
                                </div>
                            )
                        )}

                    </div>

                </div>
            )}

            {/* =================================================
                FOOTNOTE
            ================================================= */}

            <div className="resume-analysis-footer">

                <span>
                    Analysis generated by
                    Career.OS
                </span>

                {analysis.generatedAt && (
                    <span>
                        Updated{" "}
                        {new Date(
                            analysis.generatedAt
                        ).toLocaleString(
                            "en-IN",
                            {
                                dateStyle:
                                    "medium",
                                timeStyle:
                                    "short",
                            }
                        )}
                    </span>
                )}

            </div>

        </section>
    );
}