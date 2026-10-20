from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.graph.llm import llm
from app.graph.prompts import EVALUATE_ANSWER_PROMPT
from app.graph.state import InterviewState, Turn


class AnswerEvaluation(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str = Field(description="Two to four sentences to the candidate.")


evaluation_llm = llm.with_structured_output(AnswerEvaluation)


def format_answer_context(state: InterviewState) -> str:
    question = state["current_question"]
    lines = [
        f"Role: {state['role']}",
        f"Experience level: {state['experience_level']}",
        f"Topic: {question['topic']}",
        f"Question type: {question['question_type']}",
        f"Difficulty: {question['difficulty']}",
    ]
    # A follow-up only makes sense next to the exchange it builds on.
    if question["follows_up_on"]:
        parent = state["turns"][question["follows_up_on"] - 1]
        lines.append(
            f"\nEarlier question: {parent['question']}"
            f"\nEarlier answer: {parent['answer']}"
        )
    lines.append(f"\nQuestion: {question['question']}")
    lines.append(f"Answer: {state['current_answer']}")
    return "\n".join(lines)


async def evaluate_answer(state: InterviewState) -> dict:
    result = await evaluation_llm.ainvoke(
        [
            SystemMessage(EVALUATE_ANSWER_PROMPT),
            HumanMessage(format_answer_context(state)),
        ]
    )

    turn: Turn = {
        **state["current_question"],
        "answer": state["current_answer"],
        "score": result.score,
        "feedback": result.feedback,
    }
    return {
        "turns": [*state["turns"], turn],
        "current_question": None,
        "current_answer": None,
    }
