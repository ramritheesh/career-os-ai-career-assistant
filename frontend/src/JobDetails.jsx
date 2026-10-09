import CareerInsights from "./CareerInsights";

function getInitial(company = "") {
    return (
        company
            .trim()
            .charAt(0)
            .toUpperCase() || "J"
    );
}

function formatSalary(salary) {
    const value = Number(salary || 0);

    if (!value) {
        return "Salary not specified";
    }

    return `₹${value.toLocaleString("en-IN")}`;
}

function JobDetails({
    job,
    match,
    onBack,
}) {
    const percentage =
        match?.matchPercentage ?? 0;

    const matchedSkills =
        match?.matchedSkills || [];

    const missingSkills =
        match?.missingSkills || [];

    const requiredSkills =
        match?.requiredSkills ||
        job?.skills ||
        [];

    const responsibilities =
        Array.isArray(
            job?.responsibilities
        )
            ? job.responsibilities
            : [];

    const employmentType =
        job?.employmentType ||
        "Not specified";

    const experience =
        job?.experience ||
        "Not specified";

    const education =
        job?.education ||
        "Not specified";

    const description =
        job?.description ||
        "No job description has been added yet.";

    const companyInfo =
        job?.companyInfo ||
        "No company information has been added yet.";

    const matchProgressStyle = {
        "--progress": `${percentage}%`,
    };

    return (
        <div className="details-page">

            {/* =================================================
                DETAILS CONTAINER
            ================================================= */}

            <div className="details-container">

                {/* =================================================
                    NAVIGATION
                ================================================= */}

                <header className="details-nav">

                    <div className="brand">
                        <span className="brand-mark">
                            C
                        </span>

                        <span>
                            CAREER.OS
                        </span>
                    </div>


                    <button
                        type="button"
                        className="back-button"
                        onClick={onBack}
                    >
                        ← Back to opportunities
                    </button>

                </header>


                {/* =================================================
                    HERO
                ================================================= */}

                <section className="details-hero">

                    <div className="details-hero-copy">

                        <div className="details-company">

                            <div className="company-badge">
                                {getInitial(
                                    job?.company
                                )}
                            </div>

                            <span className="details-company-name">
                                {job?.company ||
                                    "Company"}
                            </span>

                        </div>


                        <span className="section-kicker">
                            OPPORTUNITY
                        </span>


                        <h1>
                            {job?.title ||
                                "Untitled role"}
                        </h1>


                        <div className="details-meta">

                            <span>
                                ●{" "}
                                {job?.location ||
                                    "Location not specified"}
                            </span>

                            <span>
                                {formatSalary(
                                    job?.salary
                                )}
                            </span>

                            <span>
                                {employmentType}
                            </span>

                        </div>

                    </div>


                    {/* =================================================
                        MATCH SCORE
                    ================================================= */}

                    <div className="match-hero">

                        <div
                            className="score-orbit"
                            style={
                                matchProgressStyle
                            }
                        >

                            <div className="score-orbit-content">

                                <strong>
                                    {percentage}%
                                </strong>

                                <span>
                                    resume match
                                </span>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    QUICK INFORMATION
                ================================================= */}

                <section className="job-information">

                    <div className="job-info-card">

                        <span className="section-kicker">
                            EXPERIENCE
                        </span>

                        <h3>
                            {experience}
                        </h3>

                        <p>
                            Experience expected
                            for this role.
                        </p>

                    </div>


                    <div className="job-info-card">

                        <span className="section-kicker">
                            EDUCATION
                        </span>

                        <h3>
                            {education}
                        </h3>

                        <p>
                            Educational background
                            associated with this
                            opportunity.
                        </p>

                    </div>


                    <div className="job-info-card">

                        <span className="section-kicker">
                            EMPLOYMENT
                        </span>

                        <h3>
                            {employmentType}
                        </h3>

                        <p>
                            Employment format
                            for the position.
                        </p>

                    </div>


                    <div className="job-info-card">

                        <span className="section-kicker">
                            COMPENSATION
                        </span>

                        <h3>
                            {formatSalary(
                                job?.salary
                            )}
                        </h3>

                        <p>
                            Listed compensation
                            for this opportunity.
                        </p>

                    </div>

                </section>


                {/* =================================================
                    DESCRIPTION + COMPANY
                ================================================= */}

                <section className="job-information">

                    <div className="job-info-card">

                        <span className="section-kicker">
                            ROLE
                        </span>

                        <h3>
                            About this role
                        </h3>

                        <p>
                            {description}
                        </p>

                    </div>


                    <div className="job-info-card">

                        <span className="section-kicker">
                            COMPANY
                        </span>

                        <h3>
                            About the company
                        </h3>

                        <p>
                            {companyInfo}
                        </p>

                    </div>

                </section>


                {/* =================================================
                    RESPONSIBILITIES
                ================================================= */}

                <section className="job-information">

                    <div className="job-info-card">

                        <span className="section-kicker">
                            RESPONSIBILITIES
                        </span>

                        <h3>
                            What you'll work on
                        </h3>


                        {responsibilities.length >
                        0 ? (
                            <div className="job-responsibilities">

                                {responsibilities.map(
                                    (
                                        responsibility,
                                        index
                                    ) => (
                                        <div
                                            className="job-responsibility"
                                            key={`${responsibility}-${index}`}
                                        >
                                            {
                                                responsibility
                                            }
                                        </div>
                                    )
                                )}

                            </div>
                        ) : (
                            <p>
                                No responsibilities
                                have been added
                                yet.
                            </p>
                        )}

                    </div>

                </section>


                {/* =================================================
                    REQUIRED SKILLS
                ================================================= */}

                <section className="details-section">

                    <span className="section-kicker">
                        REQUIREMENTS
                    </span>

                    <h2>
                        Skills required
                    </h2>

                    <p>
                        These are the skills
                        currently associated
                        with this role.
                    </p>


                    <div className="large-skill-list">

                        {requiredSkills.length >
                        0 ? (
                            requiredSkills.map(
                                (skill) => {
                                    const isMatched =
                                        matchedSkills.some(
                                            (item) =>
                                                item
                                                    .toLowerCase()
                                                    .trim() ===
                                                String(
                                                    skill
                                                )
                                                    .toLowerCase()
                                                    .trim()
                                        );

                                    return (
                                        <span
                                            key={
                                                skill
                                            }
                                            className={
                                                isMatched
                                                    ? "large-skill matched"
                                                    : "large-skill"
                                            }
                                        >
                                            {isMatched
                                                ? "✓ "
                                                : ""}
                                            {skill}
                                        </span>
                                    );
                                }
                            )
                        ) : (
                            <span className="large-skill">
                                No skills specified
                            </span>
                        )}

                    </div>

                </section>


                {/* =================================================
                    MATCH BREAKDOWN
                ================================================= */}

                <section className="breakdown-section">

                    <span className="section-kicker">
                        MATCH ANALYSIS
                    </span>

                    <h2>
                        Why you're a{" "}
                        {percentage >= 80
                            ? "strong"
                            : percentage >= 50
                            ? "potential"
                            : "lower"}{" "}
                        fit
                    </h2>


                    {/* SKILLS MATCHED */}

                    <div className="breakdown-row">

                        <span className="breakdown-name">
                            Skills matched
                        </span>

                        <div className="breakdown-bar">

                            <div
                                className="breakdown-fill"
                                style={{
                                    width: `${percentage}%`,
                                }}
                            />

                        </div>

                        <span className="breakdown-value">
                            {matchedSkills.length}
                            {" / "}
                            {requiredSkills.length}
                        </span>

                    </div>


                    {/* SKILLS MISSING */}

                    <div className="breakdown-row">

                        <span className="breakdown-name">
                            Skills missing
                        </span>

                        <div className="breakdown-bar">

                            <div
                                className="breakdown-fill"
                                style={{
                                    width:
                                        requiredSkills.length >
                                        0
                                            ? `${
                                                  (missingSkills.length /
                                                      requiredSkills.length) *
                                                  100
                                              }%`
                                            : "0%",
                                }}
                            />

                        </div>

                        <span className="breakdown-value">
                            {missingSkills.length}
                        </span>

                    </div>


                    {/* OVERALL */}

                    <div className="breakdown-row">

                        <span className="breakdown-name">
                            Overall fit
                        </span>

                        <div className="breakdown-bar">

                            <div
                                className="breakdown-fill"
                                style={{
                                    width: `${percentage}%`,
                                }}
                            />

                        </div>

                        <span className="breakdown-value">
                            {percentage}%
                        </span>

                    </div>

                </section>


                {/* =================================================
                    STRENGTHS + GAPS
                ================================================= */}

                <section className="details-columns">

                    {/* MATCHED */}

                    <div className="details-section">

                        <span className="section-kicker">
                            STRENGTHS
                        </span>

                        <h2>
                            Skills you have
                        </h2>

                        {matchedSkills.length >
                        0 ? (
                            <div className="large-skill-list">

                                {matchedSkills.map(
                                    (skill) => (
                                        <span
                                            key={
                                                skill
                                            }
                                            className="large-skill matched"
                                        >
                                            ✓{" "}
                                            {skill}
                                        </span>
                                    )
                                )}

                            </div>
                        ) : (
                            <p>
                                No matching skills
                                detected yet.
                            </p>
                        )}

                    </div>


                    {/* MISSING */}

                    <div className="details-section">

                        <span className="section-kicker">
                            GAPS
                        </span>

                        <h2>
                            Skills to improve
                        </h2>

                        {missingSkills.length >
                        0 ? (
                            <div className="large-skill-list">

                                {missingSkills.map(
                                    (skill) => (
                                        <span
                                            key={
                                                skill
                                            }
                                            className="large-skill missing"
                                        >
                                            +{" "}
                                            {skill}
                                        </span>
                                    )
                                )}

                            </div>
                        ) : (
                            <p>
                                No major skill gaps
                                detected.
                            </p>
                        )}

                    </div>

                </section>


                {/* =================================================
                    CAREER INTELLIGENCE
                ================================================= */}

                <CareerInsights
                    job={job}
                    match={match}
                />


                {/* =================================================
                    NEXT AI LAYER
                ================================================= */}

                <section className="future-ai">

                    <span className="section-kicker">
                        NEXT LAYER
                    </span>

                    <h2>
                        AI career strategist
                    </h2>

                    <p>
                        The next version of
                        CAREER.OS will use AI
                        to explain this role,
                        improve your resume for
                        it, identify the most
                        important missing skills,
                        generate interview
                        questions and build a
                        personalized preparation
                        plan.
                    </p>

                </section>

            </div>
        </div>
    );
}

export default JobDetails;