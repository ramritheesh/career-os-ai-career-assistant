import {
    useEffect,
    useRef,
    useState,
} from "react";

import ReactMarkdown from "react-markdown";

import "./CareerChat.css";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

const SUGGESTED_QUESTIONS = [
    {
        icon: "✦",
        text: "What skills do I have for an AI Engineer role?",
    },
    {
        icon: "◈",
        text: "What skills am I missing for the Oracle AI Engineer role?",
    },
    {
        icon: "◎",
        text: "Which job is the best match for my resume?",
    },
    {
        icon: "↗",
        text: "How can I improve my resume for Generative AI roles?",
    },
];

function getToken() {
    return localStorage.getItem(
        "career_assistant_token"
    );
}

async function readResponse(response) {
    const text = await response.text();

    let data = {};

    try {
        data = text
            ? JSON.parse(text)
            : {};
    } catch {
        data = {
            message:
                text ||
                "Unknown server response.",
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

function formatSourceType(type) {
    if (type === "resume") {
        return "Resume";
    }

    if (type === "job") {
        return "Job";
    }

    if (type === "profile") {
        return "Profile";
    }

    return type || "Source";
}

function normalizeHistoryItem(item, index) {
    const role =
        item.role ||
        item.sender ||
        "assistant";

    return {
        id:
            item._id ||
            item.id ||
            `${Date.now()}-${index}-${role}`,
        role,
        content:
            item.content ||
            item.message ||
            item.text ||
            "",
        model:
            item.model || null,
        source:
            item.source || null,
        sources:
            Array.isArray(item.sources)
                ? item.sources
                : [],
    };
}

export default function CareerChat() {
    const [question, setQuestion] =
        useState("");

    const [messages, setMessages] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [historyLoading, setHistoryLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const messagesEndRef =
        useRef(null);

    /* =====================================================
       LOAD CHAT HISTORY
    ===================================================== */

    async function loadHistory() {
        const token = getToken();

        if (!token) {
            setHistoryLoading(false);
            return;
        }

        try {
            setHistoryLoading(true);
            setError("");

            const response =
                await fetch(
                    `${API_URL}/api/chat/history`,
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const data =
                await readResponse(
                    response
                );

            const history =
                Array.isArray(
                    data.history
                )
                    ? data.history
                    : Array.isArray(data.messages)
                    ? data.messages
                    : [];

            setMessages(
                history.map(
                    normalizeHistoryItem
                )
            );
        } catch (err) {
            console.error(
                "Chat history error:",
                err
            );

            /*
             * History failure should not
             * prevent the chat UI from working.
             */
            setMessages([]);
        } finally {
            setHistoryLoading(false);
        }
    }

    useEffect(() => {
        loadHistory();
    }, []);

    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, loading]);

    /* =====================================================
       ASK QUESTION
    ===================================================== */

    async function askQuestion(
        questionText = question
    ) {
        const cleanQuestion =
            questionText.trim();

        if (!cleanQuestion || loading) {
            return;
        }

        const token = getToken();

        if (!token) {
            setError(
                "Your session has expired. Please log in again."
            );
            return;
        }

        const userMessage = {
            id: `${Date.now()}-user`,
            role: "user",
            content: cleanQuestion,
        };

        setMessages(
            (previous) => [
                ...previous,
                userMessage,
            ]
        );

        setQuestion("");
        setError("");
        setLoading(true);

        try {
            const response =
                await fetch(
                    `${API_URL}/api/chat/ask`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: JSON.stringify({
                            question:
                                cleanQuestion,
                        }),
                    }
                );

            const data =
                await readResponse(
                    response
                );

            const assistantMessage = {
                id: `${Date.now()}-assistant`,

                role: "assistant",

                content:
                    data.answer ||
                    "I couldn't generate an answer.",

                model:
                    data.model ||
                    null,

                source:
                    data.source ||
                    null,

                sources:
                    Array.isArray(
                        data.sources
                    )
                        ? data.sources
                        : [],
            };

            setMessages(
                (previous) => [
                    ...previous,
                    assistantMessage,
                ]
            );
        } catch (err) {
            console.error(
                "Career chat error:",
                err
            );

            /*
             * Remove the optimistic user message
             * if the request failed.
             */
            setMessages(
                (previous) =>
                    previous.filter(
                        (message) =>
                            message.id !==
                            userMessage.id
                    )
            );

            setError(
                err.message ||
                    "Failed to get an answer."
            );
        } finally {
            setLoading(false);
        }
    }

    /* =====================================================
       SUBMIT
    ===================================================== */

    function handleSubmit(event) {
        event.preventDefault();

        askQuestion();
    }

    /* =====================================================
       SUGGESTION
    ===================================================== */

    function handleSuggestion(
        suggestion
    ) {
        setQuestion(
            suggestion
        );

        askQuestion(
            suggestion
        );
    }

    /* =====================================================
       CLEAR CHAT
    ===================================================== */

    async function clearChat() {
        const token = getToken();

        if (!token) {
            setMessages([]);
            setError("");
            return;
        }

        try {
            setError("");

            const response =
                await fetch(
                    `${API_URL}/api/chat/history`,
                    {
                        method: "DELETE",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            await readResponse(
                response
            );

            setMessages([]);
        } catch (err) {
            console.error(
                "Clear chat error:",
                err
            );

            setError(
                err.message ||
                    "Failed to clear chat history."
            );
        }
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <section className="career-chat-panel">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="career-chat-header">

                <div className="career-chat-header-main">

                    <div className="career-chat-header-icon">
                        ✦
                    </div>

                    <div>

                        <div className="career-chat-eyebrow">
                            CAREER AI
                        </div>

                        <h2>
                            Career Assistant
                        </h2>

                        <p>
                            Your personal AI
                            copilot for resumes,
                            jobs, skills and
                            career direction.
                        </p>

                    </div>

                </div>

                {messages.length > 0 && (
                    <button
                        type="button"
                        className="career-chat-clear"
                        onClick={clearChat}
                    >
                        <span>
                            ×
                        </span>

                        Clear chat
                    </button>
                )}

            </div>

            {/* =================================================
                AI STATUS
            ================================================= */}

            <div className="career-chat-status-bar">

                <div className="career-chat-status">

                    <span className="career-chat-status-dot" />

                    <span>
                        Career AI is ready
                    </span>

                </div>

                <div className="career-chat-status-info">
                    Resume + Profile + Jobs
                </div>

            </div>

            {/* =================================================
                HISTORY LOADING
            ================================================= */}

            {historyLoading ? (
                <div className="career-chat-history-loading">

                    <div className="career-chat-history-spinner" />

                    <span>
                        Restoring your conversation...
                    </span>

                </div>
            ) : (
                <>
                    {/* =========================================
                        EMPTY STATE
                    ========================================== */}

                    {messages.length === 0 && (
                        <div className="career-chat-empty">

                            <div className="career-chat-empty-hero">

                                <div className="career-chat-empty-orb">
                                    <span>
                                        ✦
                                    </span>
                                </div>

                                <div>
                                    <div className="career-chat-empty-eyebrow">
                                        YOUR AI CAREER COPILOT
                                    </div>

                                    <h3>
                                        What would you
                                        like to know?
                                    </h3>

                                    <p>
                                        Ask questions about
                                        your resume, job
                                        matches, missing
                                        skills, interviews
                                        or career direction.
                                    </p>
                                </div>

                            </div>

                            <div className="career-chat-suggestions">

                                {SUGGESTED_QUESTIONS.map(
                                    (suggestion) => (
                                        <button
                                            key={
                                                suggestion.text
                                            }
                                            type="button"
                                            onClick={() =>
                                                handleSuggestion(
                                                    suggestion.text
                                                )
                                            }
                                        >

                                            <span className="career-chat-suggestion-icon">
                                                {
                                                    suggestion.icon
                                                }
                                            </span>

                                            <span className="career-chat-suggestion-text">
                                                {
                                                    suggestion.text
                                                }
                                            </span>

                                            <span className="career-chat-suggestion-arrow">
                                                →
                                            </span>

                                        </button>
                                    )
                                )}

                            </div>

                        </div>
                    )}

                    {/* =========================================
                        MESSAGES
                    ========================================== */}

                    {messages.length > 0 && (
                        <div className="career-chat-messages">

                            {messages.map(
                                (message) => (
                                    <div
                                        key={
                                            message.id
                                        }
                                        className={
                                            message.role ===
                                            "user"
                                                ? "career-chat-message career-chat-message-user"
                                                : "career-chat-message career-chat-message-assistant"
                                        }
                                    >

                                        {message.role ===
                                            "assistant" && (
                                            <div className="career-chat-avatar">
                                                ✦
                                            </div>
                                        )}

                                        <div className="career-chat-message-body">

                                            <div className="career-chat-message-label">

                                                <span>
                                                    {
                                                        message.role ===
                                                        "user"
                                                            ? "You"
                                                            : "Career AI"
                                                    }
                                                </span>

                                            </div>

                                            <div className="career-chat-message-content">

                                                {message.role ===
                                                "assistant" ? (
                                                    <div className="career-chat-markdown">
                                                        <ReactMarkdown>
                                                            {
                                                                message.content
                                                            }
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p>
                                                        {
                                                            message.content
                                                        }
                                                    </p>
                                                )}

                                            </div>

                                            {/* =================================
                                                SOURCES
                                            ================================= */}

                                            {message.role ===
                                                "assistant" &&
                                                message.sources?.length >
                                                    0 && (
                                                    <div className="career-chat-sources">

                                                        <div className="career-chat-sources-title">
                                                            <span>
                                                                ◈
                                                            </span>

                                                            Sources
                                                        </div>

                                                        <div className="career-chat-source-list">

                                                            {message.sources
                                                                .slice(
                                                                    0,
                                                                    6
                                                                )
                                                                .map(
                                                                    (
                                                                        source,
                                                                        index
                                                                    ) => (
                                                                        <div
                                                                            key={`${source.title || "source"}-${index}`}
                                                                            className="career-chat-source"
                                                                        >

                                                                            <span className="career-chat-source-dot" />

                                                                            <span className="career-chat-source-type">
                                                                                {formatSourceType(
                                                                                    source.type
                                                                                )}
                                                                            </span>

                                                                            <span className="career-chat-source-title">
                                                                                {
                                                                                    source.title
                                                                                }
                                                                            </span>

                                                                        </div>
                                                                    )
                                                                )}

                                                        </div>

                                                    </div>
                                                )}

                                            {/* =================================
                                                MODEL
                                            ================================= */}

                                            {message.role ===
                                                "assistant" &&
                                                message.model && (
                                                    <div className="career-chat-model">

                                                        <span>
                                                            AI
                                                        </span>

                                                        {message.source ===
                                                        "local-rag-fallback"
                                                            ? "Local RAG fallback"
                                                            : message.model}

                                                    </div>
                                                )}

                                        </div>

                                    </div>
                                )
                            )}

                            {/* =====================================
                                TYPING
                            ====================================== */}

                            {loading && (
                                <div className="career-chat-message career-chat-message-assistant">

                                    <div className="career-chat-avatar">
                                        ✦
                                    </div>

                                    <div className="career-chat-message-body">

                                        <div className="career-chat-message-label">
                                            Career AI
                                        </div>

                                        <div className="career-chat-typing">

                                            <div className="career-chat-typing-dots">
                                                <span />
                                                <span />
                                                <span />
                                            </div>

                                            <span>
                                                Analyzing your career data...
                                            </span>

                                        </div>

                                    </div>

                                </div>
                            )}

                            <div
                                ref={
                                    messagesEndRef
                                }
                            />

                        </div>
                    )}
                </>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="career-chat-error">

                    <span className="career-chat-error-icon">
                        !
                    </span>

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>

                </div>
            )}

            {/* =================================================
                INPUT
            ================================================= */}

            <form
                className="career-chat-input-area"
                onSubmit={handleSubmit}
            >

                <div className="career-chat-input-wrapper">

                    <textarea
                        value={
                            question
                        }
                        onChange={(
                            event
                        ) =>
                            setQuestion(
                                event.target.value
                            )
                        }
                        placeholder="Ask about your resume, skills, job matches, interview preparation..."
                        rows={2}
                        maxLength={1000}
                        disabled={loading}
                        onKeyDown={(
                            event
                        ) => {
                            if (
                                event.key ===
                                    "Enter" &&
                                !event.shiftKey
                            ) {
                                event.preventDefault();

                                handleSubmit(
                                    event
                                );
                            }
                        }}
                    />

                    <div className="career-chat-input-bottom">

                        <span className="career-chat-character-count">
                            {
                                question.length
                            }
                            /1000
                        </span>

                        <span className="career-chat-input-hint">
                            Enter to send · Shift + Enter for new line
                        </span>

                        <button
                            type="submit"
                            className="career-chat-send"
                            disabled={
                                loading ||
                                !question.trim()
                            }
                        >
                            {loading ? (
                                <span className="career-chat-send-spinner" />
                            ) : (
                                "↑"
                            )}
                        </button>

                    </div>

                </div>

            </form>

        </section>
    );
}