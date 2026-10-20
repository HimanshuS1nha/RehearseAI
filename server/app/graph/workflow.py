from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.graph.nodes.ask_question import ask_question
from app.graph.nodes.collect_answer import collect_answer
from app.graph.nodes.decide_action import decide_action
from app.graph.nodes.end_interview import end_interview
from app.graph.nodes.evaluate_answer import evaluate_answer
from app.graph.state import InterviewState


def route_decision(state: InterviewState) -> str:
    return state["decision"]


builder = StateGraph(InterviewState)

builder.add_node(decide_action)
builder.add_node(ask_question)
builder.add_node(collect_answer)
builder.add_node(evaluate_answer)
builder.add_node(end_interview)

builder.add_edge(START, "decide_action")
builder.add_conditional_edges(
    "decide_action",
    route_decision,
    {"continue": "ask_question", "finish": "end_interview"},
)
builder.add_edge("ask_question", "collect_answer")
builder.add_edge("collect_answer", "evaluate_answer")
builder.add_edge("evaluate_answer", "decide_action")
builder.add_edge("end_interview", END)


def build_graph(checkpointer: BaseCheckpointSaver) -> CompiledStateGraph:
    return builder.compile(checkpointer=checkpointer)
