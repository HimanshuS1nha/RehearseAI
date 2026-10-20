from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.graph.context import format_context
from app.graph.llm import llm
from app.graph.prompts import ASK_QUESTION_PROMPT
from app.graph.state import InterviewState
from app.models.enums import Difficulty, QuestionType


class GeneratedQuestion(BaseModel):
    question: str
    topic: str = Field(
        description="One of the configured topics, spelled exactly as given."
    )
    question_type: QuestionType
    difficulty: Difficulty
    follows_up_on: int | None = Field(
        description="Number of the earlier question this follows up on, or null."
    )


question_llm = llm.with_structured_output(GeneratedQuestion)


async def ask_question(state: InterviewState) -> dict:
    result = await question_llm.ainvoke(
        [SystemMessage(ASK_QUESTION_PROMPT), HumanMessage(format_context(state))]
    )

    # The model can point at a question that doesn't exist; a dangling
    # reference would later fail to map to a parent_question_id.
    follows_up_on = result.follows_up_on
    if follows_up_on is not None and not 1 <= follows_up_on <= len(state["turns"]):
        follows_up_on = None

    return {"current_question": {**result.model_dump(), "follows_up_on": follows_up_on}}
