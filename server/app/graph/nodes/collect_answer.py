from langgraph.types import interrupt

from app.graph.state import InterviewState


def collect_answer(state: InterviewState) -> dict:
    # Pauses the run and hands the question to whoever invoked the graph. The
    # run resumes with Command(resume=answer), which interrupt() then returns.
    # On resume this node re-runs from the top, so nothing with side effects
    # (LLM calls, DB writes) may go before this line.
    answer = interrupt(state["current_question"])
    return {"current_answer": answer}
