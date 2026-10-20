import asyncio
from uuid import uuid4

from app.main import app
from tests.conftest import PASSWORD

INTERVIEW = {
    "role": "Backend Engineer",
    "experience_level": "mid",
    "interview_type": "technical",
    "topics": ["Python", "FastAPI"],
    "difficulty": "medium",
}


async def create_and_start(client):
    interview_id = (await client.post("/interviews", json=INTERVIEW)).json()["id"]
    response = await client.post(f"/interviews/{interview_id}/start")
    assert response.status_code == 200
    return interview_id, response.json()["question"]


async def answer(client, interview_id, question, text="My answer"):
    return await client.post(
        f"/interviews/{interview_id}/answer",
        json={"question_id": question["id"], "answer": text},
    )


async def test_full_interview_flow(client, fake_llm):
    interview_id, question = await create_and_start(client)
    assert question["question_number"] == 1

    for number in (1, 2, 3):
        response = await answer(client, interview_id, question, f"Answer {number}")
        assert response.status_code == 200
        body = response.json()
        # Feedback is only revealed on the results page.
        assert "score" not in str(body) and "feedback" not in str(body)
        question = body["question"]

    assert body == {"status": "completed", "question": None}

    results = (await client.get(f"/interviews/{interview_id}/results")).json()
    questions = results["questions"]
    assert [q["answer"] for q in questions] == ["Answer 1", "Answer 2", "Answer 3"]
    assert all(q["score"] == 80 and q["feedback"] for q in questions)
    # FakeLLM makes every question after the first a follow-up to the last.
    assert questions[0]["parent_question_id"] is None
    assert questions[1]["parent_question_id"] == questions[0]["id"]
    assert results["evaluation"]["overall_score"] == 80


async def test_answer_only_accepted_for_pending_question(client, fake_llm):
    interview_id, first = await create_and_start(client)

    response = await answer(client, interview_id, {"id": str(uuid4())})
    assert response.status_code == 409

    second = (await answer(client, interview_id, first)).json()["question"]
    # Re-submitting an answered question (double click, stale tab) is rejected
    # instead of landing on the next question.
    assert (await answer(client, interview_id, first)).status_code == 409

    # Two identical submits at once: the row lock lets exactly one through.
    responses = await asyncio.gather(
        answer(client, interview_id, second), answer(client, interview_id, second)
    )
    assert sorted(r.status_code for r in responses) == [200, 409]


async def test_llm_failure_returns_503_and_retry_continues(client, fake_llm):
    fake_llm.fail("ask")
    interview_id = (await client.post("/interviews", json=INTERVIEW)).json()["id"]
    assert (await client.post(f"/interviews/{interview_id}/start")).status_code == 503
    assert (await client.get(f"/interviews/{interview_id}")).json()["status"] == (
        "created"
    )

    response = await client.post(f"/interviews/{interview_id}/start")
    assert response.status_code == 200
    question = response.json()["question"]

    fake_llm.fail("evaluate")
    assert (await answer(client, interview_id, question)).status_code == 503
    current = await client.get(f"/interviews/{interview_id}/current-question")
    assert current.json()["id"] == question["id"]

    # Retrying the same answer finishes the stalled run instead of starting over.
    response = await answer(client, interview_id, question)
    assert response.status_code == 200
    assert response.json()["question"]["question_number"] == 2
    assert fake_llm.calls["evaluate"] == 2


async def test_end_early(client, fake_llm):
    interview_id, _ = await create_and_start(client)
    response = await client.post(f"/interviews/{interview_id}/end")
    assert response.json() == {"status": "abandoned", "question": None}

    interview_id, question = await create_and_start(client)
    await answer(client, interview_id, question, "Only answer")
    response = await client.post(f"/interviews/{interview_id}/end")
    assert response.json() == {"status": "completed", "question": None}

    results = (await client.get(f"/interviews/{interview_id}/results")).json()
    assert [q["answer"] for q in results["questions"]] == ["Only answer", None]
    assert results["evaluation"]["overall_score"] == 80


async def test_other_users_interview_is_not_found(make_client, fake_llm):
    owner = await make_client("owner@example.com")
    intruder = await make_client("intruder@example.com")
    interview_id, question = await create_and_start(owner)

    for response in (
        await intruder.get(f"/interviews/{interview_id}"),
        await intruder.post(f"/interviews/{interview_id}/start"),
        await answer(intruder, interview_id, question),
        await intruder.get(f"/interviews/{interview_id}/results"),
        await intruder.delete(f"/interviews/{interview_id}"),
    ):
        assert response.status_code == 404


async def test_delete_removes_checkpoint(client, fake_llm):
    interview_id, _ = await create_and_start(client)
    graph = app.state.graph
    config = {"configurable": {"thread_id": interview_id}}
    assert (await graph.aget_state(config)).values

    assert (await client.delete(f"/interviews/{interview_id}")).status_code == 204
    assert not (await graph.aget_state(config)).values


async def test_list_search_matches_role_and_topics(client):
    await client.post("/interviews", json=INTERVIEW)
    await client.post(
        "/interviews",
        json={**INTERVIEW, "role": "Frontend 100% Engineer", "topics": ["React"]},
    )

    async def roles(search):
        response = await client.get("/interviews", params={"search": search})
        return sorted(item["role"] for item in response.json()["items"])

    assert await roles("backend") == ["Backend Engineer"]
    assert await roles("react") == ["Frontend 100% Engineer"]
    assert await roles("engineer") == ["Backend Engineer", "Frontend 100% Engineer"]
    # % is matched literally, not as a wildcard.
    assert await roles("100%") == ["Frontend 100% Engineer"]
    assert await roles("0%E") == []
    assert await roles("  ") == ["Backend Engineer", "Frontend 100% Engineer"]


async def test_delete_account_removes_everything(make_client, fake_llm):
    client = await make_client()
    other = await make_client("other@example.com")
    interview_id, _ = await create_and_start(client)
    other_interview_id, _ = await create_and_start(other)
    graph = app.state.graph

    def config(thread_id):
        return {"configurable": {"thread_id": thread_id}}

    response = await client.request(
        "DELETE", "/users/me", json={"password": "wrong-password"}
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Password is incorrect"

    response = await client.request("DELETE", "/users/me", json={"password": PASSWORD})
    assert response.status_code == 200

    # Cookies are cleared, the session can't be refreshed, the account can't
    # log in and its interview checkpoints are gone.
    assert (await client.get("/users/me")).status_code == 401
    assert (await client.post("/auth/refresh")).status_code == 401
    response = await client.post(
        "/auth/login", json={"email": "candidate@example.com", "password": PASSWORD}
    )
    assert response.status_code == 401
    assert not (await graph.aget_state(config(interview_id))).values

    # Nobody else's data is touched.
    assert (await other.get(f"/interviews/{other_interview_id}")).status_code == 200
    assert (await graph.aget_state(config(other_interview_id))).values
