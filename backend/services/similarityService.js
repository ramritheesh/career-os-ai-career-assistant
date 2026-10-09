function cosineSimilarity(vectorA, vectorB) {
    if (
        !Array.isArray(vectorA) ||
        !Array.isArray(vectorB)
    ) {
        throw new Error(
            "Both inputs must be arrays."
        );
    }

    if (
        vectorA.length === 0 ||
        vectorB.length === 0
    ) {
        throw new Error(
            "Vectors cannot be empty."
        );
    }

    if (
        vectorA.length !== vectorB.length
    ) {
        throw new Error(
            "Vectors must have the same dimensions."
        );
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (
        let i = 0;
        i < vectorA.length;
        i++
    ) {
        dotProduct +=
            vectorA[i] * vectorB[i];

        magnitudeA +=
            vectorA[i] * vectorA[i];

        magnitudeB +=
            vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(
        magnitudeA
    );

    magnitudeB = Math.sqrt(
        magnitudeB
    );

    if (
        magnitudeA === 0 ||
        magnitudeB === 0
    ) {
        return 0;
    }

    return (
        dotProduct /
        (magnitudeA * magnitudeB)
    );
}


function similarityToPercentage(
    similarity
) {
    const percentage =
        similarity * 100;

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                percentage
            )
        )
    );
}


module.exports = {
    cosineSimilarity,
    similarityToPercentage,
};