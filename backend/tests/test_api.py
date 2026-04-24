import io
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.fixture
def sample_csv():
    # A minimal deterministic CSV that ensures both classes and both sensitive groups exist.
    return (
        b"age,education,experience,gender,hired\n"
        b"34,2,8,1,1\n"
        b"28,1,3,0,0\n"
        b"45,3,10,1,1\n"
        b"22,0,1,0,0\n"
        b"30,2,5,1,0\n"
        b"35,3,7,0,1\n"
    )


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_columns(sample_csv):
    files = {"file": ("test.csv", sample_csv, "text/csv")}
    response = client.post("/columns", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["columns"] == ["age", "education", "experience", "gender", "hired"]
    assert data["row_count"] == 6
    assert len(data["preview"]) == 2


def test_analyze_and_fix_workflow(sample_csv):
    files = {"file": ("test.csv", sample_csv, "text/csv")}
    form_data = {
        "label_col": "hired",
        "sensitive_attr": "gender",
        "privileged_value": "1",
        "unprivileged_value": "0",
        "positive_label": "1",
        "domain": "hiring",
    }

    # 1. Analyze endpoint
    analyze_res = client.post("/analyze", files=files, data=form_data)
    assert analyze_res.status_code == 200
    analyze_data = analyze_res.json()

    assert "session_id" in analyze_data
    assert "bias_score" in analyze_data
    assert "metrics" in analyze_data
    assert "group_stats" in analyze_data
    assert len(analyze_data["metrics"]) == 3

    session_id = analyze_data["session_id"]

    # 2. Fix endpoint
    fix_res = client.post("/fix", json={"session_id": session_id})
    assert fix_res.status_code == 200
    fix_data = fix_res.json()

    assert "bias_score_before" in fix_data
    assert "bias_score_after" in fix_data
    assert "metrics_before" in fix_data
    assert "metrics_after" in fix_data
    assert "download_token" in fix_data

    token = fix_data["download_token"]

    # 3. Download endpoint
    dl_res = client.get(f"/download/{token}")
    assert dl_res.status_code == 200
    assert "text/csv" in dl_res.headers["content-type"]
    assert "reweighing_weight" in dl_res.text

def test_presets():
    res = client.get("/presets")
    assert res.status_code == 200
    data = res.json()
    assert "hiring" in data
    assert "lending" in data
    assert "healthcare" in data
    assert "domain_context" in data["hiring"]

def test_demo_endpoint():
    res = client.get("/demo/hiring")
    if res.status_code == 404:
        pytest.skip("Demo dataset not generated before test run")
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert "columns" in data

def test_analyze_includes_equal_opp_diff(sample_csv):
    files = {"file": ("test.csv", sample_csv, "text/csv")}
    form_data = {
        "label_col": "hired",
        "sensitive_attr": "gender",
        "privileged_value": "1",
        "unprivileged_value": "0",
        "positive_label": "1",
        "domain": "hiring",
    }
    
    analyze_res = client.post("/analyze", files=files, data=form_data)
    assert analyze_res.status_code == 200
    analyze_data = analyze_res.json()
    
    # Verify domain_context is injected
    assert "domain_context" in analyze_data
    
    # Check for equal_opp_diff
    metrics = analyze_data["metrics"]
    metric_keys = [m["key"] for m in metrics]
    assert "equal_opp_diff" in metric_keys
    
    session_id = analyze_data["session_id"]
    fix_res = client.post("/fix", json={"session_id": session_id})
    fix_data = fix_res.json()
    
    before_keys = [m["key"] for m in fix_data["metrics_before"]]
    assert "equal_opp_diff" in before_keys
    after_keys = [m["key"] for m in fix_data["metrics_after"]]
    assert "equal_opp_diff" in after_keys
