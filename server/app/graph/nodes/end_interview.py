from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.graph.context import format_context
from app.graph.llm import llm
from app.graph.prompts import END_INTERVIEW_PROMPT
from app.graph.state import InterviewState


class FinalEvaluation(BaseModel):
    technical_score: int = Field(ge=0, le=100)
    communication_score: int = Field(ge=0, le=100)
    problem_solving_score: int = Field(ge=0, le=100)
    strengths: list[str]
    weaknesses: list[str]
    suggested_learning: list[str]
    summary: str


final_evaluation_llm = llm.with_structured_output(FinalEvaluation)


async def end_interview(state: InterviewState) -> dict:
    result = await final_evaluation_llm.ainvoke(
        [SystemMessage(END_INTERVIEW_PROMPT), HumanMessage(format_context(state))]
    )

    # The overall score is the mean of the per-question scores rather than
    # another LLM judgement, so it always agrees with what the candidate saw
    # question by question. decide_action guarantees at least one turn.
    scores = [turn["score"] for turn in state["turns"]]
    overall_score = round(sum(scores) / len(scores))

    return {"evaluation": {"overall_score": overall_score, **result.model_dump()}}
