"""
Tests for ResolveAI 2.0 Hackathon Demo Simulator.
"""
import pytest
from sqlmodel import Session
from app.database import engine, create_db_and_tables
from app.simulator import run_full_simulation, reset_simulation, SIM_ORDER_ID


@pytest.fixture(autouse=True)
def setup_sim():
    create_db_and_tables()


def test_hackathon_demo_simulator_end_to_end():
    with Session(engine) as session:
        # Run simulation
        result = run_full_simulation(session)
        assert result["status"] == "success"
        assert len(result["steps"]) >= 10
        assert "UltraBook Pro 16 Laptop" in result["product"]
        assert "Pune Hub" in result["final_reply"]

        # Reset simulation
        reset_res = reset_simulation(session)
        assert reset_res["status"] == "reset_complete"

