import asyncio
import json
import random
import time
import uuid
from pathlib import Path

from app.games.base import BaseGame

QUESTIONS_PATH = Path(__file__).parent / "questions.json"
QUESTION_SECONDS = 25
BASE_POINTS = 10
SPEED_BONUS_MAX = 5


def _answers_match(submitted: str, correct: str) -> bool:
    return submitted.strip().lower() == correct.strip().lower()


class CoupleQuizGame(BaseGame):
    game_type = "couple_quiz"

    def __init__(self, session_id: uuid.UUID, player_ids: list[uuid.UUID], settings: dict, broadcast_fn):
        super().__init__(session_id, player_ids, settings)
        self._broadcast = broadcast_fn
        self._questions: list[dict] = []
        self._round: int = 0
        self._scores: dict[str, int] = {str(pid): 0 for pid in player_ids}
        self._answers: dict[str, str] = {}
        self._round_start: float = 0.0
        self._timer_task: asyncio.Task | None = None
        self._finished: bool = False

    async def start(self) -> list[dict]:
        all_q = json.loads(QUESTIONS_PATH.read_text())
        # Only include questions that have been answered by the couple
        all_q = [q for q in all_q if q.get("answer") is not None]
        count = self.settings.get("question_count", 10) if self.settings else 10
        self._questions = random.sample(all_q, min(count, len(all_q)))
        self._round = 0
        events = [{"type": "game_started", "payload": {"game_type": "couple_quiz", "total_rounds": len(self._questions)}}]
        events += await self._start_round()
        return events

    async def _start_round(self) -> list[dict]:
        q = self._questions[self._round]
        self._answers = {}
        self._round_start = time.time()
        self._timer_task = asyncio.create_task(self._round_timer())

        question_type = q.get("type", "choice")
        payload = {
            "phase": "question",
            "round": self._round + 1,
            "total_rounds": len(self._questions),
            "question": q["question"],
            "question_type": question_type,
            "time_limit": QUESTION_SECONDS,
        }
        if question_type == "choice":
            payload["options"] = q["options"]

        return [{"type": "game_update", "payload": payload}]

    async def _round_timer(self):
        await asyncio.sleep(QUESTION_SECONDS)
        await self._resolve_round()

    async def _resolve_round(self):
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

        q = self._questions[self._round]
        correct = str(q.get("answer", ""))
        question_type = q.get("type", "choice")
        round_scores: dict[str, int] = {}

        for pid in self._scores:
            answer = self._answers.get(pid, "")
            if _answers_match(answer, correct):
                elapsed = time.time() - self._round_start
                speed_bonus = max(0, int(SPEED_BONUS_MAX * (1 - elapsed / QUESTION_SECONDS)))
                pts = BASE_POINTS + speed_bonus
            else:
                pts = 0
            self._scores[pid] += pts
            round_scores[pid] = pts

        result_payload: dict = {
            "round": self._round + 1,
            "question": q["question"],
            "question_type": question_type,
            "correct_answer": correct,
            "round_scores": round_scores,
            "total_scores": dict(self._scores),
            "player_answers": dict(self._answers),
        }
        if question_type == "choice":
            result_payload["options"] = q.get("options", [])

        await self._broadcast([{"type": "round_result", "payload": result_payload}])
        await asyncio.sleep(4)
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
            return []
        self._answers[pid] = action.get("value", "")
        if len(self._answers) >= len(self._player_ids):
            await self._resolve_round()
        return []

    def get_state(self) -> dict:
        if self._round < len(self._questions):
            q = self._questions[self._round]
            question_type = q.get("type", "choice")
            state: dict = {
                "phase": "question",
                "round": self._round + 1,
                "total_rounds": len(self._questions),
                "question": q["question"],
                "question_type": question_type,
                "time_limit": QUESTION_SECONDS,
                "scores": self._scores,
            }
            if question_type == "choice":
                state["options"] = q.get("options", [])
            return state
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
