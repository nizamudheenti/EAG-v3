import re
import math
import traceback


def safe_calculate(expression: str) -> dict:
    """
    Safely evaluate a mathematical expression using Python's math library.
    Returns a dict with 'success', 'result', and optionally 'error'.
    """
    try:
        # Clean the expression
        expr = expression.strip()

        # Allowed names for safe evaluation
        allowed_names = {
            "math": math,
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "asin": math.asin,
            "acos": math.acos,
            "atan": math.atan,
            "atan2": math.atan2,
            "log": math.log,
            "log10": math.log10,
            "log2": math.log2,
            "exp": math.exp,
            "pi": math.pi,
            "e": math.e,
            "abs": abs,
            "round": round,
            "pow": pow,
            "min": min,
            "max": max,
        }

        # Evaluate in a restricted namespace
        result = eval(expr, {"__builtins__": {}}, allowed_names)

        return {
            "success": True,
            "result": result,
            "expression": expr,
        }
    except Exception as ex:
        return {
            "success": False,
            "error": str(ex),
            "expression": expression,
        }


def parse_function_calls(text: str) -> list:
    """
    Extract all FUNCTION_CALL lines from LLM output.
    Returns list of dicts with 'type' and 'expression'.
    """
    calls = []
    pattern = r"FUNCTION_CALL:\s*calculate\s*\|\s*(.+)"
    for match in re.finditer(pattern, text):
        expr = match.group(1).strip()
        calls.append({
            "type": "calculate",
            "expression": expr,
            "raw": match.group(0),
        })
    return calls


def parse_steps(text: str) -> list:
    """
    Parse the structured LLM output into a list of step objects for rendering.
    Each step has: number, reasoning_type, description, function_call, result,
    sanity_check, sanity_status.
    """
    steps = []

    # Split by STEP headers
    step_pattern = r"STEP\s+(\d+)\s+\[([A-Z_]+)\]:\s*(.*?)(?=STEP\s+\d+\s+\[|FINAL_ANSWER:|$)"
    matches = re.finditer(step_pattern, text, re.DOTALL)

    for m in matches:
        step_num = int(m.group(1))
        reasoning_type = m.group(2).strip()
        body = m.group(3).strip()

        # Extract function call if present
        fc_match = re.search(r"FUNCTION_CALL:\s*calculate\s*\|\s*(.+)", body)
        function_call = fc_match.group(1).strip() if fc_match else None

        # Extract result
        res_match = re.search(r"(?:STEP\s+\d+\s+)?RESULT:\s*(.+)", body)
        result = res_match.group(1).strip() if res_match else None

        # Extract sanity check
        sc_match = re.search(r"SANITY_CHECK:\s*(PASS|FAIL)\s*[—–-]?\s*(.*)", body)
        sanity_status = sc_match.group(1) if sc_match else None
        sanity_reason = sc_match.group(2).strip() if sc_match else None

        # Clean description (first line before FUNCTION_CALL or RESULT)
        desc_lines = []
        for line in body.split("\n"):
            if re.match(r"(FUNCTION_CALL|RESULT|SANITY_CHECK|STEP\s+\d+\s+RESULT)", line.strip()):
                break
            desc_lines.append(line)
        description = "\n".join(desc_lines).strip()

        steps.append({
            "number": step_num,
            "reasoning_type": reasoning_type,
            "description": description,
            "function_call": function_call,
            "result": result,
            "sanity_status": sanity_status,
            "sanity_reason": sanity_reason,
        })

    # Extract final answer
    fa_match = re.search(r"FINAL_ANSWER:\s*(.+?)(?=CONFIDENCE:|$)", text, re.DOTALL)
    final_answer = fa_match.group(1).strip() if fa_match else None

    # Extract confidence
    conf_match = re.search(r"CONFIDENCE:\s*(High|Medium|Low)\s*[—–-]?\s*(.*)", text)
    confidence = conf_match.group(1) if conf_match else None
    confidence_reason = conf_match.group(2).strip() if conf_match else None

    return {
        "steps": steps,
        "final_answer": final_answer,
        "confidence": confidence,
        "confidence_reason": confidence_reason,
        "raw": text,
    }


def build_agent_messages(system_prompt: str, question: str, history: list = None) -> list:
    """
    Build the message list for the Gemini API call.
    Supports multi-turn by appending history of function call results.
    """
    messages = []

    # User question
    messages.append({
        "role": "user",
        "parts": [question]
    })

    # Add history (previous function call results injected back)
    if history:
        for entry in history:
            messages.append({
                "role": "model",
                "parts": [entry["model_output"]]
            })
            messages.append({
                "role": "user",
                "parts": [entry["tool_result"]]
            })

    return messages


def run_agent_loop(question: str, api_key: str, model_name: str = "gemini-3.5-flash"):
    """
    Run the full agent loop:
    1. Send the question with the system prompt to Gemini
    2. Parse FUNCTION_CALL lines from the response
    3. Execute calculations
    4. Inject results back and continue until no more FUNCTION_CALL lines
    5. Return the full parsed output

    Yields intermediate status messages for the UI.
    """
    from google import genai
    from google.genai import types
    from prompt import SYSTEM_PROMPT

    client = genai.Client(api_key=api_key)

    # Start a chat session with system instruction
    chat = client.chats.create(
        model=model_name,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    # Initial message
    full_response = ""
    iteration = 0
    max_iterations = 15  # Safety limit

    # First turn: send the question
    current_message = question

    while iteration < max_iterations:
        iteration += 1

        yield {"type": "status", "message": f"🧠 Reasoning iteration {iteration}..."}

        response = chat.send_message(current_message)
        response_text = response.text
        full_response += response_text

        # Check for FUNCTION_CALL lines
        calls = parse_function_calls(response_text)

        if not calls:
            # No more function calls — the model has finished
            yield {"type": "status", "message": "✅ Reasoning complete."}
            break

        # Execute each function call and build the result message
        results_parts = []
        for call in calls:
            calc_result = safe_calculate(call["expression"])

            if calc_result["success"]:
                result_str = f"TOOL_RESULT for `{call['expression']}`: {calc_result['result']}"
                yield {
                    "type": "tool_call",
                    "expression": call["expression"],
                    "result": calc_result["result"],
                    "success": True,
                }
            else:
                result_str = f"TOOL_ERROR for `{call['expression']}`: {calc_result['error']}"
                yield {
                    "type": "tool_call",
                    "expression": call["expression"],
                    "error": calc_result["error"],
                    "success": False,
                }

            results_parts.append(result_str)

        # Send the results back to the model
        current_message = "\n".join(results_parts) + "\n\nContinue solving from where you left off. Use the results above."

    # Parse the full output
    parsed = parse_steps(full_response)
    yield {"type": "complete", "parsed": parsed, "raw": full_response}
