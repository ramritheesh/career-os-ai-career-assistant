const {
    createEmbedding,
} = require(
    "./embeddingService"
);

const {
    cosineSimilarity,
    similarityToPercentage,
} = require(
    "./similarityService"
);


async function testSimilarity() {
    try {
        console.log(
            "\n🧠 Testing semantic similarity...\n"
        );


        // ==========================================
        // RESUME
        // ==========================================

        const resumeText = `
            I am a software engineer with
            experience in Python, machine
            learning, SQL and artificial
            intelligence. I have built RAG
            applications using large language
            models and worked on data analysis
            projects.
        `;


        // ==========================================
        // JOB
        // ==========================================

        const jobText = `
            We are looking for an AI Engineer
            who can build machine learning
            applications using Python, SQL,
            generative AI, retrieval augmented
            generation and large language models.
        `;


        console.log(
            "Creating resume embedding..."
        );

        const resumeEmbedding =
            await createEmbedding(
                resumeText
            );

        console.log(
            "✅ Resume embedding ready"
        );


        console.log(
            "\nCreating job embedding..."
        );

        const jobEmbedding =
            await createEmbedding(
                jobText
            );

        console.log(
            "✅ Job embedding ready"
        );


        // ==========================================
        // SIMILARITY
        // ==========================================

        const similarity =
            cosineSimilarity(
                resumeEmbedding,
                jobEmbedding
            );


        const percentage =
            similarityToPercentage(
                similarity
            );


        console.log(
            "\n────────────────────────────"
        );

        console.log(
            "SEMANTIC MATCH RESULT"
        );

        console.log(
            "────────────────────────────"
        );

        console.log(
            "Raw similarity:",
            similarity
        );

        console.log(
            "Semantic match:",
            `${percentage}%`
        );

        console.log(
            "────────────────────────────\n"
        );


        if (percentage >= 80) {
            console.log(
                "🔥 Very strong semantic match"
            );
        } else if (percentage >= 60) {
            console.log(
                "✅ Good semantic match"
            );
        } else if (percentage >= 40) {
            console.log(
                "🟡 Moderate semantic match"
            );
        } else {
            console.log(
                "🔴 Low semantic match"
            );
        }


        console.log(
            "\n✅ Similarity system is working!"
        );

    } catch (error) {
        console.error(
            "\n❌ Similarity test failed:\n"
        );

        console.error(error);

        process.exit(1);
    }
}


testSimilarity();