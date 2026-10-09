function CareerInsights({ job, match }) {
    const matchedSkills =
        match?.matchedSkills || [];

    const missingSkills =
        match?.missingSkills || [];

    const percentage =
        match?.matchPercentage ?? 0;

    function getFitMessage() {
        if (percentage >= 80) {
            return "You are a strong candidate for this role. Your current skill set covers most of the employer's technical requirements.";
        }

        if (percentage >= 60) {
            return "You have a good foundation for this role, but developing the missing skills would make your profile stronger.";
        }

        if (percentage >= 40) {
            return "You have some relevant skills, but there are several gaps between your current profile and this role.";
        }

        return "This role currently has a significant skill gap. Use the missing skills as a roadmap for improvement.";
    }

    function getPriority(skill) {
        const highPriority = [
            "machine learning",
            "artificial intelligence",
            "python",
            "sql",
            "deep learning",
            "generative ai",
            "rag",
            "llm",
        ];

        if (
            highPriority.includes(
                skill.toLowerCase()
            )
        ) {
            return "HIGH";
        }

        return "MEDIUM";
    }

    return (
        <section className="career-insights">

            <div className="insights-header">

                <div>
                    <span className="section-kicker">
                        CAREER INTELLIGENCE
                    </span>

                    <h2>
                        Your path to this role
                    </h2>

                    <p>
                        A breakdown of how your current
                        resume compares with the
                        requirements for{" "}
                        <strong>
                            {job.title}
                        </strong>.
                    </p>
                </div>

                <div className="insights-score">
                    <strong>
                        {percentage}%
                    </strong>

                    <span>
                        current fit
                    </span>
                </div>

            </div>

            {/* WHY YOU MATCH */}

            <div className="insight-block">

                <span className="insight-number">
                    01
                </span>

                <div className="insight-content">

                    <h3>
                        Why you match
                    </h3>

                    <p>
                        {getFitMessage()}
                    </p>

                    {matchedSkills.length >
                        0 && (
                        <div className="insight-tags">

                            {matchedSkills.map(
                                (skill) => (
                                    <span
                                        className="insight-tag positive"
                                        key={skill}
                                    >
                                        ✓ {skill}
                                    </span>
                                )
                            )}

                        </div>
                    )}

                </div>

            </div>

            {/* SKILL GAPS */}

            <div className="insight-block">

                <span className="insight-number">
                    02
                </span>

                <div className="insight-content">

                    <h3>
                        Skills to develop
                    </h3>

                    {missingSkills.length >
                    0 ? (
                        <div className="gap-list">

                            {missingSkills.map(
                                (skill) => (
                                    <div
                                        className="gap-item"
                                        key={skill}
                                    >

                                        <div>
                                            <strong>
                                                {skill}
                                            </strong>

                                            <span>
                                                Recommended
                                                for this
                                                role
                                            </span>
                                        </div>

                                        <span
                                            className={
                                                getPriority(
                                                    skill
                                                ) ===
                                                "HIGH"
                                                    ? "priority high"
                                                    : "priority medium"
                                            }
                                        >
                                            {getPriority(
                                                skill
                                            )}
                                        </span>

                                    </div>
                                )
                            )}

                        </div>
                    ) : (
                        <div className="all-covered">
                            ✓ No major skill gaps
                            detected.
                        </div>
                    )}

                </div>

            </div>

            {/* ROADMAP */}

            <div className="insight-block">

                <span className="insight-number">
                    03
                </span>

                <div className="insight-content">

                    <h3>
                        Suggested action plan
                    </h3>

                    <div className="action-plan">

                        <div>
                            <span>01</span>

                            <p>
                                Strengthen the skills
                                you already have by
                                adding measurable
                                project experience.
                            </p>
                        </div>

                        <div>
                            <span>02</span>

                            <p>
                                Focus first on the
                                highest-priority
                                missing skills.
                            </p>
                        </div>

                        <div>
                            <span>03</span>

                            <p>
                                Update your resume to
                                clearly demonstrate
                                those skills before
                                applying.
                            </p>
                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}

export default CareerInsights;