function getInitial(company = "") {
    return (
        company.trim().charAt(0).toUpperCase() ||
        "J"
    );
}

function JobCard({ job, match }) {
    const percentage =
        match?.matchPercentage ?? 0;

    const matchedSkills =
        match?.matchedSkills || [];

    const missingSkills =
        match?.missingSkills || [];

    const fitLabel =
        percentage >= 80
            ? "Strong fit"
            : percentage >= 50
            ? "Potential fit"
            : "Skill gap";

    return (
        <article className="job-card">

            <div className="job-number">
                {String(job._id)
                    .slice(-2)
                    .toUpperCase()}
            </div>

            <div className="job-top">

                <div className="company-badge">
                    {getInitial(job.company)}
                </div>

                <div className="job-title-area">

                    <span className="job-company">
                        {job.company}
                    </span>

                    <h3>
                        {job.title}
                    </h3>

                </div>

                <div className="match-score">

                    <strong>
                        {percentage}%
                    </strong>

                    <span>
                        MATCH
                    </span>

                </div>

            </div>

            <div className="job-location">
                <span>
                    ● {job.location}
                </span>

                <span>
                    ₹
                    {Number(
                        job.salary || 0
                    ).toLocaleString(
                        "en-IN"
                    )}
                </span>
            </div>

            <div className="job-line" />

            <div className="job-fit-row">

                <span
                    className={
                        percentage >= 80
                            ? "fit-good"
                            : percentage >= 50
                            ? "fit-medium"
                            : "fit-low"
                    }
                >
                    {fitLabel}
                </span>

                {missingSkills.length > 0 && (
                    <span className="skill-gap">
                        {missingSkills.length}
                        {" "}
                        skill
                        {missingSkills.length >
                        1
                            ? "s"
                            : ""}{" "}
                        to improve
                    </span>
                )}

            </div>

            <div className="job-skills">

                {job.skills
                    .slice(0, 5)
                    .map((skill) => {

                        const isMatched =
                            matchedSkills.some(
                                (item) =>
                                    item.toLowerCase() ===
                                    skill.toLowerCase()
                            );

                        return (
                            <span
                                key={skill}
                                className={
                                    isMatched
                                        ? "job-skill active"
                                        : "job-skill"
                                }
                            >
                                {skill}
                            </span>
                        );
                    })}

                {job.skills.length > 5 && (
                    <span className="job-skill">
                        +
                        {job.skills.length -
                            5}
                    </span>
                )}

            </div>

            <div className="job-bottom">

                <span>
                    View intelligence
                </span>

                <span className="arrow">
                    ↗
                </span>

            </div>

        </article>
    );
}

export default JobCard;