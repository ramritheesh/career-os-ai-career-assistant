const {
    createEmbedding,
} = require("./embeddingService");


async function testEmbeddings() {
    try {
        console.log(
            "\n🧠 Testing semantic embeddings...\n"
        );


        const resumeText = `
            Python developer with experience
            in machine learning, SQL,
            data analysis and AI applications.
            Built RAG-based applications using
            large language models.
        `;


        const jobText = `
            Looking for an AI Engineer with
            Python, machine learning, SQL,
            generative AI and RAG experience.
            Candidate should understand
            large language models.
        `;


        console.log(
            "Creating resume embedding..."
        );

        const resumeEmbedding =
            await createEmbedding(
                resumeText
            );


        console.log(
            "✅ Resume embedding created"
        );

        console.log(
            "Embedding dimensions:",
            resumeEmbedding.length
        );


        console.log(
            "\nFirst 10 values:"
        );

        console.log(
            resumeEmbedding.slice(
                0,
                10
            )
        );


        console.log(
            "\nCreating job embedding..."
        );

        const jobEmbedding =
            await createEmbedding(
                jobText
            );


        console.log(
            "✅ Job embedding created"
        );

        console.log(
            "Embedding dimensions:",
            jobEmbedding.length
        );


        console.log(
            "\nFirst 10 job values:"
        );

        console.log(
            jobEmbedding.slice(
                0,
                10
            )
        );


        console.log(
            "\n✅ Embedding system is working!"
        );

    } catch (error) {
        console.error(
            "\n❌ Embedding test failed:\n"
        );

        console.error(
            error
        );

        process.exit(1);
    }
}


testEmbeddings();