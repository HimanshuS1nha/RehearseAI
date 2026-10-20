from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.constants import MAX_QUESTIONS
from app.graph.context import format_context
from app.graph.llm import llm
from app.graph.prompts import DECIDE_ACTION_PROMPT
from app.graph.state import InterviewState


class Decision(BaseModel):
    decision: Literal["continue", "finish"]
    reason: str = Field(description="One sentence explaining the decision.")


decision_llm = llm.with_structured_output(Decision)


async def decide_action(state: InterviewState) -> dict:
    # Hard constraints run first so the LLM is only asked when the answer isn't
    # already fixed: an interview always gets at least one question and never
    # passes the ceiling.
    if not state["turns"]:
        return {"decision": "continue"}
    if len(state["turns"]) >= MAX_QUESTIONS:
        return {"decision": "finish"}

    result = await decision_llm.ainvoke(
        [SystemMessage(DECIDE_ACTION_PROMPT), HumanMessage(format_context(state))]
    )
    return {"decision": result.decision}
