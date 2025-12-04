from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)



def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_flow_and_edge_cases():
    activity = "Chess Club"
    email = "test.student@example.com"

    # Ensure clean state
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Duplicate signup should return 400
    resp2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp2.status_code == 400

    # Unknown activity -> 404
    resp3 = client.post("/activities/Unknown/signup", params={"email": "x@y.z"})
    assert resp3.status_code == 404


def test_unregister_flow_and_not_found():
    activity = "Programming Class"
    email = "remove.student@example.com"

    # Ensure email is enrolled
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Unregister
    resp = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]

    # Unregistering again should return 404
    resp2 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp2.status_code == 404
import pytest
from copy import deepcopy
from urllib.parse import quote

from httpx import AsyncClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def restore_activities():
    """Make a deep copy of the in-memory activities and restore after each test."""
    backup = deepcopy(activities)
    yield
    activities.clear()
    activities.update(deepcopy(backup))


@pytest.mark.asyncio
async def test_get_activities():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


@pytest.mark.asyncio
async def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "newstudent@mergington.edu"
    path = f"/activities/{quote(activity)}/signup"

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Sign up
        r = await ac.post(path, params={"email": email})
        assert r.status_code == 200
        assert email in activities[activity]["participants"]

        # Signing up again should fail with 400
        r2 = await ac.post(path, params={"email": email})
        assert r2.status_code == 400

        # Now unregister
        del_path = f"/activities/{quote(activity)}/participants"
        r3 = await ac.delete(del_path, params={"email": email})
        assert r3.status_code == 200
        assert email not in activities[activity]["participants"]


@pytest.mark.asyncio
async def test_signup_nonexistent_activity():
    activity = "Nonexistent"
    email = "x@y.com"
    path = f"/activities/{quote(activity)}/signup"
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post(path, params={"email": email})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_unregister_non_member():
    activity = "Chess Club"
    email = "not-signed-up@mergington.edu"
    del_path = f"/activities/{quote(activity)}/participants"
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.delete(del_path, params={"email": email})
    assert r.status_code == 404
