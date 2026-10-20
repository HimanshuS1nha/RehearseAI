from app.graph.state import InterviewState


def uncovered_topics(state: InterviewState) -> list[str]:
    covered = {turn["topic"].lower() for turn in state["turns"]}
    return [topic for topic in state["topics"] if topic.lower() not in covered]


def format_context(state: InterviewState) -> str:
    lines = [
        f"Role: {state['role']}",
        f"Experience level: {state['experience_level']}",
        f"Interview type: {state['interview_type']}",
        f"Topics: {', '.join(state['topics'])}",
        f"Topics not yet covered: {', '.join(uncovered_topics(state)) or 'none'}",
        f"Difficulty: {state['difficulty']}",
    ]
    if state["job_description"]:
        lines.append(f"Job description:\n{state['job_description']}")

    lines.append(f"\nQuestions answered: {len(state['turns'])}")
    for number, turn in enumerate(state["turns"], start=1):
        follow_up = (
            f", follows up on {turn['follows_up_on']}" if turn["follows_up_on"] else ""
        )
        lines.append(
            f"\n{number}. [{turn['topic']}, {turn['question_type']}, "
            f"{turn['difficulty']}{follow_up}] {turn['question']}"
            f"\nAnswer: {turn['answer']}"
            f"\nScore: {turn['score']}/100"
            f"\nFeedback: {turn['feedback']}"
        )
    return "\n".join(lines)
