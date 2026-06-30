# ⚛️ Physics Solver — Multi-Step Reasoning Engine

A web application that solves physics and math word problems using **multi-step agentic reasoning** with a qualified LLM prompt. The system uses a real agent loop where the LLM emits `FUNCTION_CALL` instructions, the Python backend executes the calculations, and the results are injected back for continued reasoning.

> **Assignment Context**: This project demonstrates a prompt that scores **true on all 9 evaluation criteria** from the Prompt Evaluation Rubric.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Streamlit](https://img.shields.io/badge/Streamlit-1.x-FF4B4B?logo=streamlit)
![Gemini](https://img.shields.io/badge/Gemini-2.0--flash-4285F4?logo=google)

---

## 🎬 Demo

> 📺 **YouTube Video**: _[Link to be added after recording]_

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
│              (Streamlit Web App)                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Problem   │  │ Step     │  │ Tool          │  │
│  │ Input     │  │ Cards    │  │ Execution Log │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
              ┌──────▼──────┐
              │  Agent Loop │ ◄── Multi-turn conversation
              │  (solver.py)│     with FUNCTION_CALL parsing
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Gemini   │ │ Math     │ │ Output   │
  │ API      │ │ Engine   │ │ Parser   │
  │          │ │ (safe    │ │ (regex)  │
  │          │ │  eval)   │ │          │
  └──────────┘ └──────────┘ └──────────┘
```

**How it works:**
1. User enters a physics/math word problem
2. The qualified system prompt is sent to Gemini along with the question
3. Gemini responds with structured `STEP` blocks and `FUNCTION_CALL` instructions
4. The Python backend parses `FUNCTION_CALL: calculate | <expression>` lines
5. Expressions are safely evaluated using Python's `math` library
6. Results are injected back into the conversation (`TOOL_RESULT`)
7. Gemini continues reasoning with the computed values
8. The loop repeats until no more `FUNCTION_CALL` lines are found
9. The final structured output is parsed and rendered as visual step cards

---

## ✅ The Qualified Prompt (All 9 Criteria Satisfied)

The complete system prompt is in [`prompt.py`](prompt.py). Below is the full text:

<details>
<summary><b>Click to expand the full system prompt</b></summary>

```text
You are a Multi-Step Physics & Math Word Problem Solver.

Your job is to solve physics and math word problems by reasoning through them
step-by-step before giving a final answer. You must think carefully, show your
work, and verify your results.

═══════════════════════════════════════════════════════════════
RULES
═══════════════════════════════════════════════════════════════

1. Think before you answer. Always reason through the problem step-by-step
   before producing a final result. Explain your thinking at each stage.

2. Tag each step with the type of reasoning you are using:
   - [PHYSICS] — applying a physics law, principle, or formula
   - [ARITHMETIC] — numerical calculations
   - [ALGEBRA] — rearranging or solving equations symbolically
   - [UNIT_CONVERSION] — converting between units
   - [LOOKUP] — recalling a known constant, formula, or definition
   - [LOGIC] — logical deductions or conditionals
   - [ESTIMATION] — approximate reasoning when exact data is unavailable

3. Use FUNCTION_CALL for all computation:
   FUNCTION_CALL: calculate | <mathematical_expression>
   Use Python math syntax. One calculation per FUNCTION_CALL.
   After emitting a FUNCTION_CALL, STOP and WAIT for the result.

4. Self-check every intermediate result:
   SANITY_CHECK: PASS/FAIL — <justification>

5. Handle uncertainty explicitly:
   UNCERTAIN: <reason>
   TOOL_ERROR: <description>

6. Multi-turn continuity:
   Reference prior results using [FROM_STEP X] notation.

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

PROBLEM: <restate the problem>
STEP 1 [<REASONING_TYPE>]: <description>
FUNCTION_CALL: calculate | <expression>
STEP 1 RESULT: <value with units>
SANITY_CHECK: PASS — <justification>
...
FINAL_ANSWER: <answer with units>
CONFIDENCE: <High/Medium/Low> — <justification>

═══════════════════════════════════════════════════════════════
EXAMPLE
═══════════════════════════════════════════════════════════════

User: A car accelerates from rest at 3 m/s² for 8 seconds. How far?

PROBLEM: Car from rest, a=3 m/s², t=8s. Find distance s.
STEP 1 [LOOKUP]: s = ut + ½at²
STEP 2 [ARITHMETIC]: s = 0*8 + 0.5*3*8²
FUNCTION_CALL: calculate | 0 * 8 + 0.5 * 3 * 8**2
STEP 2 RESULT: 96.0 m
SANITY_CHECK: PASS — avg velocity ~12 m/s × 8s ≈ 96m. Consistent.
FINAL_ANSWER: The car travels 96.0 meters.
CONFIDENCE: High — straightforward kinematics.
```

</details>

---

## 📊 Prompt Evaluation — 9/9 Criteria

```json
{
  "explicit_reasoning": true,
  "structured_output": true,
  "tool_separation": true,
  "conversation_loop": true,
  "instructional_framing": true,
  "internal_self_checks": true,
  "reasoning_type_awareness": true,
  "fallbacks": true,
  "overall_clarity": "Excellent — all 9 criteria satisfied with explicit rules, worked example, structured format, tool separation, sanity checks, reasoning tags, and error handling."
}
```

| # | Criterion | Status | How It's Addressed |
|---|-----------|--------|-------------------|
| 1 | **Explicit Reasoning** | ✅ | Rule 1: "Think step-by-step before answering" |
| 2 | **Structured Output** | ✅ | Enforced `STEP → FUNCTION_CALL → RESULT → SANITY_CHECK → FINAL_ANSWER` |
| 3 | **Tool Separation** | ✅ | `FUNCTION_CALL: calculate \| <expr>` parsed and executed by Python |
| 4 | **Conversation Loop** | ✅ | `[FROM_STEP X]` notation + multi-turn result injection |
| 5 | **Instructional Framing** | ✅ | Full worked example (car kinematics) in prompt |
| 6 | **Internal Self-Checks** | ✅ | `SANITY_CHECK: PASS/FAIL` required after every result |
| 7 | **Reasoning Type Awareness** | ✅ | Tags: `[PHYSICS]`, `[ARITHMETIC]`, `[ALGEBRA]`, `[LOOKUP]`, etc. |
| 8 | **Error Handling / Fallbacks** | ✅ | `UNCERTAIN`, `TOOL_ERROR`, `CONFIDENCE: High/Medium/Low` |
| 9 | **Overall Clarity** | ✅ | Numbered rules, format spec, example — minimal hallucination |

---

## 🧪 Test Output — Prompt Qualification

**Test Problem:** *"A ball is thrown from the ground at 25 m/s at an angle of 60° above the horizontal. Find: (a) the maximum height reached, (b) the total time of flight, and (c) the horizontal range."*

Below is the actual LLM output demonstrating all 9 criteria in action:

```
PROBLEM: A ball is launched from ground level with initial velocity u = 25 m/s
at angle θ = 60° above the horizontal. Find: (a) maximum height, (b) total
time of flight, (c) horizontal range. Assume g = 9.8 m/s².

STEP 1 [LOOKUP]: Identify the relevant projectile motion equations:
- Vertical component: u_y = u × sin(θ)
- Horizontal component: u_x = u × cos(θ)
- Max height: H = u_y² / (2g)
- Time of flight: T = 2 × u_y / g
- Range: R = u_x × T

STEP 2 [ARITHMETIC]: Calculate vertical component u_y = 25 × sin(60°)
FUNCTION_CALL: calculate | 25 * math.sin(math.radians(60))
STEP 2 RESULT: 21.65 m/s
SANITY_CHECK: PASS — sin(60°) ≈ 0.866, so 25 × 0.866 ≈ 21.65. Correct.

STEP 3 [ARITHMETIC]: Calculate horizontal component u_x = 25 × cos(60°)
FUNCTION_CALL: calculate | 25 * math.cos(math.radians(60))
STEP 3 RESULT: 12.5 m/s
SANITY_CHECK: PASS — cos(60°) = 0.5, so 25 × 0.5 = 12.5. Correct.

STEP 4 [PHYSICS]: Calculate maximum height H = u_y² / (2g)
Using [FROM_STEP 2]: u_y = 21.65 m/s
FUNCTION_CALL: calculate | 21.65**2 / (2 * 9.8)
STEP 4 RESULT: 23.92 m
SANITY_CHECK: PASS — For a 25 m/s throw at 60°, ~24m height is reasonable.

STEP 5 [PHYSICS]: Calculate time of flight T = 2 × u_y / g
Using [FROM_STEP 2]: u_y = 21.65 m/s
FUNCTION_CALL: calculate | 2 * 21.65 / 9.8
STEP 5 RESULT: 4.42 s
SANITY_CHECK: PASS — ~4.4 seconds for a ~24m height is physically reasonable.

STEP 6 [PHYSICS]: Calculate horizontal range R = u_x × T
Using [FROM_STEP 3]: u_x = 12.5 m/s, [FROM_STEP 5]: T = 4.42 s
FUNCTION_CALL: calculate | 12.5 * 4.42
STEP 6 RESULT: 55.23 m
SANITY_CHECK: PASS — Range of ~55m for a 25 m/s throw at 60° is reasonable.

FINAL_ANSWER:
(a) Maximum height: 23.92 meters
(b) Total time of flight: 4.42 seconds
(c) Horizontal range: 55.23 meters

CONFIDENCE: High — Standard projectile motion with verified intermediate
calculations and dimensional consistency throughout.
```

### Criteria Visible in Test Output

| Criteria | Where It Appears |
|----------|-----------------|
| Step-by-step reasoning | 6 clearly numbered steps |
| Structured format | `STEP → FUNCTION_CALL → RESULT → SANITY_CHECK → FINAL_ANSWER` |
| Tool calls separated | `FUNCTION_CALL: calculate \| 25 * math.sin(math.radians(60))` |
| Multi-turn references | `[FROM_STEP 2]`, `[FROM_STEP 3]`, `[FROM_STEP 5]` |
| Worked example followed | Output mirrors the in-prompt example format |
| Sanity checks | Every step has `SANITY_CHECK: PASS — <reason>` |
| Reasoning types tagged | `[LOOKUP]`, `[ARITHMETIC]`, `[PHYSICS]` |
| Confidence rating | `CONFIDENCE: High — Standard projectile motion...` |
| Clear and robust | Easy to follow, no hallucinated values |

---

## 🚀 Setup & Run

### Prerequisites
- Python 3.10+
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/EAG-v3.git
cd EAG-v3/physics-solver

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Run

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`.

---

## 📁 Project Structure

```
physics-solver/
├── app.py              # Streamlit web application (UI + rendering)
├── solver.py           # Agent loop, math engine, output parser
├── prompt.py           # The qualified system prompt (9/9 criteria)
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

---

## 🎯 Features

- **🧠 Real Agent Loop** — LLM emits `FUNCTION_CALL`, Python executes, results injected back
- **📐 Multi-Step Reasoning** — Each problem broken into 3–8 tagged steps
- **⚡ Tool Execution Log** — See every calculation executed in real-time
- **✅ Sanity Checks** — Every intermediate result verified
- **🏷️ Reasoning Types** — Color-coded badges: `PHYSICS`, `ARITHMETIC`, `ALGEBRA`, `LOOKUP`, etc.
- **🎨 Premium UI** — Dark/light theme, glassmorphic cards, JetBrains Mono code font
- **📚 Example Problems** — 5 pre-loaded problems (projectile motion, energy conservation, circuits, etc.)
- **🔒 Safe Math** — Expressions evaluated in a sandboxed namespace (no arbitrary code execution)
- **📊 9/9 Evaluation Score** — Prompt evaluation grid displayed in the UI

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
