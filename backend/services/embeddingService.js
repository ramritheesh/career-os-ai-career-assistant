const MODEL_NAME =
    "Xenova/all-MiniLM-L6-v2";

let extractorPromise = null;


/**
 * Load the embedding model only once.
 *
 * The first time this is called,
 * Transformers.js downloads the model
 * and caches it locally.
 *
 * Later requests reuse the same model.
 */
async function getExtractor() {
    if (!extractorPromise) {
        const {
            pipeline,
        } = await import(
            "@huggingface/transformers"
        );

        console.log(
            `🤖 Loading embedding model: ${MODEL_NAME}`
        );

        extractorPromise =
            pipeline(
                "feature-extraction",
                MODEL_NAME
            );

        await extractorPromise;

        console.log(
            "✅ Embedding model ready"
        );
    }

    return extractorPromise;
}


/**
 * Convert text into a numerical embedding.
 *
 * pooling: mean
 *   Converts token-level vectors into
 *   one sentence/document vector.
 *
 * normalize: true
 *   Normalizes the resulting vector,
 *   which is useful for cosine similarity.
 */
async function createEmbedding(text) {
    if (
        !text ||
        typeof text !== "string"
    ) {
        throw new Error(
            "Text is required to create an embedding."
        );
    }

    const extractor =
        await getExtractor();

    const output =
        await extractor(text, {
            pooling: "mean",
            normalize: true,
        });

    return Array.from(
        output.data
    );
}


/**
 * Create embeddings for multiple texts.
 *
 * This will be useful later when we
 * compare one resume against many jobs.
 */
async function createEmbeddings(texts) {
    if (
        !Array.isArray(texts) ||
        texts.length === 0
    ) {
        throw new Error(
            "A non-empty array of texts is required."
        );
    }

    const extractor =
        await getExtractor();

    const output =
        await extractor(texts, {
            pooling: "mean",
            normalize: true,
        });

    return output.tolist();
}


module.exports = {
    createEmbedding,
    createEmbeddings,
};