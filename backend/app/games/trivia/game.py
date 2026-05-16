import asyncio
import json
import random
import time
import uuid
from pathlib import Path

from app.games.base import BaseGame

QUESTIONS_PATH = Path(__file__).parent / "questions.json"
QUESTION_SECONDS = 20
BASE_POINTS = 10
SPEED_BONUS_MAX = 5


class TriviaGame(BaseGame):
    game_type = "trivia"

    def __init__(self, session_id: uuid.UUID, player_ids: list[uuid.UUID], settings: dict, broadcast_fn):
        super().__init__(session_id, player_ids, settings)
        self._broadcast = broadcast_fn
        self._questions: list[dict] = []
        self._round: int = 0
        self._scores: dict[str, int] = {str(pid): 0 for pid in player_ids}
        self._answers: dict[str, str] = {}  # player_id → answer for current round
        self._round_start: float = 0.0
        self._timer_task: asyncio.Task | None = None
        self._finished: bool = False

    async def start(self) -> list[dict]:
        all_q = json.loads(QUESTIONS_PATH.read_text())
        difficulty = self.settings.get("difficulty", "mixed") if self.settings else "mixed"
        category = self.settings.get("category", "mixed") if self.settings else "mixed"
        if difficulty != "mixed":
            all_q = [q for q in all_q if q.get("difficulty") == difficulty]
        if category != "mixed":
            all_q = [q for q in all_q if q.get("category") == category]
        if not all_q:
            all_q = json.loads(QUESTIONS_PATH.read_text())  # fallback if filter yields nothing
        count = self.settings.get("question_count", 10)
        self._questions = random.sample(all_q, min(count, len(all_q)))
        self._round = 0
        events = [{"type": "game_started", "payload": {"game_type": "trivia", "total_rounds": len(self._questions)}}]
        events += await self._start_round()
        return events

    async def _start_round(self) -> list[dict]:
        q = self._questions[self._round]
        self._answers = {}
        self._round_start = time.time()
        self._timer_task = asyncio.create_task(self._round_timer())
        return [
            {
                "type": "game_update",
                "payload": {
                    "phase": "question",
                    "round": self._round + 1,
                    "total_rounds": len(self._questions),
                    "question": q["question"],
                    "options": q["options"],
                    "time_limit": QUESTION_SECONDS,
                },
            }
        ]

    async def _round_timer(self):
        await asyncio.sleep(QUESTION_SECONDS)
        await self._resolve_round()

    async def _resolve_round(self):
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

        q = self._questions[self._round]
        correct = q["answer"]
        round_scores: dict[str, int] = {}

        for pid in self._scores:
            answer = self._answers.get(pid)
            if answer == correct:
                elapsed = time.time() - self._round_start
                speed_bonus = max(0, int(SPEED_BONUS_MAX * (1 - elapsed / QUESTION_SECONDS)))
                pts = BASE_POINTS + speed_bonus
            else:
                pts = 0
            self._scores[pid] += pts
            round_scores[pid] = pts

        events = [
            {
                "type": "round_result",
                "payload": {
                    "round": self._round + 1,
                    "question": q["question"],
                    "options": q["options"],
                    "correct_answer": correct,
                    "round_scores": round_scores,
                    "total_scores": dict(self._scores),
                },
            }
        ]

        await self._broadcast(events)

        await asyncio.sleep(3)  # show result for 3 seconds
        self._round += 1

        if self._round < len(self._questions) and not self._finished:
            next_events = await self._start_round()
            await self._broadcast(next_events)
        else:
            await self._end_game()

    async def _end_game(self):
        self._finished = True
        sorted_scores = sorted(self._scores.items(), key=lambda x: x[1], reverse=True)
        rankings = [{"player_id": pid, "score": score, "rank": i + 1} for i, (pid, score) in enumerate(sorted_scores)]
        await self._broadcast(
            [{"type": "game_ended", "payload": {"rankings": rankings, "total_scores": dict(self._scores)}}]
        )

    async def handle_action(self, player_id: uuid.UUID, action: dict) -> list[dict]:
        pid = str(player_id)
        if action.get("action") != "answer":
            return []
        if pid in self._answers:
            return []  # already answered
        self._answers[pid] = action.get("value", "")
        # If everyone answered, resolve early
        if len(self._answers) >= len(self._player_ids):
            await self._resolve_round()
        return []

    def get_state(self) -> dict:
        if self._round < len(self._questions):
            q = self._questions[self._round]
            return {
                "phase": "question",
                "round": self._round + 1,
                "total_rounds": len(self._questions),
                "question": q["question"],
                "options": q["options"],
                "time_limit": QUESTION_SECONDS,
                "scores": self._scores,
            }
        return {"phase": "finished", "scores": self._scores}

    @property
    def scores(self) -> dict[str, int]:
        return self._scores

    @property
    def is_finished(self) -> bool:
        return self._finished

    @property
    def _player_ids(self) -> list[uuid.UUID]:
        return self.player_ids
