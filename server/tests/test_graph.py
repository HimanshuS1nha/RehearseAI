from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.core.constants import MAX_QUESTIONS
from app.graph.nodes.ask_question import GeneratedQuestion, ask_question
from app.graph.nodes.decide_action import decide_action
from app.graph.nodes.evaluate_answer import AnswerEvaluation
from app.graph.workflow import builder


def make_state(turns=()):
    return {
        "role": "Backend Engineer",
        "experience_level": "mid",
        "interview_type": "technical",
        "topics": ["Python"],
        "difficulty": "medium",
        "job_description": None,
        "turns": list(turns),
        "current_question": None,
        "current_answer": None,
        "decision": None,
        "evaluation": None,
    }


def make_turn(score=80):
    return {
        "question": "Q",
        "topic": "Python",
        "question_type": "technical",
        "difficulty": "medium",
        "follows_up_on": None,
        "answer": "A",
        "score": score,
        "feedback": "F",
    }


async def test_decide_action_hard_constraints_skip_the_llm(fake_llm):
    assert await decide_action(make_state()) == {"decision": "continue"}

    at_ceiling = make_state([make_turn()] * MAX_QUESTIONS)
    assert await decide_action(at_ceiling) == {"decision": "finish"}

    assert fake_llm.calls["decide"] == 0


async def test_ask_question_drops_follow_up_to_missing_question(fake_llm):
    def follow_up_on(number):
        return lambda messages: GeneratedQuestion(
            question="Q",
            topic="Python",
            question_type="follow_up",
            difficulty="medium",
            follows_up_on=number,
        )

    state = make_state([make_turn()])

    fake_llm.question = follow_up_on(1)
    assert (await ask_question(state))["current_question"]["follows_up_on"] == 1

    # Only one question has been answered, so question 5 doesn't exist.
    fake_llm.question = follow_up_on(5)
    assert (await ask_question(state))["current_question"]["follows_up_on"] is None


async def test_graph_runs_interview_through_interrupts(fake_llm):
    fake_llm.finish_after = 2
    graph = builder.compile(checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "t1"}}

    out = await graph.ainvoke(make_state(), config)
    assert out["__interrupt__"][0].value["question"] == "Question 1"

    out = await graph.ainvoke(Command(resume="first"), config)
    assert out["__interrupt__"][0].value["question"] == "Question 2"
    assert out["__interrupt__"][0].value["follows_up_on"] == 1

    fake_llm.evaluation = lambda messages: AnswerEvaluation(score=62, feedback="F")
    out = await graph.ainvoke(Command(resume="second"), config)

    assert "__interrupt__" not in out
    assert [turn["answer"] for turn in out["turns"]] == ["first", "second"]
    assert out["current_question"] is None and out["current_answer"] is None
    # Mean of the per-question scores (80, 62), not an LLM judgement.
    assert out["evaluation"]["overall_score"] == 71
    # Resuming re-runs collect_answer, but must not regenerate the question.
    assert fake_llm.calls["ask"] == 2
    assert fake_llm.calls["end"] == 1
