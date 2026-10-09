import { useState } from "react";

const API_URL = "http://localhost:5000";

const INITIAL_JOB = {
    title: "",
    company: "",
    location: "",
    salary: "",
    employmentType: "Full-time",
    experience: "Fresher",
    education: "",
    skills: "",
    description: "",
    responsibilities: "",
    companyInfo: "",
};

function JobManager({
    onJobCreated,
    jobs = [],
}) {
    const [form, setForm] =
        useState(INITIAL_JOB);

    const [editingId, setEditingId] =
        useState(null);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    function handleChange(event) {
        const {
            name,
            value,
        } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }


    function resetForm(
        clearMessages = false
    ) {
        setForm(INITIAL_JOB);
        setEditingId(null);

        if (clearMessages) {
            setMessage("");
            setError("");
        }
    }


    function startEdit(job) {
        setEditingId(job._id);

        setForm({
            title:
                job.title || "",

            company:
                job.company || "",

            location:
                job.location || "",

            salary:
                job.salary || "",

            employmentType:
                job.employmentType ||
                "Full-time",

            experience:
                job.experience ||
                "Fresher",

            education:
                job.education || "",

            skills:
                Array.isArray(
                    job.skills
                )
                    ? job.skills.join(
                          ", "
                      )
                    : job.skills || "",

            description:
                job.description || "",

            responsibilities:
                Array.isArray(
                    job.responsibilities
                )
                    ? job.responsibilities.join(
                          "\n"
                      )
                    : job.responsibilities ||
                      "",

            companyInfo:
                job.companyInfo || "",
        });

        setMessage("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }


    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setLoading(true);
        setMessage("");
        setError("");

        try {
            const payload = {
                title: form.title,

                company: form.company,

                location:
                    form.location,

                salary:
                    Number(
                        form.salary
                    ) || 0,

                employmentType:
                    form.employmentType,

                experience:
                    form.experience,

                education:
                    form.education,

                skills:
                    form.skills
                        .split(",")
                        .map(
                            (skill) =>
                                skill.trim()
                        )
                        .filter(Boolean),

                description:
                    form.description,

                responsibilities:
                    form.responsibilities
                        .split("\n")
                        .map(
                            (item) =>
                                item.trim()
                        )
                        .filter(Boolean),

                companyInfo:
                    form.companyInfo,
            };

            const url = editingId
                ? `${API_URL}/api/jobs/${editingId}`
                : `${API_URL}/api/jobs`;

            const method = editingId
                ? "PUT"
                : "POST";

            const response =
                await fetch(url, {
                    method,

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify(
                        payload
                    ),
                });

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to save job."
                );
            }

            setMessage(
                editingId
                    ? "Job updated successfully."
                    : "Job created successfully."
            );

            resetForm();

            if (onJobCreated) {
                await onJobCreated();
            }
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                    "Failed to save job."
            );
        } finally {
            setLoading(false);
        }
    }


    async function handleDelete(
        jobId
    ) {
        const confirmed =
            window.confirm(
                "Are you sure you want to delete this job?"
            );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError("");

        try {
            const response =
                await fetch(
                    `${API_URL}/api/jobs/${jobId}`,
                    {
                        method:
                            "DELETE",
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to delete job."
                );
            }

            setMessage(
                "Job deleted successfully."
            );

            if (
                editingId === jobId
            ) {
                resetForm();
            }

            if (onJobCreated) {
                await onJobCreated();
            }
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                    "Failed to delete job."
            );
        }
    }


    return (
        <section
            className="job-manager"
            id="manage-jobs"
        >
            <div className="job-manager-heading">
                <div>
                    <span className="section-kicker">
                        JOB MANAGEMENT
                    </span>

                    <h2>
                        {editingId
                            ? "Edit opportunity"
                            : "Create opportunity"}
                    </h2>

                    <p>
                        Add, update and manage
                        the jobs used by your
                        career matching engine.
                    </p>
                </div>
            </div>


            <form
                className="job-manager-form"
                onSubmit={
                    handleSubmit
                }
            >
                <div className="manager-grid">

                    {/* TITLE */}
                    <div className="manager-field">
                        <label>
                            Job title
                        </label>

                        <input
                            type="text"
                            name="title"
                            value={
                                form.title
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="AI Engineer"
                            required
                        />
                    </div>


                    {/* COMPANY */}
                    <div className="manager-field">
                        <label>
                            Company
                        </label>

                        <input
                            type="text"
                            name="company"
                            value={
                                form.company
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Oracle"
                            required
                        />
                    </div>


                    {/* LOCATION */}
                    <div className="manager-field">
                        <label>
                            Location
                        </label>

                        <input
                            type="text"
                            name="location"
                            value={
                                form.location
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Bangalore"
                        />
                    </div>


                    {/* SALARY */}
                    <div className="manager-field">
                        <label>
                            Salary
                        </label>

                        <input
                            type="number"
                            name="salary"
                            value={
                                form.salary
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="800000"
                            min="0"
                        />
                    </div>


                    {/* EMPLOYMENT */}
                    <div className="manager-field">
                        <label>
                            Employment type
                        </label>

                        <select
                            name="employmentType"
                            value={
                                form.employmentType
                            }
                            onChange={
                                handleChange
                            }
                        >
                            <option>
                                Full-time
                            </option>

                            <option>
                                Part-time
                            </option>

                            <option>
                                Internship
                            </option>

                            <option>
                                Contract
                            </option>
                        </select>
                    </div>


                    {/* EXPERIENCE */}
                    <div className="manager-field">
                        <label>
                            Experience
                        </label>

                        <select
                            name="experience"
                            value={
                                form.experience
                            }
                            onChange={
                                handleChange
                            }
                        >
                            <option>
                                Fresher
                            </option>

                            <option>
                                0–1 years
                            </option>

                            <option>
                                1–2 years
                            </option>

                            <option>
                                2–3 years
                            </option>

                            <option>
                                3+ years
                            </option>
                        </select>
                    </div>


                    {/* EDUCATION */}
                    <div className="manager-field manager-field-full">
                        <label>
                            Education
                        </label>

                        <input
                            type="text"
                            name="education"
                            value={
                                form.education
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="B.Tech / B.E in Computer Science"
                        />
                    </div>


                    {/* SKILLS */}
                    <div className="manager-field manager-field-full">
                        <label>
                            Skills

                            <span className="field-hint">
                                Separate with commas
                            </span>
                        </label>

                        <input
                            type="text"
                            name="skills"
                            value={
                                form.skills
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Python, Machine Learning, SQL, RAG"
                        />
                    </div>


                    {/* DESCRIPTION */}
                    <div className="manager-field manager-field-full">
                        <label>
                            Description
                        </label>

                        <textarea
                            name="description"
                            value={
                                form.description
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Describe the role..."
                            rows="5"
                        />
                    </div>


                    {/* RESPONSIBILITIES */}
                    <div className="manager-field manager-field-full">
                        <label>
                            Responsibilities

                            <span className="field-hint">
                                One responsibility
                                per line
                            </span>
                        </label>

                        <textarea
                            name="responsibilities"
                            value={
                                form.responsibilities
                            }
                            onChange={
                                handleChange
                            }
                            placeholder={
                                "Build ML models\nDevelop AI applications\nWork with RAG pipelines"
                            }
                            rows="6"
                        />
                    </div>


                    {/* COMPANY INFO */}
                    <div className="manager-field manager-field-full">
                        <label>
                            Company information
                        </label>

                        <textarea
                            name="companyInfo"
                            value={
                                form.companyInfo
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Information about the company..."
                            rows="4"
                        />
                    </div>

                </div>


                {/* STATUS */}
                {message && (
                    <div className="manager-success">
                        ✓ {message}
                    </div>
                )}

                {error && (
                    <div className="manager-error">
                        ✕ {error}
                    </div>
                )}


                {/* ACTIONS */}
                <div className="manager-actions">

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Saving..."
                            : editingId
                            ? "Update job"
                            : "Create job"}
                    </button>


                    {editingId && (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                                resetForm(
                                    true
                                );
                            }}
                        >
                            Cancel edit
                        </button>
                    )}

                </div>
            </form>


            {/* EXISTING JOBS */}
            <div className="managed-jobs">

                <div className="managed-jobs-header">
                    <div>
                        <span className="section-kicker">
                            DATABASE
                        </span>

                        <h3>
                            Existing opportunities
                        </h3>
                    </div>

                    <span className="managed-count">
                        {
                            jobs.length
                        } jobs
                    </span>
                </div>


                <div className="managed-jobs-list">

                    {jobs.length ===
                    0 ? (
                        <div className="empty-managed">
                            No jobs available.
                        </div>
                    ) : (
                        jobs.map(
                            (job) => (
                                <div
                                    className="managed-job"
                                    key={
                                        job._id
                                    }
                                >

                                    <div className="managed-job-info">

                                        <strong>
                                            {
                                                job.title
                                            }
                                        </strong>

                                        <span>
                                            {
                                                job.company
                                            }

                                            {" · "}

                                            {
                                                job.location
                                            }
                                        </span>

                                    </div>


                                    <div className="managed-job-actions">

                                        <button
                                            type="button"
                                            className="edit-job-button"
                                            onClick={() =>
                                                startEdit(
                                                    job
                                                )
                                            }
                                        >
                                            Edit
                                        </button>


                                        <button
                                            type="button"
                                            className="delete-job-button"
                                            onClick={() =>
                                                handleDelete(
                                                    job._id
                                                )
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>
                            )
                        )
                    )}

                </div>

            </div>
        </section>
    );
}

export default JobManager;