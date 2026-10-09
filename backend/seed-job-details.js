require("dotenv").config();

const {
    MongoClient,
    ObjectId,
} = require("mongodb");

const MONGO_URI =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI;

const DB_NAME =
    "ai-career-assistant";


const jobs = [
    {
        id:
            "6ac552e7f46f0479a2e1e5f4",

        title:
            "AI Engineer",

        company:
            "Oracle",

        location:
            "Bangalore",

        salary:
            800000,

        employmentType:
            "Full-time",

        experience:
            "0–2 years",

        education:
            "B.Tech / B.E. in Computer Science, AI, Data Science or related field",

        description:
            "Oracle is looking for an AI Engineer to build intelligent applications using machine learning, artificial intelligence and modern generative AI technologies. The role involves developing practical AI solutions, integrating models into applications and working with data-driven systems.",

        responsibilities: [
            "Develop and integrate machine learning and artificial intelligence solutions.",
            "Build generative AI applications using large language models.",
            "Design retrieval-augmented generation pipelines for enterprise applications.",
            "Develop and integrate REST APIs for AI-powered services.",
            "Work with Python, SQL and machine learning frameworks.",
            "Collaborate with software engineers and data teams to deploy AI solutions.",
        ],

        companyInfo:
            "Oracle is a global technology company providing cloud infrastructure, enterprise software and database technologies. The company develops cloud and AI solutions used by organizations worldwide.",

        skills: [
            "Python",
            "Machine Learning",
            "AI",
            "SQL",
            "Generative AI",
            "RAG",
        ],
    },


    {
        id:
            "6ac6738992a809896b92bed9",

        title:
            "Machine Learning Engineer",

        company:
            "TechNova",

        location:
            "Hyderabad",

        salary:
            750000,

        employmentType:
            "Full-time",

        experience:
            "0–2 years",

        education:
            "B.Tech / B.E. in Computer Science, Data Science or related field",

        description:
            "TechNova is seeking a Machine Learning Engineer to develop predictive models and data-driven applications. The engineer will work on machine learning pipelines, data preprocessing, model training, evaluation and deployment.",

        responsibilities: [
            "Build and evaluate machine learning models.",
            "Clean, preprocess and analyze structured datasets.",
            "Develop machine learning pipelines using Python.",
            "Use Scikit-learn and PyTorch for model development.",
            "Analyze model performance and improve prediction quality.",
            "Work with SQL databases and data processing workflows.",
        ],

        companyInfo:
            "TechNova is a technology-focused organization developing data and machine learning solutions for business applications.",

        skills: [
            "Python",
            "Machine Learning",
            "Scikit-learn",
            "Pandas",
            "SQL",
            "PyTorch",
        ],
    },


    {
        id:
            "6ac6738092a809896b92bed8",

        title:
            "AI Engineer",

        company:
            "Oracle",

        location:
            "Bangalore",

        salary:
            800000,

        employmentType:
            "Full-time",

        experience:
            "0–2 years",

        education:
            "B.Tech / B.E. in Computer Science, AI, Data Science or related field",

        description:
            "Join an AI engineering team building next-generation intelligent applications. The role combines traditional machine learning with generative AI, LLM-based applications and retrieval-augmented generation systems.",

        responsibilities: [
            "Build production-ready AI and machine learning applications.",
            "Develop applications using large language models and generative AI.",
            "Create RAG pipelines for knowledge-intensive applications.",
            "Experiment with prompt engineering and AI APIs.",
            "Develop Python services and REST APIs.",
            "Collaborate with engineering teams to deploy scalable AI systems.",
        ],

        companyInfo:
            "Oracle develops enterprise cloud, database and artificial intelligence technologies. Its engineering teams work on large-scale software and cloud platforms.",

        skills: [
            "Python",
            "Machine Learning",
            "AI",
            "SQL",
            "Generative AI",
            "RAG",
        ],
    },


    {
        id:
            "6ac6739192a809896b92beda",

        title:
            "Generative AI Developer",

        company:
            "InnoAI",

        location:
            "Pune",

        salary:
            900000,

        employmentType:
            "Full-time",

        experience:
            "0–2 years",

        education:
            "B.Tech / B.E. in Computer Science, AI or related field",

        description:
            "InnoAI is hiring a Generative AI Developer to build LLM-powered applications and intelligent AI workflows. The role focuses on prompt engineering, retrieval-augmented generation, large language models and production API development.",

        responsibilities: [
            "Build applications powered by large language models.",
            "Develop retrieval-augmented generation systems.",
            "Design and test effective prompts for LLM applications.",
            "Integrate generative AI APIs into backend services.",
            "Build Python and FastAPI services for AI applications.",
            "Evaluate AI responses and improve application quality.",
        ],

        companyInfo:
            "InnoAI is an AI-focused technology company developing generative AI products, intelligent automation systems and LLM-powered applications.",

        skills: [
            "Python",
            "LLMs",
            "Generative AI",
            "RAG",
            "Prompt Engineering",
            "FastAPI",
        ],
    },
];


async function seedJobs() {

    if (!MONGO_URI) {
        throw new Error(
            "MongoDB URI is missing from .env"
        );
    }


    const client =
        new MongoClient(
            MONGO_URI
        );


    try {

        await client.connect();

        console.log(
            "✅ Connected to MongoDB"
        );


        const db =
            client.db(
                DB_NAME
            );


        const collection =
            db.collection(
                "jobs"
            );


        for (
            const job of jobs
        ) {

            const {
                id,
                ...jobData
            } = job;


            if (
                !ObjectId.isValid(id)
            ) {
                console.log(
                    `⚠️ Invalid ID: ${id}`
                );

                continue;
            }


            const result =
                await collection.updateOne(
                    {
                        _id:
                            new ObjectId(
                                id
                            ),
                    },
                    {
                        $set: {
                            ...jobData,

                            updatedAt:
                                new Date(),
                        },
                    }
                );


            if (
                result.matchedCount ===
                0
            ) {

                console.log(
                    `⚠️ Job not found: ${job.title} - ${job.company}`
                );

            } else {

                console.log(
                    `✅ Updated: ${job.title} - ${job.company}`
                );
            }
        }


        console.log(
            "\n✅ Job details updated successfully!"
        );

    } finally {

        await client.close();

        console.log(
            "🔌 MongoDB connection closed"
        );
    }
}


seedJobs().catch(
    (error) => {

        console.error(
            "\n❌ Seed error:"
        );

        console.error(
            error
        );

        process.exit(1);
    }
);