"""
Test script: Solve a complex real-life physics problem using the Physics Solver engine.
Captures the full agent loop output including all FUNCTION_CALL executions.
"""
import os
import sys
from dotenv import load_dotenv
load_dotenv()

from solver import run_agent_loop

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: Set GEMINI_API_KEY in your .env file")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════
# COMPLEX REAL-LIFE PROBLEM
# ═══════════════════════════════════════════════════════════════

PROBLEM = """
A civil engineer is designing a water supply system for a hilltop village.
Water must be pumped from a reservoir at ground level to a storage tank located
at a height of 85 meters on the hill. The pipeline is 600 meters long and has
a diameter of 0.15 meters. The desired flow rate is 50 liters per minute.

Given:
- Water density: 1000 kg/m³
- Gravitational acceleration: 9.81 m/s²
- Friction factor (Darcy-Weisbach): 0.02
- Pump efficiency: 75% (0.75)
- Electricity cost: Rs.8 per kWh
- The pump runs 6 hours per day

Calculate step by step:
(a) The velocity of water in the pipe (m/s)
(b) The head loss due to friction using the Darcy-Weisbach equation: h_f = f × (L/D) × (v²/2g)
(c) The total head the pump must overcome (static head + friction head)
(d) The hydraulic power required: P_hydraulic = ρ × g × Q × H_total
(e) The actual electrical power input considering pump efficiency
(f) The daily energy consumption in kWh
(g) The monthly electricity cost (30 days)
"""

print("=" * 70)
print("COMPLEX REAL-LIFE PROBLEM: Water Supply System Engineering")
print("=" * 70)
print(PROBLEM)
print("=" * 70)
print("SOLVING WITH AGENT LOOP (gemini-3.5-flash)...")
print("=" * 70)
print()

tool_calls = []
raw_output = ""

for event in run_agent_loop(PROBLEM.strip(), API_KEY, "gemini-3.5-flash"):
    if event["type"] == "status":
        print(f"  {event['message']}")
    
    elif event["type"] == "tool_call":
        tool_calls.append(event)
        if event["success"]:
            print(f"  ⚡ TOOL: {event['expression']}  →  {event['result']}")
        else:
            print(f"  ⚠️ TOOL ERROR: {event['expression']}  →  {event.get('error')}")
    
    elif event["type"] == "complete":
        raw_output = event["raw"]
        parsed = event["parsed"]

print()
print("=" * 70)
print("RAW LLM OUTPUT")
print("=" * 70)
print(raw_output)

print()
print("=" * 70)
print("PARSED RESULTS")
print("=" * 70)

if parsed["steps"]:
    for step in parsed["steps"]:
        tag = step.get("reasoning_type", "?")
        desc = step.get("description", "")[:100]
        fc = step.get("function_call", "")
        result = step.get("result", "")
        sanity = step.get("sanity_status", "")
        sanity_r = step.get("sanity_reason", "")
        print(f"\n  STEP {step['number']} [{tag}]: {desc}")
        if fc:
            print(f"    FUNCTION_CALL: calculate | {fc}")
        if result:
            print(f"    RESULT: {result}")
        if sanity:
            print(f"    SANITY_CHECK: {sanity} — {sanity_r}")

print(f"\n  FINAL ANSWER: {parsed.get('final_answer', 'N/A')}")
print(f"  CONFIDENCE: {parsed.get('confidence', 'N/A')} — {parsed.get('confidence_reason', '')}")

print()
print("=" * 70)
print(f"TOOL EXECUTION LOG ({len(tool_calls)} calls)")
print("=" * 70)
for tc in tool_calls:
    if tc["success"]:
        print(f"  ✅ {tc['expression']}  =  {tc['result']}")
    else:
        print(f"  ❌ {tc['expression']}  →  ERROR: {tc.get('error')}")

print()
print("DONE.")
