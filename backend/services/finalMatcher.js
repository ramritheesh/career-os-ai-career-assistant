/* =========================================================
   FINAL MATCHER
========================================================= */

/*
  Final score formula:

  Keyword Match     = 40%
  Semantic Match    = 60%

  final =
    keywordScore * 0.40
    +
    semanticScore * 0.60
*/

/* =========================================================
   SAFE NUMBER
========================================================= */

function safeScore(value) {
  const number =
    Number(value);

  if (
    Number.isNaN(number) ||
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      number
    )
  );
}

/* =========================================================
   CALCULATE FINAL MATCH
========================================================= */

function calculateFinalMatch(
  keywordScore,
  semanticScore
) {
  const keyword =
    safeScore(
      keywordScore
    );

  const semantic =
    safeScore(
      semanticScore
    );

  const finalScore =
    keyword * 0.4 +
    semantic * 0.6;

  return {
    finalScore:
      Math.round(
        finalScore
      ),

    keywordScore:
      Math.round(
        keyword
      ),

    semanticScore:
      Math.round(
        semantic
      ),

    weights: {
      keyword: 0.4,
      semantic: 0.6,
    },
  };
}

module.exports = {
  calculateFinalMatch,
};