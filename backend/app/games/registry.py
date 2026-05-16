from app.games.trivia.game import TriviaGame
from app.games.couple_quiz.game import CoupleQuizGame

GAME_REGISTRY: dict[str, type] = {
    "trivia": TriviaGame,
    "couple_quiz": CoupleQuizGame,
}
