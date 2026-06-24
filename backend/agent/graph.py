# backend/agent/graph.py
import json
import logging
import os
import re
from typing import Annotated, Any

from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from agent.prompts import SYSTEM_PROMPT
from agent.tools import ALL_TOOLS

logger = logging.getLogger(__name__)

# ── State ─────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    build_id: str
    messages: Annotated[list, add_messages]
    tool_calls_made: list[str]
    root_cause: str
    confidence: float
    summary: str
    proposed_fix: str


# ── LLM + tool binding ────────────────────────────────────────────────────────

def _get_llm():
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "llama-3.3-70b-versatile"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.1,
    ).bind_tools(ALL_TOOLS)


TOOL_MAP = {t.name: t for t in ALL_TOOLS}


# ── Nodes ─────────────────────────────────────────────────────────────────────

def fetch_build_context(state: AgentState) -> dict:
    """Entry node: seed the conversation with system prompt + initial user message."""
    build_id = state["build_id"]
    return {
        "messages": [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Investigate build `{build_id}`. "
                    "Start by fetching its logs, then use whatever tools you need "
                    "to determine the root cause. End with the JSON summary block."
                )
            ),
        ],
        "tool_calls_made": [],
        "root_cause": "UNKNOWN",
        "confidence": 0.0,
        "summary": "",
        "proposed_fix": "",
    }


def call_llm(state: AgentState) -> dict:
    """Call the LLM with current message history."""
    llm = _get_llm()
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


def call_tools(state: AgentState) -> dict:
    """Execute all tool calls requested in the last AI message."""
    last_message = state["messages"][-1]
    tool_calls_made = list(state.get("tool_calls_made", []))
    new_messages = []

    for tc in last_message.tool_calls:
        tool_name = tc["name"]
        tool_args = tc["args"]
        tool_id = tc["id"]

        logger.info(f"Calling tool: {tool_name}({tool_args})")
        tool_calls_made.append(tool_name)

        if tool_name in TOOL_MAP:
            try:
                result = TOOL_MAP[tool_name].invoke(tool_args)
                content = json.dumps(result, default=str)
            except Exception as e:
                content = json.dumps({"error": str(e)})
        else:
            content = json.dumps({"error": f"Unknown tool: {tool_name}"})

        new_messages.append(
            ToolMessage(content=content, tool_call_id=tool_id, name=tool_name)
        )

    return {"messages": new_messages, "tool_calls_made": tool_calls_made}


def synthesize(state: AgentState) -> dict:
    """Parse the final JSON block from the last AI message."""
    last_message = state["messages"][-1]
    content = last_message.content if hasattr(last_message, "content") else ""

    # Strategy 1: fenced ```json block
    match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)

    # Strategy 2: any { } block containing root_cause
    if not match:
        match = re.search(r"(\{[^{}]*\"root_cause\"[^{}]*\})", content, re.DOTALL)

    # Strategy 3: the entire content IS the JSON (LLM returned raw JSON)
    if not match:
        try:
            data = json.loads(content.strip())
            if "root_cause" in data:
                return {
                    "root_cause": data.get("root_cause", "UNKNOWN"),
                    "confidence": float(data.get("confidence", 0.0)),
                    "summary": data.get("summary", ""),
                    "proposed_fix": data.get("proposed_fix", ""),
                }
        except (json.JSONDecodeError, ValueError):
            pass

    # Strategy 4: summary field itself contains JSON (current failure mode)
    if not match:
        for msg in reversed(state["messages"]):
            if not hasattr(msg, "content"):
                continue
            m = re.search(r"(\{[^{}]*\"root_cause\"[^{}]*\})", msg.content, re.DOTALL)
            if m:
                match = m
                break

    if match:
        try:
            data = json.loads(match.group(1))
            return {
                "root_cause": data.get("root_cause", "UNKNOWN"),
                "confidence": float(data.get("confidence", 0.0)),
                "summary": data.get("summary", ""),
                "proposed_fix": data.get("proposed_fix", ""),
            }
        except (json.JSONDecodeError, ValueError):
            logger.warning("Failed to parse JSON block from agent response")

    # Final fallback: scan all messages for any root_cause mention
    root_cause = "UNKNOWN"
    for label in ["FLAKY_TEST", "DEPENDENCY_CHANGE", "ENV_DRIFT", "CODE_BUG", "INFRA_FAILURE", "TIMEOUT"]:
        if label in content:
            root_cause = label
            break

    return {
        "root_cause": root_cause,
        "confidence": 0.5 if root_cause != "UNKNOWN" else 0.0,
        "summary": content[:500] if content else "",
        "proposed_fix": "",
    }

# ── Routing ───────────────────────────────────────────────────────────────────

def should_continue(state: AgentState) -> str:
    """Route to tools if the LLM made tool calls, else to synthesize."""
    last_message = state["messages"][-1]
    tool_calls_made = state.get("tool_calls_made", [])

    # Hard stop after 10 tool calls to prevent infinite loops
    if len(tool_calls_made) >= 10:
        logger.warning("Max tool calls reached, forcing synthesis")
        return "synthesize"

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "call_tools"

    return "synthesize"


# ── Graph assembly ────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("fetch_build_context", fetch_build_context)
    graph.add_node("call_llm", call_llm)
    graph.add_node("call_tools", call_tools)
    graph.add_node("synthesize", synthesize)

    graph.add_edge(START, "fetch_build_context")
    graph.add_edge("fetch_build_context", "call_llm")
    graph.add_conditional_edges("call_llm", should_continue, {
        "call_tools": "call_tools",
        "synthesize": "synthesize",
    })
    graph.add_edge("call_tools", "call_llm")
    graph.add_edge("synthesize", END)

    return graph.compile()


# Singleton compiled graph
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def run_investigation(build_id: str) -> dict:
    """Run the full agent investigation for a build. Returns final state."""
    graph = get_graph()
    final_state = await graph.ainvoke({"build_id": build_id})
    return {
        "build_id": build_id,
        "root_cause": final_state.get("root_cause", "UNKNOWN"),
        "confidence": final_state.get("confidence", 0.0),
        "summary": final_state.get("summary", ""),
        "proposed_fix": final_state.get("proposed_fix", ""),
        "tool_calls_made": final_state.get("tool_calls_made", []),
        "messages": [
            {
                "type": m.__class__.__name__,
                "content": m.content if hasattr(m, "content") else "",
            }
            for m in final_state.get("messages", [])
        ],
    }