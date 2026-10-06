"""
AI Tutor & AlgoMentor Service

Provider-isolated interface for LLM-powered tutoring and 3D visual explanation.

Features:
  1. Concept Explanation (beginner-friendly)
  2. Progressive Hints (3 levels)
  3. Code Mistake Explanation
  4. Complexity Tutor
  5. Ask Tutor (conversational)
  6. AlgoMentor (Real execution context + Progressive AI diagnosis + 3D Model Explainer)

Providers:
  - GeminiProvider (Google Gemini API via google-genai)
  - MockAITutorProvider (Deterministic fallback & local testing)
"""

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from typing import Any, Optional

from app.core.config import get_settings
from app.schemas.tutor import (
    CodeReference,
    InteractiveQuestion,
    LearningProfileData,
    MentorInteractRequest,
    MentorInteractResponse,
    MentorRequest,
    MentorResponseData,
    MicroExample,
    MicroExampleStep,
    QuestionOption,
    VisualizationData,
    VisualizerStep,
)

logger = logging.getLogger(__name__)
settings = get_settings()


def extract_student_learning_context(
    db: Optional[Any],
    user_id: Optional[str],
    problem_id: int,
    topic: str = "",
) -> LearningProfileData:
    """
    Extract real student learning context strictly scoped to the authenticated user_id.
    Derives real attempt counts, topic failure rates, and recurring mistake patterns.
    Returns unpersonalized clean state for new users (no fake history).
    """
    if not db or not user_id:
        return LearningProfileData(
            is_personalized=False,
            difficulty_level="normal",
            message=None,
        )

    try:
        from sqlalchemy import select
        from app.models.submission import Submission
        from app.models.problem import Problem

        if not topic and problem_id and db:
            prob = db.get(Problem, problem_id)
            if prob and getattr(prob, "topic", None):
                topic = getattr(prob.topic, "name", "")

        subs = []
        if db:
            try:
                subs = db.execute(
                    select(Submission)
                    .where(Submission.user_id == str(user_id))
                    .order_by(Submission.created_at.desc())
                ).scalars().all()
            except Exception as e:
                logger.debug("DB query for submissions: %s", e)
                subs = []

        # Check in-memory fallback submissions if DB has none
        if not subs:
            try:
                from app.routers.submissions import _memory_submissions
                subs = [s for s in _memory_submissions if str(s.get("user_id")) == str(user_id)]
            except Exception:
                pass

        if not subs or len(subs) <= 1:
            # Baseline / new user: clean slate without fabricated history
            return LearningProfileData(
                is_personalized=False,
                difficulty_level="normal",
                message=None,
            )

        def _get_pid(s: Any) -> int | None:
            return getattr(s, "problem_id", None) if not isinstance(s, dict) else s.get("problem_id")

        def _get_status(s: Any) -> str:
            return getattr(s, "status", "") if not isinstance(s, dict) else s.get("status", "")

        prob_subs = [s for s in subs if _get_pid(s) == problem_id]
        prob_attempts = len(prob_subs)
        prob_fails = [s for s in prob_subs if _get_status(s) != "Accepted"]

        topic_lower = topic.strip().lower() if topic else ""
        topic_subs = []
        for s in subs:
            pid = _get_pid(s)
            if pid == problem_id:
                topic_subs.append(s)
                continue
            # Look up problem topic
            if db and pid:
                p = db.get(Problem, pid)
                if p and getattr(p, "topic", None):
                    t_name = getattr(p.topic, "name", "")
                    if topic_lower and (topic_lower in t_name.lower() or t_name.lower() in topic_lower):
                        topic_subs.append(s)
            elif not topic_lower:
                topic_subs.append(s)

        topic_attempts = len(topic_subs)
        topic_fails = [s for s in topic_subs if _get_status(s) != "Accepted"]
        topic_solved_ids = {_get_pid(s) for s in topic_subs if _get_status(s) == "Accepted" and _get_pid(s) is not None}

        recent_statuses = [_get_status(s) for s in (prob_fails[:5] or topic_fails[:5])]
        recurring_pattern = None
        if recent_statuses.count("Time Limit Exceeded") >= 2:
            recurring_pattern = "Repeated infinite loop or boundary condition causing Time Limit Exceeded"
        elif recent_statuses.count("Wrong Answer") >= 2:
            recurring_pattern = "Repeated boundary condition or logical edge case causing Wrong Answer"
        elif recent_statuses.count("Runtime Error") >= 2:
            recurring_pattern = "Repeated out-of-bounds or null reference causing Runtime Error"

        num_topic_fails = len(topic_fails)
        num_prob_fails = len(prob_fails)

        # Classification: normal | repeated | persistent
        if num_prob_fails >= 3 or num_topic_fails >= 3:
            difficulty_level = "persistent"
            is_personalized = True
            msg = f"Based on your {topic_attempts} recent attempts in {topic or 'this topic'}, AlgoMentor is providing a foundational breakdown."
        elif num_prob_fails >= 2 or num_topic_fails >= 2:
            difficulty_level = "repeated"
            is_personalized = True
            msg = f"You're practicing {topic or 'this concept'} again. Let's focus on the core invariant."
        else:
            difficulty_level = "normal"
            is_personalized = False
            msg = None

        return LearningProfileData(
            is_personalized=is_personalized,
            difficulty_level=difficulty_level,
            weak_topic=topic if is_personalized else None,
            topic_attempts=topic_attempts,
            topic_failures=num_topic_fails,
            topic_solved=len(topic_solved_ids),
            problem_attempts=prob_attempts,
            recurring_pattern=recurring_pattern,
            recommended_concept=f"Foundational {topic}" if difficulty_level == "persistent" else None,
            message=msg,
        )
    except Exception as exc:
        logger.warning("Failed to extract student learning context: %s", exc)
        return LearningProfileData(
            is_personalized=False,
            difficulty_level="normal",
            message=None,
        )


def build_visualization_for_mistake(
    req: MentorRequest, diagnosis: str = "", concept: str = ""
) -> VisualizationData:
    """
    Build a deterministic, pedagogically rich 3D visualization sequence
    specifically tailored to the problem and the diagnosed conceptual mistake.
    """
    prob_title = req.title.lower()
    topic = req.topic.lower()
    code = req.code.lower()
    diag_lower = diagnosis.lower()

    # 1. Binary Search Boundary & Search Space Visualization
    if (
        "binary" in prob_title
        or "binary search" in topic
        or "boundary" in diag_lower
        or "low" in code
        and "high" in code
    ):
        target = 23
        arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
        steps = [
            VisualizerStep(
                array=arr,
                active_indices=[0, 4, 9],
                comparing_indices=[4],
                pointers={"low": 0, "mid": 4, "high": 9},
                operation="Initial Search Window",
                description="Search space [0..9]. low=0 (2), high=9 (91). Middle index mid=4 has value 16. Target is 23.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[4],
                comparing_indices=[4],
                pointers={"low": 0, "mid": 4, "high": 9},
                operation="Compare Mid vs Target",
                description="Evaluate nums[mid=4] (16) < target (23). Since array is sorted, 23 MUST be in the right partition.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0, 1, 2, 3, 4],
                comparing_indices=[4],
                pointers={"low": 0, "mid": 4, "high": 4},
                operation="The Conceptual Mistake",
                description="Mistake: Incorrectly setting high = mid cuts off the right half where target 23 actually resides! Or setting low = mid without +1 causes infinite loop.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[5, 7, 9],
                comparing_indices=[7],
                sorted_indices=[0, 1, 2, 3, 4],
                pointers={"low": 5, "mid": 7, "high": 9},
                operation="Correct Boundary Shift",
                description="Correct movement: low = mid + 1 narrows search window to [5..9]. Next mid = 7 (val=56). Left half safely pruned.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[7],
                comparing_indices=[7],
                pointers={"low": 5, "mid": 7, "high": 9},
                operation="Second Comparison",
                description="Evaluate nums[mid=7] (56) > target (23). Move high = mid - 1 to narrow space to [5..6].",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[5],
                found_indices=[5],
                sorted_indices=[0, 1, 2, 3, 4, 7, 8, 9],
                pointers={"low": 5, "mid": 5, "high": 6},
                operation="Target Found",
                description="Target 23 found at index 5! Binary search completed in O(log n) comparisons instead of O(n).",
            ),
        ]
        return VisualizationData(
            type="binary_search",
            title="Binary Search: Boundary Update & Space Invariant",
            concept="Binary Search Invariant",
            mistake_summary="Incorrect boundary update leaves search space unchanged or discards the correct half.",
            steps=steps,
        )

    # 2. Two Sum / Hashing Visualization
    if "two sum" in prob_title or "hash" in topic or "dict" in code or "map" in code:
        arr = [2, 7, 11, 15]
        target = 9
        steps = [
            VisualizerStep(
                array=arr,
                active_indices=[0],
                pointers={"i": 0},
                operation="Initialize Hash Map",
                description="Array [2, 7, 11, 15], Target = 9. Hash Map is empty {}. Start at index 0.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0],
                comparing_indices=[0],
                pointers={"i": 0},
                operation="Compute Complement",
                description="nums[0] = 2. Complement needed = 9 - 2 = 7. Look up 7 in hash map: Not Found.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0],
                sorted_indices=[0],
                pointers={"i": 0},
                operation="Store in Map",
                description="Store 2 -> index 0 in map {2: 0}. Crucial: checking complement BEFORE storing prevents using same element twice!",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[1],
                comparing_indices=[1],
                pointers={"i": 1},
                operation="Next Element Complement",
                description="nums[1] = 7. Complement needed = 9 - 7 = 2. Look up 2 in hash map: FOUND at index 0!",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0, 1],
                found_indices=[0, 1],
                sorted_indices=[0, 1],
                pointers={"pair_a": 0, "pair_b": 1},
                operation="Pair Found",
                description="Match found! nums[0] (2) + nums[1] (7) = 9. Return indices [0, 1]. O(n) time, O(n) space.",
            ),
        ]
        return VisualizationData(
            type="hash_map",
            title="Two Sum: One-Pass Hashing vs Nested Loop",
            concept="Complement Hashing",
            mistake_summary="Nested loops waste O(n²) time; inserting before checking can reuse the same element index.",
            steps=steps,
        )

    # 3. Stack / Valid Parentheses Visualization
    if "stack" in topic or "parenthes" in prob_title or "stack" in code:
        arr = [1, 2, 3, 2, 1]
        steps = [
            VisualizerStep(
                array=arr,
                active_indices=[0],
                pointers={"top": 0},
                operation="LIFO Stack Initialized",
                description="Stack stores opening tokens. Top pointer tracks latest opened bracket.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0, 1],
                pointers={"top": 1},
                operation="Push onto Stack",
                description="Pushing opening bracket. Stack depth increases.",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[1],
                comparing_indices=[1],
                pointers={"top": 1},
                operation="Match & Pop Check",
                description="Encountered closing bracket. Top element must match type. If stack empty or mismatch -> Invalid!",
            ),
            VisualizerStep(
                array=arr,
                active_indices=[0],
                found_indices=[0],
                pointers={"top": 0},
                operation="Matched & Popped",
                description="Bracket matched and popped. At end of input, stack MUST be empty to be valid.",
            ),
        ]
        return VisualizationData(
            type="stack",
            title="Stack LIFO: Bracket Matching & Invariant",
            concept="Last-In First-Out (LIFO)",
            mistake_summary="Popping from empty stack causes runtime error; missing final empty check misses unclosed brackets.",
            steps=steps,
        )

    # 4. Sorting / Swap Visualization
    if "sort" in prob_title or "sort" in topic:
        arr = [5, 2, 9, 1, 7, 3]
        steps = [
            VisualizerStep(
                array=[5, 2, 9, 1, 7, 3],
                active_indices=[0, 1],
                comparing_indices=[0, 1],
                pointers={"i": 0, "j": 1},
                operation="Compare Adjacent",
                description="Compare 5 and 2. 5 > 2, so elements are out of order and must be swapped.",
            ),
            VisualizerStep(
                array=[2, 5, 9, 1, 7, 3],
                active_indices=[0, 1],
                swapped_indices=[0, 1],
                pointers={"i": 0, "j": 1},
                operation="Swap Elements",
                description="Swapped: 2 moves to index 0, 5 moves to index 1.",
            ),
            VisualizerStep(
                array=[2, 5, 9, 1, 7, 3],
                active_indices=[2, 3],
                comparing_indices=[2, 3],
                pointers={"i": 2, "j": 3},
                operation="Next Comparison",
                description="Compare 9 and 1. 9 > 1, swap required.",
            ),
            VisualizerStep(
                array=[2, 5, 1, 9, 7, 3],
                active_indices=[2, 3],
                swapped_indices=[2, 3],
                pointers={"i": 2, "j": 3},
                operation="Swap Elements",
                description="Swapped 9 and 1. Largest unsorted elements bubble toward the right.",
            ),
            VisualizerStep(
                array=[1, 2, 3, 5, 7, 9],
                active_indices=[0, 1, 2, 3, 4, 5],
                sorted_indices=[0, 1, 2, 3, 4, 5],
                pointers={"sorted": 5},
                operation="Fully Sorted",
                description="Array partitioned into fully sorted order.",
            ),
        ]
        return VisualizationData(
            type="sorting",
            title="Sorting: In-Place Swapping & Invariant",
            concept="Order Invariant",
            mistake_summary="Incorrect loop boundaries miss final passes or swap indices out of bounds.",
            steps=steps,
        )

    # 5. Default General Array Traversal & Bounds Check
    arr = [4, 8, 15, 16, 23, 42]
    steps = [
        VisualizerStep(
            array=arr,
            active_indices=[0],
            pointers={"ptr": 0},
            operation="Array Pointer Start",
            description="Array [4, 8, 15, 16, 23, 42]. Pointer initialized at index 0.",
        ),
        VisualizerStep(
            array=arr,
            active_indices=[1, 2],
            comparing_indices=[1, 2],
            pointers={"ptr": 2},
            operation="Element Traversal",
            description="Inspecting arr[2] = 15. Validating loop condition against array length 6.",
        ),
        VisualizerStep(
            array=arr,
            active_indices=[5],
            comparing_indices=[5],
            pointers={"bound": 5},
            operation="Boundary Guard Check",
            description="Boundary condition check: Accessing index >= 6 raises IndexError / Out-of-Bounds!",
        ),
        VisualizerStep(
            array=arr,
            active_indices=[4],
            found_indices=[4],
            pointers={"target": 4},
            operation="Condition Met",
            description="Target condition satisfied at index 4 (value 23). Return result safely within bounds.",
        ),
    ]
    return VisualizationData(
        type="array",
        title="Array Traversal & Boundary Safety",
        concept="Array Boundary Checks",
        mistake_summary="Loop indexing without proper bound guard causes out-of-bounds or off-by-one errors.",
        steps=steps,
    )


def extract_actual_code_reference(
    code: str, topic: str = "", title: str = "", error: str = ""
) -> CodeReference | None:
    lines = code.splitlines()
    if not lines:
        return None

    # Check if compiler/runtime error points to a specific line
    match = re.search(r"line (\d+)", error or "", re.IGNORECASE)
    if match:
        try:
            line_no = int(match.group(1))
            if 1 <= line_no <= len(lines):
                return CodeReference(
                    line_number=line_no,
                    code_snippet=lines[line_no - 1].strip(),
                    observation=f"Execution error flagged around line {line_no}. Check variable state, collection boundaries, or syntax.",
                )
        except Exception:
            pass

    topic_context = f"{topic} {title}".lower()

    # Heuristic matching against student's actual code lines:
    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("//"):
            continue

        if "two sum" in topic_context or "hash" in topic_context or "sum" in topic_context:
            # Check for nested for-loop
            if line.startswith("for ") and any(
                other_idx != idx and other.strip().startswith("for ")
                for other_idx, other in enumerate(lines, start=1)
            ):
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this part of your code: you are running nested loops. Checking every pair takes O(n²); storing seen numbers in a map finds the complement in O(1).",
                )
            if "seen" in line or "map" in line or "dict" in line:
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this part of your code: verify whether you check for the complement in your map BEFORE inserting the current number.",
                )
            if line.startswith("return "):
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this part of your code: ensure you are returning the pair of distinct indices rather than values.",
                )

        if "binary" in topic_context:
            if "high" in line and ("mid" in line or "=" in line):
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this boundary update: verify if setting high = mid - 1 correctly discards the mid element once tested.",
                )
            if "low" in line and ("mid" in line or "=" in line):
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this boundary update: verify if low = mid + 1 narrows the search space to prevent infinite loops.",
                )
            if line.startswith("while "):
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at your loop condition: ensure 'low <= high' includes single-element intervals.",
                )

        if "stack" in topic_context or "parenthes" in topic_context:
            if ".pop(" in line:
                return CodeReference(
                    line_number=idx,
                    code_snippet=line,
                    observation="Look at this stack pop: verify that the stack is checked for non-empty state before popping to avoid runtime crashes.",
                )

    # Fallback to the first meaningful non-definition line
    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if (
            line
            and not line.startswith("def ")
            and not line.startswith("class ")
            and not line.startswith("import ")
            and not line.startswith("from ")
            and not line.startswith("#")
            and not line.startswith("//")
        ):
            return CodeReference(
                line_number=idx,
                code_snippet=line,
                observation="Look at this part of your code: trace what value this produces on your first failing test input.",
            )

    return None


def build_interactive_question(request: MentorRequest, concept: str = "") -> InteractiveQuestion:
    t_context = f"{request.topic} {request.title} {concept}".lower()

    if "two sum" in t_context or "hash" in t_context or "sum" in t_context:
        return InteractiveQuestion(
            prompt="Let's not jump into code yet. If target = 9 and current number = 4, what number are we looking for to complete the target?",
            options=[
                QuestionOption(
                    label="5 (9 - 4 = 5)",
                    correct=True,
                    feedback="Exactly! 🔥 9 - 4 = 5. That missing number is the complement.",
                ),
                QuestionOption(
                    label="4",
                    correct=False,
                    feedback="4 + 4 is 8, which is less than the target 9.",
                ),
                QuestionOption(
                    label="13 (9 + 4)",
                    correct=False,
                    feedback="Notice that we want two numbers that add UP to target (4 + x = 9), so needed = 9 - 4 = 5.",
                ),
            ],
        )

    if "binary" in t_context:
        return InteractiveQuestion(
            prompt="What should happen to the search range if target < nums[mid] in a sorted array?",
            options=[
                QuestionOption(
                    label="Search Left Half (high = mid - 1)",
                    correct=True,
                    feedback="Exactly! In a sorted array, all elements after mid are even larger, so target must be in the left half.",
                ),
                QuestionOption(
                    label="Search Right Half (low = mid + 1)",
                    correct=False,
                    feedback="Almost. If nums[mid] is already greater than target, all elements to the right are even larger.",
                ),
                QuestionOption(
                    label="Not Sure",
                    correct=False,
                    feedback="Remember the array is sorted: if mid is too large, the target can only reside on the smaller (left) side.",
                ),
            ],
        )

    if "stack" in t_context or "parenthes" in t_context:
        return InteractiveQuestion(
            prompt="Which element comes out of a stack first when matching nested brackets?",
            options=[
                QuestionOption(
                    label="Last inserted element (LIFO)",
                    correct=True,
                    feedback="Exactly! The most recently opened bracket is at the top and must close first.",
                ),
                QuestionOption(
                    label="First inserted element (FIFO)",
                    correct=False,
                    feedback="That's a queue! A stack is Last-In-First-Out, matching innermost brackets first.",
                ),
                QuestionOption(
                    label="Not sure",
                    correct=False,
                    feedback="Think of a stack of plates: you take off the one placed on top last.",
                ),
            ],
        )

    return InteractiveQuestion(
        prompt="What invariant or condition should be verified before updating the current state?",
        options=[
            QuestionOption(
                label="Check boundary limits and guards",
                correct=True,
                feedback="Exactly! Guarding collection bounds and base cases prevents runtime exceptions and off-by-one errors.",
            ),
            QuestionOption(
                label="Restart iteration from index 0",
                correct=False,
                feedback="Restarting from index 0 increases time complexity unnecessarily. Look for pointers or invariants.",
            ),
            QuestionOption(
                label="Not sure",
                correct=False,
                feedback="Check whether the pointer is within valid bounds and the collection is non-empty.",
            ),
        ],
    )


def build_micro_example(request: MentorRequest, concept: str = "") -> MicroExample:
    t_context = f"{request.topic} {request.title} {concept}".lower()

    if "two sum" in t_context or "hash" in t_context or "sum" in t_context:
        return MicroExample(
            title="Interactive Complement Walkthrough",
            input_data="nums = [2, 7, 11, 15], target = 9",
            steps=[
                MicroExampleStep(
                    current="nums[0] = 2",
                    needed="9 - 2 = 7",
                    question="Have we seen 7 in our map yet?",
                    options=["Yes", "No"],
                    correct_option="No",
                    explanation="Map is empty {}. Store 2 at index 0: {2: 0} and advance to index 1.",
                ),
                MicroExampleStep(
                    current="nums[1] = 7",
                    needed="9 - 7 = 2",
                    question="Have we seen complement 2 in our map?",
                    options=["Yes", "No"],
                    correct_option="Yes",
                    explanation="Match found! Complement 2 exists at index 0. Return indices [0, 1] immediately.",
                ),
            ],
        )

    if "binary" in t_context:
        return MicroExample(
            title="Interactive Search Range Walkthrough",
            input_data="nums = [2, 5, 8, 12, 16, 23], target = 12",
            steps=[
                MicroExampleStep(
                    current="low = 0 (2), high = 5 (23), mid = 2 (8)",
                    needed="target = 12 vs mid = 8",
                    question="Since 8 < 12, which direction should the search window move?",
                    options=["low = mid + 1", "high = mid - 1"],
                    correct_option="low = mid + 1",
                    explanation="12 is greater than mid (8), so search moves to right half: low = 3.",
                ),
                MicroExampleStep(
                    current="low = 3 (12), high = 5 (23), mid = 4 (16)",
                    needed="target = 12 vs mid = 16",
                    question="Since 16 > 12, which boundary updates?",
                    options=["low = mid + 1", "high = mid - 1"],
                    correct_option="high = mid - 1",
                    explanation="16 is greater than target 12, so high = mid - 1 = 3. Next mid = 3, value 12 matches!",
                ),
            ],
        )

    return MicroExample(
        title="Interactive Invariant Walkthrough",
        input_data="Sample execution trace",
        steps=[
            MicroExampleStep(
                current="Current state inspection",
                needed="Valid invariant condition",
                question="Is current element within expected bounds?",
                options=["Yes", "No"],
                correct_option="Yes",
                explanation="Bounds check passes, allowing safe constant-time retrieval.",
            ),
        ],
    )


class AITutorProvider(ABC):
    provider_name: str = "abstract"

    @abstractmethod
    async def explain_concept(self, problem_id: int, title: str, topic: str, description: str) -> str:
        ...

    @abstractmethod
    async def get_hint(self, problem_id: int, code: str, hint_level: int) -> str:
        ...

    @abstractmethod
    async def explain_mistake(self, problem_id: int, code: str, error: str) -> str:
        ...

    @abstractmethod
    async def explain_complexity(self, problem_id: int, code: str) -> dict:
        ...

    @abstractmethod
    async def ask(self, problem_id: int, question: str, code: str, history: list[dict]) -> str:
        ...

    @abstractmethod
    async def analyze_mentor(self, request: MentorRequest) -> MentorResponseData:
        ...

class GroqProvider(AITutorProvider):
    provider_name = "groq"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.candidate_models = [
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
        ]

    def _call_groq(
        self,
        messages: list[dict],
        json_mode: bool = False,
        max_tokens: int = 1200,
        temperature: float = 0.3,
    ) -> str:
        import urllib.request
        import urllib.error
        import time

        sanitized_messages = []
        for m in messages:
            role = m.get("role") or "user"
            if role in ("student", "human"):
                role = "user"
            elif role in ("tutor", "mentor"):
                role = "assistant"
            elif role not in ("user", "assistant", "system"):
                role = "user"
            content = str(m.get("content") or "").strip()
            if content:
                sanitized_messages.append({"role": role, "content": content})

        if not sanitized_messages:
            sanitized_messages = [{"role": "user", "content": "Hello"}]

        last_err = None
        for model in self.candidate_models:
            for attempt in range(2):
                try:
                    payload_dict: dict[str, Any] = {
                        "model": model,
                        "messages": sanitized_messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }

                    data = json.dumps(payload_dict).encode("utf-8")
                    req = urllib.request.Request(
                        "https://api.groq.com/openai/v1/chat/completions",
                        data=data,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Content-Type": "application/json",
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=18) as res:
                        resp_data = json.loads(res.read().decode("utf-8"))
                        choice = resp_data.get("choices", [{}])[0]
                        msg = choice.get("message", {})
                        content = msg.get("content")
                        if not content and msg.get("reasoning"):
                            content = msg.get("reasoning")
                        if content and content.strip():
                            return content.strip()
                except urllib.error.HTTPError as he:
                    err_text = he.read().decode("utf-8", errors="ignore")
                    logger.warning("Groq model %s HTTP %d: %s", model, he.code, err_text[:200])
                    last_err = he
                    if he.code == 429:
                        time.sleep(1.5)
                        continue
                    break
                except Exception as exc:
                    logger.warning("Groq model %s error: %s", model, exc)
                    last_err = exc
                    break

        # Fallback to Gemini if Groq candidate models were rate-limited or failed
        from app.core.config import get_settings
        settings = get_settings()
        gemini_key = os.getenv("GEMINI_API_KEY") or settings.gemini_api_key
        if gemini_key:
            try:
                from google import genai
                gem_client = genai.Client(api_key=gemini_key)
                prompt_lines = []
                for m in sanitized_messages:
                    prompt_lines.append(f"{m['role'].upper()}: {m['content']}")
                gem_resp = gem_client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents="\n\n".join(prompt_lines),
                )
                if gem_resp and gem_resp.text:
                    logger.info("Fallback to Gemini 3.6 Flash succeeded for chat turn")
                    return gem_resp.text.strip()
            except Exception as gem_exc:
                logger.warning("Gemini chat fallback failed: %s", gem_exc)

        raise RuntimeError(f"All AI candidate models failed: {last_err}")

    @staticmethod
    def _extract_json(text: str) -> dict:
        clean = text.strip()
        # 1. Direct parse attempt
        try:
            return json.loads(clean, strict=False)
        except Exception:
            pass

        # 2. Extract from markdown code fence ```json ... ```
        m_fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", clean)
        if m_fence:
            try:
                return json.loads(m_fence.group(1), strict=False)
            except Exception:
                pass

        # 3. Match from outermost { to }
        first_brace = clean.find("{")
        last_brace = clean.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            candidate = clean[first_brace : last_brace + 1]
            try:
                return json.loads(candidate, strict=False)
            except Exception:
                pass

        # 4. Fallback regex field extraction if JSON parser failed
        fallback_data = {}
        fb_m = re.search(r'"feedback"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', clean)
        if fb_m:
            fallback_data["feedback"] = fb_m.group(1).replace(r'\"', '"').replace(r'\n', ' ')
        msg_m = re.search(r'"message"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:analogy|next_question|contextual_actions|evaluation)"', clean)
        if msg_m:
            fallback_data["message"] = msg_m.group(1).replace(r'\"', '"').replace(r'\n', '\n').replace(r'\t', '\t')
        elif '"message"' in clean:
            msg_m2 = re.search(r'"message"\s*:\s*"([\s\S]*?)"\s*\}', clean)
            if msg_m2:
                fallback_data["message"] = msg_m2.group(1).replace(r'\"', '"').replace(r'\n', '\n').replace(r'\t', '\t')
            else:
                m_trunc = re.search(r'"message"\s*:\s*"(.*)', clean, re.DOTALL)
                if m_trunc:
                    val = m_trunc.group(1)
                    end_q = re.search(r'(.*?)(?:"\s*,\s*"(?:analogy|next_question|contextual_actions|evaluation|feedback)"|"\s*\}\s*$)', val, re.DOTALL)
                    if end_q:
                        val = end_q.group(1)
                    fallback_data["message"] = val.replace(r'\"', '"').replace(r'\n', '\n').strip(' "}\n')
        an_m = re.search(r'"analogy"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', clean)
        if an_m:
            fallback_data["analogy"] = an_m.group(1).replace(r'\"', '"').replace(r'\n', ' ')

        if fallback_data.get("message"):
            return fallback_data

        return {}

    async def explain_concept(self, problem_id: int, title: str, topic: str, description: str) -> str:
        prompt = (
            f"Explain the core data structure and algorithm concept for '{title}' (Topic: {topic}). "
            f"Problem context: {description[:300]}. "
            "Explain intuitively with a vivid real-world analogy and a tiny 2-3 step walkthrough. Beginner-friendly."
        )
        try:
            return self._call_groq([{"role": "user", "content": prompt}], max_tokens=800)
        except Exception as exc:
            logger.warning("Groq explain_concept failed: %s, using mock", exc)
            return MockAITutorProvider().explain_concept_sync(problem_id, title, topic, description)["explanation"]

    async def get_hint(self, problem_id: int, code: str, hint_level: int) -> str:
        prompt = (
            f"Provide progressive hint level {hint_level} of 3 for problem {problem_id}. "
            "Level 1 is conceptual clue, level 2 is directional advice, level 3 is pseudo-code structure. "
            "Never give away the final full code."
        )
        if code and len(code.strip()) > 10:
            prompt += f"\nStudent's current code:\n```\n{code[:600]}\n```"
        try:
            return self._call_groq([{"role": "user", "content": prompt}], max_tokens=600)
        except Exception as exc:
            logger.warning("Groq get_hint failed: %s, using mock", exc)
            return MockAITutorProvider().get_hint_sync(problem_id, hint_level)["hint"]

    async def explain_mistake(self, problem_id: int, code: str, error: str) -> str:
        prompt = (
            f"Diagnose this mistake for problem {problem_id}.\nError: {error}\n"
            f"Code:\n```\n{code[:600]}\n```\n"
            "Explain why it failed and guide the student on how to fix it without giving away the full answer."
        )
        try:
            return self._call_groq([{"role": "user", "content": prompt}], max_tokens=800)
        except Exception as exc:
            logger.warning("Groq explain_mistake failed: %s, using mock", exc)
            return MockAITutorProvider().explain_mistake_sync(problem_id, code, error)["explanation"]

    async def explain_complexity(self, problem_id: int, code: str) -> dict:
        prompt = (
            "Analyze the time and space complexity of this code:\n"
            f"```\n{code[:800]}\n```\n"
            "Return JSON with keys: time_complexity, space_complexity, explanation."
        )
        try:
            raw = self._call_groq([{"role": "user", "content": prompt}], json_mode=True, max_tokens=600)
            data = self._extract_json(raw)
            if data.get("time_complexity"):
                data["provider"] = "groq"
                return data
            return MockAITutorProvider().explain_complexity_sync(problem_id, code)
        except Exception as exc:
            logger.warning("Groq explain_complexity failed: %s, using mock", exc)
            return MockAITutorProvider().explain_complexity_sync(problem_id, code)

    async def ask(self, problem_id: int, question: str, code: str, history: list[dict]) -> str:
        system = (
            "You are AlgoMentor, an expert, encouraging DSA and programming tutor. "
            "Answer the student's question directly, clearly, and educationally. "
            "The current problem is context only; answer ANY DSA, complexity, language comparison, "
            "or programming question freely. Maintain conversational continuity with the previous history."
        )
        msgs = [{"role": "system", "content": system}]
        if history:
            for h in history[-8:]:
                c = str(h.get("content") or "").strip()
                r = h.get("role")
                if c:
                    msgs.append({"role": r, "content": c})
        user_msg = question
        if code and len(code.strip()) > 10:
            user_msg += f"\n\nStudent code:\n```\n{code[:800]}\n```"
        msgs.append({"role": "user", "content": user_msg})

        try:
            return self._call_groq(msgs, max_tokens=1000)
        except Exception as exc:
            logger.warning("Groq ask failed: %s, using mock", exc)
            return MockAITutorProvider().ask_sync(problem_id, question, code, history)["answer"]

    async def analyze_mentor(self, request: MentorRequest) -> MentorResponseData:
        system_instruction = (
            "You are AlgoMentor, an interactive, world-class DSA teaching assistant connected to the student's live coding environment.\n"
            "Your goal is to guide the student to discover the solution through active thinking, NOT by giving away complete answers or dumping code.\n"
            "Diagnose why their code failed (or how to optimize it) based on their execution result and test cases.\n"
            "Output valid JSON only with keys: diagnosis, concept, explanation, hint, severity, nextAction, interactive_question, code_reference."
        )

        test_summary = ""
        if request.test_results:
            failed_tests = [t for t in request.test_results if not t.passed]
            if failed_tests:
                t0 = failed_tests[0]
                test_summary = f"First Failed Test: Input: {t0.input}, Expected: {t0.expected}, Actual Output: {t0.output}, Status: {t0.status}"

        user_content = f"""Problem: {request.title} ({request.topic}, {request.difficulty})
Description: {request.description[:300]}
Execution Status: {request.execution_status}
Compile Error: {request.compile_error}
Stderr: {request.stderr}
{test_summary}

Student's Current Code:
```
{request.code[:1000]}
```
Provide pedagogical diagnosis in JSON:
{{
  "diagnosis": "Short diagnosis of the conceptual mistake or bug",
  "concept": "Core algorithmic concept",
  "explanation": "1-3 short, conversational, pedagogical sentences guiding the student",
  "hint": "Actionable progressive hint",
  "severity": "low" | "medium" | "high",
  "nextAction": "Clear next action step for student",
  "interactive_question": {{
    "prompt": "Intuition check question",
    "options": [
      {{"label": "...", "correct": true, "feedback": "..."}},
      {{"label": "...", "correct": false, "feedback": "..."}}
    ]
  }},
  "code_reference": {{
    "line_number": 1,
    "code_snippet": "problematic line or snippet",
    "observation": "Focused pedagogical observation"
  }}
}}"""

        try:
            raw = self._call_groq(
                [{"role": "system", "content": system_instruction}, {"role": "user", "content": user_content}],
                json_mode=True,
                max_tokens=1000,
            )
            parsed = self._extract_json(raw)
            diag = parsed.get("diagnosis", "Execution mismatch diagnosed.")
            concept_name = parsed.get("concept", request.topic or "Algorithmic Pattern")

            vis_data = build_visualization_for_mistake(request, diag, concept_name)

            iq = None
            if parsed.get("interactive_question") and isinstance(parsed["interactive_question"], dict):
                p_iq = parsed["interactive_question"]
                if p_iq.get("prompt"):
                    opts = [
                        QuestionOption(label=str(o["label"]), correct=bool(o.get("correct", False)), feedback=str(o.get("feedback", "")))
                        for o in p_iq.get("options", [])
                        if isinstance(o, dict) and "label" in o
                    ]
                    if opts:
                        iq = InteractiveQuestion(prompt=p_iq["prompt"], options=opts)
            if not iq:
                iq = build_interactive_question(request, concept_name)

            code_ref = None
            if parsed.get("code_reference") and isinstance(parsed["code_reference"], dict):
                p_cr = parsed["code_reference"]
                code_ref = CodeReference(
                    line_number=p_cr.get("line_number"),
                    code_snippet=p_cr.get("code_snippet"),
                    observation=p_cr.get("observation"),
                )

            micro_ex = build_micro_example(request, concept_name)

            return MentorResponseData(
                diagnosis=diag,
                concept=concept_name,
                explanation=parsed.get("explanation", "Let's debug this step-by-step together."),
                hint=parsed.get("hint", "Try walking through a small test case with pen and paper."),
                severity=parsed.get("severity", "medium").lower() if parsed.get("severity") in ("low", "medium", "high") else "medium",
                nextAction=parsed.get("nextAction", "Modify your code and click Run Tests."),
                provider="groq",
                attempt_number=request.attempt_number,
                has_3d_explanation=True,
                visualization=vis_data,
                learning_profile=request.learning_profile,
                interactive_question=iq,
                code_reference=code_ref,
                micro_example=micro_ex,
            )
        except Exception as exc:
            logger.warning("Groq analyze_mentor failed (%s), using intelligent fallback", exc)
            return MockAITutorProvider().analyze_mentor_mock(request)

    async def interact_mentor(self, request: MentorInteractRequest) -> MentorInteractResponse:
        system_prompt = (
            "You are AlgoMentor, an elite, interactive DSA and programming tutor connected to a student's live coding environment.\n\n"
            "CRITICAL TUTORING RULES:\n"
            "1. CURRENT PROBLEM = CONTEXT ONLY, NOT A TOPIC RESTRICTION:\n"
            "   The student has a problem open in their workspace (provided below as background context). "
            "   However, the student is completely free to ask about ANY DSA concept, data structure, algorithm, "
            "   complexity question, programming language translation/comparison, or general computer science topic "
            "   (e.g., 'What is a Binary Search Tree?', 'Difference between BFS and DFS', 'Explain recursion with a real-life example', "
            "   'Why is binary search O(log n)?', 'Give me Python code for binary search', 'Now in C++', 'Why use queue in BFS?', "
            "   'Forget this problem. Explain dynamic programming').\n"
            "   ALWAYS answer their question directly, thoroughly, and enthusiastically! NEVER say 'that is outside this problem' or refuse.\n\n"
            "2. CONVERSATION CONTINUITY & PRONOUN RESOLUTION:\n"
            "   Maintain continuous context across conversation history. Correctly resolve references like 'it', 'this', "
            "   'same thing in C++', 'why?', 'give an example', 'now with trees' based on preceding dialogue turns.\n\n"
            "3. STUDENT CODE & EXECUTION CONTEXT:\n"
            "   If the student's message asks about their code or why their submission failed, inspect their actual code, "
            "   compiler output, runtime errors, and failed test cases provided in the context below. "
            "   Do NOT invent errors and do NOT claim tests passed unless actual execution says so. Guide them on the exact logical invariant or bug.\n\n"
            "4. MULTI-LANGUAGE CODE GENERATION:\n"
            "   When the student asks for code, provide clean, idiomatic code with syntax highlighting in the requested language "
            "   (Python, C++, Java, JavaScript, TypeScript, Go, etc.).\n\n"
            "5. NO CANNED OR STATIC FORMULAS:\n"
            "   Provide genuine, context-aware reasoning for each specific query.\n\n"
            "OUTPUT FORMAT (STRICT JSON ONLY):\n"
            "Return a single JSON object with these exact keys:\n"
            "{\n"
            '  "evaluation": "correct" | "partially_correct" | "incorrect" | null,\n'
            '  "feedback": "A concise, punchy 1-sentence title or quick assessment (e.g. \'Binary Search Tree Basics\', \'Spot On!\', \'Great Question\')",\n'
            '  "message": "The full, rich, detailed markdown educational response with clear explanations, analogies, and code blocks where helpful.",\n'
            '  "analogy": "A short vivid real-life analogy if explaining a concept, otherwise null",\n'
            '  "next_question": null or optional object if prompting the student: {"prompt": "...", "options": [{"label": "...", "correct": true, "feedback": "..."}]},\n'
            '  "contextual_actions": ["Ask Follow-up", "Give Example", "Show 3D", "Review My Code", "Try the Problem"]\n'
            "}"
        )

        context_parts = [
            f"Currently Open Problem (Context Only): {request.title} (Topic: {request.topic}, Difficulty: {request.difficulty})",
            f"Description snippet: {request.description[:350]}",
        ]
        if request.language:
            context_parts.append(f"Editor Language: {request.language}")
        if request.code and len(request.code.strip()) > 5:
            context_parts.append(f"Student's Current Editor Code:\n```{request.language or 'python'}\n{request.code[:1500]}\n```")
        if request.execution_status:
            context_parts.append(f"Last Execution Status: {request.execution_status}")
        if request.compile_error:
            context_parts.append(f"Compiler Error:\n```\n{request.compile_error[:800]}\n```")
        if request.stderr:
            context_parts.append(f"Runtime Stderr:\n```\n{request.stderr[:800]}\n```")
        if request.stdout:
            context_parts.append(f"Runtime Stdout:\n```\n{request.stdout[:500]}\n```")
        if request.test_results:
            failed = [t for t in request.test_results if not (isinstance(t, dict) and t.get("passed") or getattr(t, "passed", False))]
            if failed:
                f0 = failed[0]
                if isinstance(f0, dict):
                    context_parts.append(f"Failed Test Case: input={f0.get('input')}, expected={f0.get('expected')}, actual_output={f0.get('output')}, status={f0.get('status')}")
                else:
                    context_parts.append(f"Failed Test Case: input={getattr(f0, 'input', '')}, expected={getattr(f0, 'expected', '')}, actual_output={getattr(f0, 'output', '')}")
            else:
                context_parts.append("All executed test cases passed.")

        context_summary = "\n".join(context_parts)
        groq_messages = [{"role": "system", "content": system_prompt + "\n\n" + context_summary}]

        if request.conversation_history:
            recent = request.conversation_history[-10:]
            for h in recent:
                r = h.get("role")
                if r in ("student", "human"):
                    r = "user"
                elif r in ("tutor", "mentor", "assistant"):
                    r = "assistant"
                c = str(h.get("content") or "").strip()
                if not c:
                    continue
                if c == request.student_answer and r == "user":
                    continue
                if len(c) > 1500 and r == "assistant":
                    c = c[:1500] + "\n...(truncated for context)..."
                groq_messages.append({"role": r, "content": c})

        user_prompt = request.student_answer.strip()
        if not user_prompt:
            if request.action == "give_hint":
                user_prompt = f"Give me progressive hint level {request.level} for this problem without giving away the full code."
            elif request.action == "explain_concept":
                user_prompt = f"Explain the core concept and intuition behind {request.title}."
            elif request.action == "show_example":
                user_prompt = f"Walk me through a clear, tiny step-by-step example of {request.title}."
            elif request.action == "review_code":
                user_prompt = "Review my current editor code and tell me if there are logical flaws or edge cases I missed."
            else:
                user_prompt = "Guide me on how to think about this problem."

        groq_messages.append({"role": "user", "content": user_prompt})

        try:
            raw_response = self._call_groq(groq_messages, json_mode=True, max_tokens=1200, temperature=0.3)
            parsed = self._extract_json(raw_response)
            if not parsed or "message" not in parsed:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="AlgoMentor Explanation",
                    message=raw_response,
                    teaching_step=request.teaching_step,
                    contextual_actions=["Ask Follow-up", "Give Example", "Show 3D", "Review My Code", "Try the Problem"],
                )

            nxt_q = None
            if parsed.get("next_question") and isinstance(parsed["next_question"], dict):
                nq = parsed["next_question"]
                if nq.get("prompt"):
                    opts = []
                    for opt in nq.get("options", []):
                        if isinstance(opt, dict) and opt.get("label"):
                            opts.append(QuestionOption(
                                label=str(opt.get("label")),
                                correct=bool(opt.get("correct", False)),
                                feedback=str(opt.get("feedback", "")),
                            ))
                    if opts:
                        nxt_q = InteractiveQuestion(prompt=nq["prompt"], options=opts)

            actions = parsed.get("contextual_actions")
            if not isinstance(actions, list) or not actions:
                actions = ["Ask Follow-up", "Give Example", "Show 3D", "Review My Code", "Try the Problem"]

            return MentorInteractResponse(
                evaluation=parsed.get("evaluation"),
                feedback=parsed.get("feedback", "AlgoMentor"),
                message=parsed.get("message", raw_response),
                analogy=parsed.get("analogy"),
                next_question=nxt_q,
                teaching_step=request.teaching_step,
                contextual_actions=actions,
            )
        except Exception as exc:
            logger.error("Groq interact_mentor failed: %s", exc)
            return MentorInteractResponse(
                evaluation=None,
                feedback="AI Tutor Connection Notice",
                message=f"AlgoMentor encountered a temporary AI connection issue: {exc}. Please try asking again.",
                teaching_step=request.teaching_step,
                contextual_actions=["Try Again", "Ask Another Question", "Explain Concept"],
            )


class GeminiProvider(AITutorProvider):
    provider_name = "gemini"

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from google import genai
            self.client = genai.Client(api_key=api_key)
            self._available = True
        except Exception as exc:
            logger.warning("Failed to initialize Google GenAI client: %s", exc)
            self._available = False

    def _call_gemini(self, prompt: str, system_instruction: str = "") -> str:
        if not self._available:
            raise RuntimeError("Gemini client not initialized")
        from google.genai import types

        candidate_models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"]
        last_err = None
        for model in candidate_models:
            try:
                config = types.GenerateContentConfig(
                    temperature=0.2,
                    system_instruction=system_instruction if system_instruction else None,
                    response_mime_type="application/json" if "JSON" in prompt else None,
                )
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning("Gemini model %s failed: %s", model, e)
                last_err = e
                continue
        raise RuntimeError(f"All Gemini candidate models failed: {last_err}")

    async def explain_concept(self, problem_id: int, title: str, topic: str, description: str) -> str:
        prompt = f"Explain the core data structure and algorithm concept for '{title}' (Topic: {topic}). Problem: {description[:300]}. Beginner-friendly, with a tiny walkthrough."
        try:
            return self._call_gemini(prompt)
        except Exception as exc:
            logger.warning("Gemini explain_concept failed: %s", exc)
            return MockAITutorProvider().explain_concept_sync(problem_id, title, topic, description)["explanation"]

    async def get_hint(self, problem_id: int, code: str, hint_level: int) -> str:
        prompt = f"Provide progressive hint level {hint_level} of 3 for problem {problem_id}. Level 1 is conceptual clue, level 2 is directional advice, level 3 is pseudo-code structure. Never give the exact final code."
        try:
            return self._call_gemini(prompt)
        except Exception:
            return MockAITutorProvider().get_hint_sync(problem_id, hint_level)["hint"]

    async def explain_mistake(self, problem_id: int, code: str, error: str) -> str:
        prompt = f"Diagnose this mistake for problem {problem_id}. Error: {error}\nCode:\n{code[:500]}\nExplain why it failed and guide the student without giving away the full answer."
        try:
            return self._call_gemini(prompt)
        except Exception:
            return MockAITutorProvider().explain_mistake_sync(problem_id, code, error)["explanation"]

    async def explain_complexity(self, problem_id: int, code: str) -> dict:
        prompt = f"Analyze time and space complexity of this code:\n{code[:600]}\nReturn JSON with keys: time_complexity, space_complexity, explanation."
        try:
            raw = self._call_gemini(prompt)
            data = json.loads(raw)
            data["provider"] = "gemini"
            return data
        except Exception:
            return MockAITutorProvider().explain_complexity_sync(problem_id, code)

    async def ask(self, problem_id: int, question: str, code: str, history: list[dict]) -> str:
        prompt = f"Student question: {question}\nCurrent code:\n{code[:400]}\nAnswer conversationally and educationally."
        try:
            return self._call_gemini(prompt)
        except Exception:
            return MockAITutorProvider().ask_sync(problem_id, question, code, history)["answer"]

    async def analyze_mentor(self, request: MentorRequest) -> MentorResponseData:
        system_instruction = (
            "You are AlgoMentor, an interactive, world-class DSA teaching assistant connected to the student's live coding environment. "
            "Your goal is to guide the student to discover the solution through active thinking, NOT by giving away complete answers or dumping code. "
            "Rules: "
            "1. 'explanation': Keep it strictly to 1-3 short, conversational, pedagogical sentences. Say things like 'Let\\'s debug this together. Look at how you track seen numbers...'. "
            "2. 'interactive_question': A crisp multiple-choice question testing the student's algorithmic intuition. "
            "3. 'code_reference': Point to the student's actual code line with a focused observation. "
            "4. 'micro_example': A 1-2 step trace with input data and a quick check question for the student. "
            "Output valid JSON only with keys: diagnosis, concept, explanation, hint, severity, nextAction, interactive_question, code_reference, micro_example."
        )

        test_summary = ""
        if request.test_results:
            failed_tests = [t for t in request.test_results if not t.passed]
            if failed_tests:
                t0 = failed_tests[0]
                test_summary = f"First Failed Test: Input: {t0.input}, Expected: {t0.expected}, Actual Output: {t0.output}, Status: {t0.status}"

        learning_ctx = ""
        profile = request.learning_profile
        if profile and profile.is_personalized:
            learning_ctx = f"""
Student Learning Profile:
- Topic History: {profile.topic_attempts} total attempts on {request.topic}, {profile.topic_failures} failed, {profile.topic_solved} solved.
- Problem Attempts: {profile.problem_attempts}
- Difficulty Level: {profile.difficulty_level.upper()}
- Detected Pattern: {profile.recurring_pattern or 'Repeated struggle on this concept'}
- Personalization Directive:
  * LEVEL: {profile.difficulty_level.upper()}
  * If 'PERSISTENT': The student has struggled repeatedly with {request.topic}. Provide a foundational, ground-up explanation of the core concept. Explicitly address why this specific mistake keeps happening, without giving away full code.
  * If 'REPEATED': The student is practicing this concept again. Focus on the core invariant and how to avoid the common trap.
"""

        prompt = f"""Analyze this DSA mistake:
Problem: {request.title} (Topic: {request.topic}, Difficulty: {request.difficulty})
Problem Description: {request.description[:400]}
Programming Language: {request.language}
Student Code:
```
{request.code}
```
Execution Status: {request.execution_status}
Compiler Error: {request.compile_error}
Stderr: {request.stderr}
Stdout: {request.stdout}
{test_summary}
Current Attempt Number: {request.attempt_number}
Previous Hints Given: {request.previous_hints}
{learning_ctx}

Output JSON format:
{{
  "diagnosis": "Short 1-2 sentence diagnosis of the specific mistake",
  "concept": "Underlying DSA concept (e.g. One-Pass Complement Hashing)",
  "explanation": "1-3 short, conversational sentences guiding the student (e.g. 'Let\\'s debug this together...')",
  "hint": "Progressive hint for attempt #{request.attempt_number}",
  "severity": "low" | "medium" | "high",
  "nextAction": "Actionable next step for the student",
  "interactive_question": {{
    "prompt": "Small question testing intuition",
    "options": [
      {{"label": "Option A", "correct": true, "feedback": "Positive explanation"}},
      {{"label": "Option B", "correct": false, "feedback": "Gentle guidance"}}
    ]
  }},
  "code_reference": {{
    "line_number": 1,
    "code_snippet": "Exact line from student code",
    "observation": "What the student should notice about this line"
  }},
  "micro_example": {{
    "title": "Interactive Walkthrough Title",
    "input_data": "nums = [2, 7, 11, 15], target = 9",
    "steps": [
      {{
        "current": "nums[0] = 2",
        "needed": "9 - 2 = 7",
        "question": "Have we seen 7 in our map?",
        "options": ["Yes", "No"],
        "correct_option": "No",
        "explanation": "Map is empty, store 2 and continue."
      }}
    ]
  }}
}}"""

        try:
            raw = self._call_gemini(prompt, system_instruction)
            clean = raw.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            elif clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]

            try:
                parsed = json.loads(clean.strip())
            except Exception:
                json_match = re.search(r"(\{[\s\S]*\})", clean)
                if json_match:
                    parsed = json.loads(json_match.group(1))
                else:
                    raise

            diag = parsed.get("diagnosis", "Logical error detected in submission.")
            concept_name = parsed.get("concept", request.topic or "Algorithmic Logic")
            vis_data = build_visualization_for_mistake(request, diag, concept_name)

            # Extract & validate interactive question
            iq = None
            if "interactive_question" in parsed and isinstance(parsed["interactive_question"], dict):
                try:
                    raw_iq = parsed["interactive_question"]
                    opts = [QuestionOption(**o) for o in raw_iq.get("options", [])]
                    if opts and raw_iq.get("prompt"):
                        iq = InteractiveQuestion(prompt=raw_iq["prompt"], options=opts)
                except Exception:
                    iq = None
            if not iq:
                iq = build_interactive_question(request, concept_name)

            # Extract & validate code reference (ensuring line matches student code)
            code_ref = None
            if "code_reference" in parsed and isinstance(parsed["code_reference"], dict):
                try:
                    raw_ref = parsed["code_reference"]
                    l_no = raw_ref.get("line_number")
                    lines = request.code.splitlines()
                    if l_no and 1 <= l_no <= len(lines):
                        code_ref = CodeReference(
                            line_number=l_no,
                            code_snippet=lines[l_no - 1].strip(),
                            observation=raw_ref.get("observation") or "Examine this line in your solution.",
                        )
                except Exception:
                    code_ref = None
            if not code_ref:
                code_ref = extract_actual_code_reference(request.code, request.topic, request.title, request.compile_error or request.stderr)

            # Extract & validate micro example
            micro_ex = None
            if "micro_example" in parsed and isinstance(parsed["micro_example"], dict):
                try:
                    raw_mex = parsed["micro_example"]
                    steps = [MicroExampleStep(**s) for s in raw_mex.get("steps", [])]
                    if steps:
                        micro_ex = MicroExample(
                            title=raw_mex.get("title", "Interactive Walkthrough"),
                            input_data=raw_mex.get("input_data", ""),
                            steps=steps,
                        )
                except Exception:
                    micro_ex = None
            if not micro_ex:
                micro_ex = build_micro_example(request, concept_name)

            return MentorResponseData(
                diagnosis=diag,
                concept=concept_name,
                explanation=parsed.get("explanation", "Let's debug this step-by-step together."),
                hint=parsed.get("hint", "Try walking through a small test case with pen and paper."),
                severity=parsed.get("severity", "medium").lower() if parsed.get("severity") in ("low", "medium", "high") else "medium",
                nextAction=parsed.get("nextAction", "Modify your code and click Run Tests."),
                provider="gemini",
                attempt_number=request.attempt_number,
                has_3d_explanation=True,
                visualization=vis_data,
                learning_profile=profile,
                interactive_question=iq,
                code_reference=code_ref,
                micro_example=micro_ex,
            )
        except Exception as exc:
            logger.warning("Gemini analyze_mentor failed (%s), using intelligent fallback", exc)
            return MockAITutorProvider().analyze_mentor_mock(request)

    async def interact_mentor(self, request: MentorInteractRequest) -> MentorInteractResponse:
        return MockAITutorProvider().interact_mentor_mock(request)


class MockAITutorProvider(AITutorProvider):
    provider_name = "mock"

    _hints: dict[int, list[str]] = {
        1: [
            "Hint 1: Think about what you need to find — for each number, what complement would make the sum? A hash map from value to index lets you check in O(1).",
            "Hint 2: Iterate once. For nums[i], compute need = target - nums[i]. If need is already in the map, you have the answer. Otherwise store nums[i] -> i.",
            "Hint 3: The key insight is one-pass hashing: checking need before inserting avoids using the same element twice. This gives O(n) time and O(n) space.",
        ],
        2: [
            "Hint 1: Which structure gives you last-in-first-out? Valid parentheses require that the last opened bracket is the first closed.",
            "Hint 2: Use a stack: push every opening '({['. When you see a closing bracket, the stack top must be its matching opening; otherwise invalid.",
            "Hint 3: Don't forget two checks: (a) pop only if stack non-empty, (b) after scanning, stack must be empty.",
        ],
    }
    _generic_hints = [
        "Hint 1: Restate the problem in your own words. What is the input, output, and constraint that matters most?",
        "Hint 2: Try a tiny example by hand. What pattern do you see? Think about which data structure matches that pattern.",
        "Hint 3: Outline steps before coding: what to store, when to check, and what to return.",
    ]

    _concept_bank: dict[int, str] = {
        1: "Two Sum is about complement search. The core DSA concept is hashing: a hash map stores value → index for O(1) lookup. Example: nums=[2,7,11,15], target=9. When you see 7, you need 2 — which was already seen at index 0.",
        2: "Valid Parentheses is a classic stack problem. Concept: LIFO ensures nesting order. Example: '({[]})' pushes (, {, [, then pops in reverse order.",
    }

    async def explain_concept(self, problem_id: int, title: str, topic: str, description: str) -> str:
        return self.explain_concept_sync(problem_id, title, topic, description)["explanation"]

    async def get_hint(self, problem_id: int, code: str, hint_level: int) -> str:
        return self.get_hint_sync(problem_id, hint_level)["hint"]

    async def explain_mistake(self, problem_id: int, code: str, error: str) -> str:
        return self.explain_mistake_sync(problem_id, code, error)["explanation"]

    async def explain_complexity(self, problem_id: int, code: str) -> dict:
        return self.explain_complexity_sync(problem_id, code)

    async def ask(self, problem_id: int, question: str, code: str, history: list[dict]) -> str:
        return self.ask_sync(problem_id, question, code, history)["answer"]

    async def analyze_mentor(self, request: MentorRequest) -> MentorResponseData:
        return self.analyze_mentor_mock(request)

    def analyze_mentor_mock(self, request: MentorRequest) -> MentorResponseData:
        status = request.execution_status
        code = request.code
        err = request.compile_error or request.stderr

        if status == "Compilation Error" or "SyntaxError" in err or "Compilation" in status:
            diag = "Syntax / compilation error: Your code contains invalid syntax or type mismatches."
            concept = "Language Syntax & Typing"
            analogy = "Think of writing code like grammar in spoken language: a missing bracket is like an unfinished sentence."
            explanation = f"Let's fix the syntax first. The compiler reported: {err[:120]}. Check the highlighted line for missing colons, mismatched brackets, or indentation."
            hint = "Look closely at the line indicated in the compiler error and verify proper syntax."
            severity = "high"
            next_act = "Fix the syntax error and re-run your code."
        elif status == "Runtime Error" or "RuntimeError" in err:
            diag = "Runtime exception: out-of-bounds index access, null dereference, or zero division."
            concept = "Boundary Conditions & Bounds Safety"
            analogy = "Think of index boundaries like staying inside the lane lines on a highway."
            explanation = "Let's debug this crash together. Your code attempted an invalid array access or popped an empty structure. Check that indices and collections are properly guarded."
            hint = "Add guards (e.g., check index < len(arr) or stack is not empty) before indexing or popping."
            severity = "high"
            next_act = "Add boundary checks to guard against out-of-bounds access."
        elif status == "Time Limit Exceeded":
            diag = "Time Limit Exceeded: Algorithm complexity is too high for test constraints."
            concept = "Time vs Space Complexity Tradeoff"
            analogy = "Checking every pair in nested loops is like inspecting every person in a stadium one by one. Indexing with a map lets you find someone by seat number instantly."
            explanation = "Let's optimize this together. Nested loops take O(n²) time which times out on large inputs. Look for an O(n) pattern like complement hashing."
            hint = "Can you use a Hash Map for O(1) lookups or Binary Search / Two Pointers to eliminate inner loops?"
            severity = "medium"
            next_act = "Refactor nested loops into an optimal data structure."
        else:
            # Wrong Answer
            if "binary" in request.title.lower() or ("low" in code and "high" in code):
                diag = "Incorrect boundary update in binary search: High/Low pointer was shifted incorrectly."
                concept = "Binary Search Boundary Invariant"
                analogy = "Imagine opening a 1000-page dictionary at page 500 looking for 'Smith'. If page 500 has 'Miller', you immediately know 'Smith' can only be in the second half — so you discard pages 1 to 500 completely in one step!"
                explanation = "Let's debug this together. In binary search, the pointer update must strictly shrink the search interval to preserve the invariant and avoid infinite loops."
                hint = f"Attempt #{request.attempt_number}: When nums[mid] < target, target is in the right half, so set low = mid + 1."
                severity = "medium"
                next_act = "Update the boundary pointer update statements."
            elif "two sum" in request.title.lower() or "sum" in request.title.lower() or "hash" in request.topic.lower():
                diag = "Incorrect complement search: Potential duplicate element reuse or quadratic brute-force approach."
                concept = "One-Pass Complement Hashing"
                analogy = "Imagine searching for a matching jigsaw piece in a large pile. Instead of re-searching the entire pile every single time (O(n²)), you lay examined pieces face-up on a tray with their numbers. When you pick up a new piece, you immediately see if its match is already on the tray in O(1) time."
                explanation = "Let's debug this together. Your code checks each number, but we need to quickly find the number that completes the target."
                hint = f"Attempt #{request.attempt_number}: If target = 9 and current number = 4, what complement do you need? Compute target - nums[i] and check seen map."
                severity = "medium"
                next_act = "Store seen numbers in a dictionary to find the complement in O(1)."
            elif "stack" in request.topic.lower() or "valid" in request.title.lower() or "parenthes" in request.title.lower():
                diag = "Mismatched bracket sequencing or LIFO stack invariant violation."
                concept = "Last-In-First-Out (LIFO) Stack Invariant"
                analogy = "Imagine a stack of cafeteria plates. The last plate placed on top must be the first plate taken off. Every open bracket adds a plate; each close bracket must match and remove the top plate."
                explanation = "Let's debug this together. For nested brackets, the most recently opened bracket must be the first one closed."
                hint = f"Attempt #{request.attempt_number}: Push opening brackets onto a stack. When a closing bracket arrives, verify that stack is non-empty and the top matches."
                severity = "medium"
                next_act = "Verify your stack push and pop condition."
            else:
                diag = "Logic divergence: The code produces an incorrect output on one or more test cases."
                concept = request.topic or "Algorithmic Invariant"
                analogy = "Think about maintaining a clear invariant at each step of iteration to eliminate redundant work."
                explanation = "Let's debug this together. Your logic works for some inputs but misses edge cases like duplicates, single elements, or boundary values."
                hint = f"Attempt #{request.attempt_number}: Trace through the first failing test case step-by-step with pen and paper."
                severity = "medium"
                next_act = "Trace the failing test case and adjust your condition."

        profile = request.learning_profile
        if profile and profile.is_personalized:
            if profile.difficulty_level == "persistent":
                explanation = f"Foundational Breakdown ({profile.weak_topic or 'Core Pattern'}): Based on repeated difficulty across {profile.topic_attempts} attempts, let's step back to the fundamental invariant. {explanation}"
                hint = f"Personalized Review Hint: Focus on the recurring pattern ({profile.recurring_pattern or 'boundary conditions'}). Trace a 3-element test case on paper before updating code."
            elif profile.difficulty_level == "repeated":
                explanation = f"Targeted Review: You are practicing {profile.weak_topic or 'this concept'} again. Notice how the core invariant prevents this recurring trap. {explanation}"

        vis = build_visualization_for_mistake(request, diag, concept)
        code_ref = extract_actual_code_reference(request.code, request.topic, request.title, request.compile_error or request.stderr)
        iq = build_interactive_question(request, concept)
        micro_ex = build_micro_example(request, concept)

        return MentorResponseData(
            diagnosis=diag,
            concept=concept,
            explanation=explanation,
            hint=hint,
            severity=severity,
            nextAction=next_act,
            provider=self.provider_name,
            attempt_number=request.attempt_number,
            has_3d_explanation=True,
            visualization=vis,
            learning_profile=profile,
            interactive_question=iq,
            code_reference=code_ref,
            micro_example=micro_ex,
            analogy=analogy,
            teaching_step=1,
            contextual_actions=["Guide Me", "Ask Me", "Show Example", "Show 3D", "Review My Code"],
        )

    async def interact_mentor(self, request: MentorInteractRequest) -> MentorInteractResponse:
        return self.interact_mentor_mock(request)

    def interact_mentor_mock(self, request: MentorInteractRequest) -> MentorInteractResponse:
        action = request.action or "answer_question"
        prob_title = request.title.lower()
        topic = request.topic.lower()
        code = request.code.lower()
        student_ans = (request.student_answer or "").strip().lower()
        step = request.teaching_step or 1
        level = request.level or 1

        is_two_sum = "two sum" in prob_title or "sum" in prob_title or "hash" in topic or "dict" in code or "map" in code
        is_binary_search = "binary" in prob_title or "search" in topic or ("low" in code and "high" in code)
        is_stack = "stack" in topic or "valid" in prob_title or "parenthes" in prob_title

        # 1. Contextual Action: Give Progressive Hint (Levels 1 to 6)
        if action == "give_hint":
            hints_by_level = {
                1: ("Guiding Question", "Ask yourself: if you have the current element, what exact condition or counterpart value is needed?"),
                2: ("Small Hint", "Look at redundant work in your loops. Can a specialized data structure make the check instantaneous?"),
                3: ("Micro-Example", "Trace with a tiny 2-element case by hand. What values need to be remembered?"),
                4: ("Concept Invariant", f"Core concept for {request.title}: eliminate repeat scans by maintaining an invariant state."),
                5: ("3D Visualization", "Use the 3D model visualizer to see pointers and states evolve step-by-step."),
                6: ("Code Review", "Inspect your loop conditions and boundary checks for potential off-by-one or self-matching traps."),
            }
            if is_two_sum:
                hints_by_level = {
                    1: ("Guiding Question", "If target = 9 and current number = 4, what complement number are we looking for?"),
                    2: ("Small Hint", "For each nums[i], needed = target - nums[i]. Check if needed exists in your seen map in O(1)."),
                    3: ("Micro-Example", "nums = [2, 7], target = 9: See 2 -> map empty, store {2: 0}. See 7 -> 9 - 7 = 2 is in map! Return [0, 1]."),
                    4: ("Concept Invariant", "One-Pass Complement Hashing: checking before inserting avoids using the same element twice and runs in O(n)."),
                    5: ("3D Visualization", "Step through the 3D Array and Hash Map visualizer to see complement lookup in action."),
                    6: ("Code Review", "Ensure you return distinct indices [seen[target - num], i] and store seen[num] = i after the check."),
                }
            elif is_binary_search:
                hints_by_level = {
                    1: ("Guiding Question", "When nums[mid] is compared with target, which half of the array can you permanently discard?"),
                    2: ("Small Hint", "Since array is sorted, if nums[mid] < target, target can only reside strictly to the right of mid."),
                    3: ("Micro-Example", "arr = [2, 5, 8], target = 8: mid = 1 (val 5) < 8 -> low = mid + 1 = 2 -> found 8!"),
                    4: ("Concept Invariant", "Binary Search Halving: every comparison discards 50% of the remaining array, giving O(log n) time."),
                    5: ("3D Visualization", "Open the 3D visualizer to see the search interval shrink dynamically."),
                    6: ("Code Review", "Set low = mid + 1 and high = mid - 1 to strictly decrease search window and prevent infinite loops."),
                }
            lvl = max(1, min(level, 6))
            title, hint_text = hints_by_level.get(lvl, hints_by_level[1])
            return MentorInteractResponse(
                evaluation=None,
                feedback=f"Level {lvl} Hint: {title}",
                message=hint_text,
                level=lvl,
                teaching_step=step,
                contextual_actions=["Guide Me", "Show Example", "Show 3D", "Review My Code"],
            )

        elif action == "explain_concept":
            if is_two_sum:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="Concept: One-Pass Complement Hashing",
                    message="Instead of checking all pairs in O(n²), we iterate once and compute needed = target - nums[i]. A Hash Map gives instant O(1) lookup.",
                    analogy="Imagine searching for a matching jigsaw piece: instead of re-searching the entire pile every time, you lay examined pieces face-up on a tray. When you pick up a piece, you immediately see if its match is on the tray in O(1) time.",
                    teaching_step=step,
                    contextual_actions=["Ask Me", "Show Example", "Show 3D", "Review My Code"],
                )
            elif is_binary_search:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="Concept: Binary Search Boundary Invariant",
                    message="In a sorted array, comparing target with the middle element eliminates half the search space in a single comparison.",
                    analogy="Imagine opening a 1000-page dictionary at page 500. If your word starts with K and page 500 is M, you discard all pages after 500 at once.",
                    teaching_step=step,
                    contextual_actions=["Ask Me", "Show Example", "Show 3D", "Review My Code"],
                )
            else:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback=f"Concept: {request.topic or 'Algorithmic Invariant'}",
                    message=f"For {request.title}, identify the core data structure that provides the fastest lookup or state transition.",
                    teaching_step=step,
                    contextual_actions=["Ask Me", "Show Example", "Show 3D"],
                )

        elif action == "show_example":
            req_mentor = MentorRequest(
                problem_id=request.problem_id,
                title=request.title,
                topic=request.topic,
                difficulty=request.difficulty,
                description=request.description,
                code=request.code,
            )
            mex = build_micro_example(req_mentor, request.topic)
            return MentorInteractResponse(
                evaluation=None,
                feedback="Micro-Example Walkthrough",
                message=f"Walk through this tiny test case ({mex.input_data}) step-by-step.",
                micro_example=mex,
                teaching_step=step,
                contextual_actions=["Ask Me", "Show 3D", "Review My Code", "Try the Problem"],
            )

        elif action == "show_3d":
            req_mentor = MentorRequest(
                problem_id=request.problem_id,
                title=request.title,
                topic=request.topic,
                difficulty=request.difficulty,
                description=request.description,
                code=request.code,
            )
            vis = build_visualization_for_mistake(req_mentor, "Interactive 3D Explanation", request.topic)
            return MentorInteractResponse(
                evaluation=None,
                feedback="Interactive 3D Explanation Ready",
                message="Step through the 3D model visualization to see how pointers, arrays, and states change at each step.",
                visualization=vis,
                teaching_step=step,
                contextual_actions=["Guide Me", "Ask Me", "Review My Code", "Try the Problem"],
            )

        elif action == "review_code":
            code_ref = extract_actual_code_reference(request.code, request.topic, request.title, "")
            obs = code_ref.observation if code_ref else "Look closely at your loop bounds and data structure updates."
            line_info = f" around line {code_ref.line_number}" if (code_ref and code_ref.line_number) else ""
            return MentorInteractResponse(
                evaluation=None,
                feedback="Code-Linked Review",
                message=f"Examining your actual code{line_info}: {obs}",
                code_reference=code_ref,
                teaching_step=step,
                contextual_actions=["Guide Me", "Ask Me", "Show 3D", "Try the Problem"],
            )

        elif action == "try_challenge":
            if is_two_sum:
                q = InteractiveQuestion(
                    prompt="Final Quick Check: If nums = [3, 2, 4] and target = 6, what complement are we looking for when at index 0 (val=3)?",
                    options=[
                        QuestionOption(label="3 (6 - 3 = 3, but map is currently empty)", correct=True, feedback="Spot on! 3 is stored in map, and index 1 and 2 will look for it."),
                        QuestionOption(label="6", correct=False, feedback="Target is 6, so needed = 6 - 3 = 3."),
                    ],
                )
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="Quick Challenge Check",
                    message="Answer this final quick check to verify your complete understanding.",
                    next_question=q,
                    teaching_step=4,
                    contextual_actions=["Try the Problem", "Show 3D"],
                )

        # 2. Interactive Socratic Dialogue & Answer Checking
        if is_two_sum:
            if "explain" in student_ans or "what is" in student_ans or "how to" in student_ans:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="Two Sum Concept Overview",
                    message="Two Sum asks us to find two numbers that sum to target. Instead of checking all pairs in O(n²), we use a Hash Map to find the complement in O(1) time.",
                    analogy="Imagine searching for a matching pair: instead of scanning every item repeatedly, you record seen items in a lookup table.",
                    teaching_step=1,
                    contextual_actions=["Why Hash Map?", "Show Example", "Show 3D", "Review My Code"],
                )
            if ("why" in student_ans and ("hash" in student_ans or "map" in student_ans or "dict" in student_ans)) or (step <= 1 and ("hash" in student_ans or "map" in student_ans or "dict" in student_ans)):
                nxt_q = InteractiveQuestion(
                    prompt="Should we check for the complement BEFORE or AFTER storing nums[i] in our map?",
                    options=[
                        QuestionOption(label="Check BEFORE storing nums[i]", correct=True, feedback="Perfect! Checking before storing prevents using the exact same element twice (e.g. nums=[3], target=6)."),
                        QuestionOption(label="Store nums[i] BEFORE checking", correct=False, feedback="If you store first, nums[i] might match with itself! Checking first preserves the invariant."),
                    ],
                )
                return MentorInteractResponse(
                    evaluation="correct",
                    feedback="Why We Use a Hash Map",
                    message="A Hash Map provides instant O(1) key lookup. As we iterate through the array, we check if target minus current exists in constant time instead of running an inner loop.",
                    analogy="Like looking up a contact by name in your phone: you jump straight to the record without dialing every number in town.",
                    teaching_step=3,
                    next_question=nxt_q,
                    contextual_actions=["Give Example", "Show 3D", "Review My Code", "Try the Problem"],
                )
            if "example" in student_ans or "real-life" in student_ans or "analogy" in student_ans:
                return MentorInteractResponse(
                    evaluation=None,
                    feedback="Real-Life Two Sum Analogy",
                    message="Imagine a coat check at a theater. Instead of searching every coat on the rack, you hand them your claim ticket, and they fetch your matching coat in O(1) time.",
                    analogy="In Two Sum, the claim ticket is the complement: target minus current number.",
                    teaching_step=3,
                    contextual_actions=["Show 3D", "Review My Code", "Try the Problem"],
                )

            if step <= 1:
                if "5" in student_ans or "five" in student_ans:
                    eval_status = "correct"
                    fb = "Exactly! 🔥 9 - 4 = 5. That missing number is the complement."
                    msg = "Now here's the important question: Where can we store previously seen numbers so we can find the complement quickly?"
                    nxt_q = InteractiveQuestion(
                        prompt="Where can we store previously seen numbers so we can find the complement quickly?",
                        options=[
                            QuestionOption(label="In a Hash Map / Dictionary", correct=True, feedback="Spot on! A Hash Map gives instant O(1) average lookup time."),
                            QuestionOption(label="In an Array / List", correct=False, feedback="Searching an array takes O(n) time, resulting in slow O(n²) total time."),
                            QuestionOption(label="In a Queue", correct=False, feedback="Queues only allow FIFO access, not arbitrary lookups."),
                        ],
                    )
                    nxt_step = 2
                    actions = ["Guide Me", "Show Example", "Show 3D", "Review My Code"]
                else:
                    eval_status = "incorrect"
                    fb = "No problem. Let's simplify it."
                    msg = "If our current number is 4 and target is 9, subtract 4 from 9 to find the missing value."
                    nxt_q = InteractiveQuestion(
                        prompt="If target = 9 and current number = 4, what number are we looking for?",
                        options=[
                            QuestionOption(label="5", correct=True, feedback="Exactly! 4 + 5 = 9."),
                            QuestionOption(label="4", correct=False, feedback="4 + 4 is 8, not 9."),
                            QuestionOption(label="13", correct=False, feedback="We want the difference (9 - 4 = 5)."),
                        ],
                    )
                    nxt_step = 1
                    actions = ["Guide Me", "Give Hint", "Show Example"]

            elif step == 2:
                if any(k in student_ans for k in ["hash", "dict", "map", "table"]):
                    eval_status = "correct"
                    fb = "Exactly! 🔥 That's why we use a Hash Map — for instant O(1) lookup."
                    msg = "Now consider this crucial invariant: should we check if the complement exists in the map BEFORE or AFTER storing the current number?"
                    nxt_q = InteractiveQuestion(
                        prompt="Should we check for the complement BEFORE or AFTER storing nums[i] in our map?",
                        options=[
                            QuestionOption(label="Check BEFORE storing nums[i]", correct=True, feedback="Perfect! Checking before storing prevents using the exact same element twice (e.g. nums=[3], target=6)."),
                            QuestionOption(label="Store nums[i] BEFORE checking", correct=False, feedback="If you store first, nums[i] might match with itself! Checking first preserves the invariant."),
                        ],
                    )
                    nxt_step = 3
                    actions = ["Guide Me", "Show Example", "Show 3D", "Review My Code"]
                elif "list" in student_ans or "array" in student_ans:
                    eval_status = "partially_correct"
                    fb = "You're close. An array stores values, but searching an array takes O(n) time. What data structure gives O(1) instant key lookup?"
                    msg = "Think about Python dicts or JavaScript Maps: key-value lookups run in O(1) time."
                    nxt_q = InteractiveQuestion(
                        prompt="Which structure gives O(1) lookup: Array or Hash Map?",
                        options=[
                            QuestionOption(label="Hash Map", correct=True, feedback="Yes! Hashing gives O(1) time."),
                            QuestionOption(label="Array", correct=False, feedback="Arrays require O(n) linear scanning."),
                        ],
                    )
                    nxt_step = 2
                    actions = ["Guide Me", "Show Example"]
                else:
                    eval_status = "incorrect"
                    fb = "No problem! Let's think about Python dictionaries or JavaScript Maps."
                    msg = "We use a Hash Map (dictionary) to remember numbers we have already seen."
                    nxt_q = InteractiveQuestion(
                        prompt="Should we use a Hash Map for O(1) lookup?",
                        options=[
                            QuestionOption(label="Yes, use a Hash Map", correct=True, feedback="Exactly! That replaces the inner loop."),
                        ],
                    )
                    nxt_step = 2
                    actions = ["Guide Me", "Show Example"]

            elif step == 3:
                if "before" in student_ans or "first" in student_ans or "prior" in student_ans:
                    eval_status = "correct"
                    fb = "Brilliant! 🔥 That's the core invariant."
                    msg = "Quick check: Array = [1, 3, 5, 7, 9], Target = 8. If current number is 5 (at index 2), what complement do we look up in our map?"
                    nxt_q = InteractiveQuestion(
                        prompt="Target = 8, current = 5. What complement do we look up?",
                        options=[
                            QuestionOption(label="3 (since 8 - 5 = 3, stored at index 1)", correct=True, feedback="Bingo! We stored 3 at index 1 earlier, so we immediately return [1, 2]!"),
                            QuestionOption(label="5", correct=False, feedback="8 - 5 is 3, not 5."),
                            QuestionOption(label="8", correct=False, feedback="8 is the target, we need 8 - 5 = 3."),
                        ],
                    )
                    nxt_step = 4
                    actions = ["Show 3D", "Review My Code", "Try the Problem"]
                else:
                    eval_status = "incorrect"
                    fb = "Watch out for that trap! If nums=[3, 2, 4] and target=6, storing 3 first means checking 6 - 3 = 3 will find the element itself at index 0!"
                    msg = "Checking BEFORE inserting prevents an element from being used twice."
                    nxt_q = InteractiveQuestion(
                        prompt="Why must we check BEFORE inserting?",
                        options=[
                            QuestionOption(label="To avoid matching an element with itself", correct=True, feedback="Exactly right!"),
                            QuestionOption(label="To save memory", correct=False, feedback="Correctness requires not pairing an element with itself."),
                        ],
                    )
                    nxt_step = 3
                    actions = ["Guide Me", "Show Example"]

            else:  # step >= 4
                eval_status = "correct"
                fb = "Perfect! 🔥 You understand the core idea."
                msg = "You have discovered the optimal O(n) One-Pass Hash Map solution! Click [Try the Problem] to implement this in your code."
                return MentorInteractResponse(
                    evaluation=eval_status,
                    feedback=fb,
                    message=msg,
                    is_completed=True,
                    teaching_step=4,
                    contextual_actions=["Show 3D", "Review My Code", "Try the Problem"],
                )

            return MentorInteractResponse(
                evaluation=eval_status,
                feedback=fb,
                message=msg,
                next_question=nxt_q,
                teaching_step=nxt_step,
                contextual_actions=actions,
            )

        elif is_binary_search:
            if step <= 1:
                if "left" in student_ans or "lower" in student_ans:
                    eval_status = "correct"
                    fb = "Exactly! 🔥 Since the array is sorted, every number before mid is also smaller than target."
                    msg = "Now what should `low` become to safely narrow the search range?"
                    nxt_q = InteractiveQuestion(
                        prompt="What should low become to narrow the range?",
                        options=[
                            QuestionOption(label="low = mid + 1", correct=True, feedback="Exactly! We already checked mid, so low = mid + 1 prevents infinite loops."),
                            QuestionOption(label="low = mid", correct=False, feedback="If low = mid, adjacent pointers can cause an infinite loop!"),
                        ],
                    )
                    nxt_step = 2
                    actions = ["Guide Me", "Show Example", "Show 3D"]
                else:
                    eval_status = "incorrect"
                    fb = "Remember: the array is sorted. If nums[mid] is smaller than target, target can only reside to the right."
                    msg = "Which half should we eliminate when target > nums[mid]?"
                    nxt_q = InteractiveQuestion(
                        prompt="Which half should we eliminate when target > nums[mid]?",
                        options=[
                            QuestionOption(label="Left half", correct=True, feedback="Yes! Discard numbers smaller than target."),
                            QuestionOption(label="Right half", correct=False, feedback="Right half has larger numbers where target may be."),
                        ],
                    )
                    nxt_step = 1
                    actions = ["Guide Me", "Give Hint"]
            elif step == 2:
                if "mid + 1" in student_ans or "mid+1" in student_ans or "1" in student_ans:
                    eval_status = "correct"
                    fb = "Exactly! 🔥 low = mid + 1 narrows the search range and avoids infinite loops."
                    msg = "Quick check: Array = [2, 4, 6, 8, 10], Target = 8. low=0, high=4. What is mid and its value?"
                    nxt_q = InteractiveQuestion(
                        prompt="low=0, high=4 -> mid = (0 + 4) // 2 = 2. nums[mid] is:",
                        options=[
                            QuestionOption(label="6 (since nums[2] = 6 < 8, we move low = 3)", correct=True, feedback="Spot on! Next check examines index 3 (val 8) -> found!"),
                            QuestionOption(label="8", correct=False, feedback="nums[2] is 6, not 8."),
                        ],
                    )
                    nxt_step = 3
                    actions = ["Show 3D", "Review My Code", "Try the Problem"]
                else:
                    eval_status = "incorrect"
                    fb = "Always use mid + 1 or mid - 1 to guarantee progress."
                    msg = "What should low become?"
                    nxt_q = InteractiveQuestion(
                        prompt="What should low become?",
                        options=[
                            QuestionOption(label="low = mid + 1", correct=True, feedback="Correct!"),
                        ],
                    )
                    nxt_step = 2
                    actions = ["Guide Me"]
            else:
                return MentorInteractResponse(
                    evaluation="correct",
                    feedback="Perfect! 🔥 You understand the binary search invariant.",
                    message="You know how to update the search range without infinite loops. Update your code and try the problem!",
                    is_completed=True,
                    teaching_step=3,
                    contextual_actions=["Show 3D", "Review My Code", "Try the Problem"],
                )

            return MentorInteractResponse(
                evaluation=eval_status,
                feedback=fb,
                message=msg,
                next_question=nxt_q,
                teaching_step=nxt_step,
                contextual_actions=actions,
            )

        # Generic problem fallback
        if "yes" in student_ans or "true" in student_ans or "check" in student_ans:
            eval_status = "correct"
            fb = "Exactly! 🔥 That preserves the algorithmic invariant."
            msg = "You are following the optimal approach. Modify your code and click Run Tests!"
            return MentorInteractResponse(
                evaluation=eval_status,
                feedback=fb,
                message=msg,
                is_completed=True,
                teaching_step=2,
                contextual_actions=["Show 3D", "Review My Code", "Try the Problem"],
            )
        else:
            prob_title = request.title or "this problem"
            prob_topic = request.topic or "DSA"
            return MentorInteractResponse(
                evaluation=None,
                feedback=f"Understanding {prob_title}",
                message=f"Let's break down **{prob_title}** ({prob_topic}). Focus on what invariant or property you need to maintain at each step. What data structure or pattern best fits this operation?",
                teaching_step=step,
                contextual_actions=["Guide Me", "Explain Concept", "Show Example"],
            )

    # Sync helpers preserved for backward compatibility
    def explain_concept_sync(self, problem_id: int, title: str, topic: str, description: str) -> dict:
        concept = self._concept_bank.get(problem_id)
        if concept:
            return {"explanation": concept, "provider": self.provider_name}
        return {
            "explanation": f"The problem '{title}' belongs to {topic}. Think about which data structure matches the operation you need. Trace a tiny input (size 2-3) to build intuition.",
            "provider": self.provider_name,
        }

    def get_hint_sync(self, problem_id: int, hint_level: int = 1) -> dict:
        hints_list = self._hints.get(problem_id, self._generic_hints)
        idx = max(0, min(hint_level - 1, len(hints_list) - 1))
        return {"hint_level": hint_level, "hint": hints_list[idx], "provider": self.provider_name}

    def explain_mistake_sync(self, problem_id: int, code: str, error: str) -> dict:
        if "Wrong Answer" in error:
            exp = "Likely mistake: handles main case but misses edge case (duplicates/empty/order). Fix: test duplicates and minimal input, trace step-by-step."
        elif "Runtime Error" in error:
            exp = "Likely mistake: out-of-bounds or null access. Fix: guard every access (index < len, stack non-empty)."
        elif "Time Limit" in error:
            exp = "Likely mistake: nested loops where hashing or two-pointers would be O(n). Fix: use hash map to replace inner loop."
        else:
            exp = "Review your logic against sample input line-by-line."
        return {"explanation": exp, "provider": self.provider_name}

    def explain_complexity_sync(self, problem_id: int, code: str) -> dict:
        has_nested = "for" in code and code.count("for") > 1
        is_hash = "dict" in code.lower() or "map" in code.lower()
        time_c = "O(n²)" if has_nested else "O(n)"
        space_c = "O(n)" if is_hash else "O(1)"
        return {
            "time_complexity": time_c,
            "space_complexity": space_c,
            "explanation": ("Nested loops -> quadratic. " if has_nested else "Single pass -> linear. ")
            + ("Hash map -> linear space. " if is_hash else "Variables only -> constant space. "),
            "provider": self.provider_name,
        }

    def ask_sync(self, problem_id: int, question: str, code: str, history: list[dict] | None = None) -> dict:
        q = question.lower()
        if "time" in q or "complexity" in q:
            answer = "Time complexity comes from visits: nested loops -> O(n²), hash -> O(1) so single loop -> O(n). Which part of your code loops?"
        elif "hash" in q or "map" in q:
            answer = "Hashing: store seen values for O(1) lookup. Ask: what do you need to look up quickly here?"
        elif "stack" in q:
            answer = "Stack = LIFO. Push opens, pop to match closes. Trace '([)]' to see why order matters."
        elif "bst" in q or "binary search" in q:
            answer = "Sorted + random access -> binary search halves space each step. Is your data sorted and indexable?"
        else:
            answer = f"Good question about '{question[:60]}'. Try a tiny example (n=2-3) and write steps in words before coding."
        return {"answer": answer, "provider": self.provider_name}


def _run_async_safely(coro):
    import asyncio
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result(timeout=25)
    return asyncio.run(coro)


def _create_provider() -> AITutorProvider:
    groq_key = os.getenv("GROQ_API_KEY") or settings.groq_api_key
    if groq_key:
        try:
            logger.info("Initializing GroqProvider for AlgoMentor AI tutoring")
            return GroqProvider(groq_key)
        except Exception as exc:
            logger.warning("GroqProvider initialization failed: %s, checking alternatives", exc)

    gemini_key = os.getenv("GEMINI_API_KEY") or settings.gemini_api_key
    provider_name = os.getenv("AI_PROVIDER", settings.ai_provider).lower()
    if (provider_name == "gemini" or gemini_key) and gemini_key:
        try:
            return GeminiProvider(gemini_key)
        except Exception as exc:
            logger.warning("GeminiProvider initialization failed: %s, falling back to mock", exc)

    return MockAITutorProvider()


_provider: AITutorProvider = _create_provider()


def get_ai_tutor() -> AITutorProvider:
    return _provider


def explain_concept_sync(problem_id: int, title: str, topic: str, description: str) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.explain_concept_sync(problem_id, title, topic, description)
    try:
        explanation = _run_async_safely(provider.explain_concept(problem_id, title, topic, description))
        return {"explanation": explanation, "provider": provider.provider_name}
    except Exception as exc:
        logger.warning("explain_concept_sync failed: %s, using mock", exc)
        return MockAITutorProvider().explain_concept_sync(problem_id, title, topic, description)


def get_hint_sync(problem_id: int, hint_level: int = 1) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.get_hint_sync(problem_id, hint_level)
    try:
        hint = _run_async_safely(provider.get_hint(problem_id, "", hint_level))
        return {"hint_level": hint_level, "hint": hint, "provider": provider.provider_name}
    except Exception as exc:
        logger.warning("get_hint_sync failed: %s, using mock", exc)
        return MockAITutorProvider().get_hint_sync(problem_id, hint_level)


def explain_mistake_sync(problem_id: int, code: str, error: str) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.explain_mistake_sync(problem_id, code, error)
    try:
        explanation = _run_async_safely(provider.explain_mistake(problem_id, code, error))
        return {"explanation": explanation, "provider": provider.provider_name}
    except Exception as exc:
        logger.warning("explain_mistake_sync failed: %s, using mock", exc)
        return MockAITutorProvider().explain_mistake_sync(problem_id, code, error)


def explain_complexity_sync(problem_id: int, code: str) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.explain_complexity_sync(problem_id, code)
    try:
        return _run_async_safely(provider.explain_complexity(problem_id, code))
    except Exception as exc:
        logger.warning("explain_complexity_sync failed: %s, using mock", exc)
        return MockAITutorProvider().explain_complexity_sync(problem_id, code)


def ask_sync(problem_id: int, question: str, code: str, history: list[dict] | None = None) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.ask_sync(problem_id, question, code, history)
    try:
        ans = _run_async_safely(provider.ask(problem_id, question, code, history or []))
        return {"answer": ans, "provider": provider.provider_name}
    except Exception as exc:
        logger.warning("ask_sync failed: %s, using mock", exc)
        return MockAITutorProvider().ask_sync(problem_id, question, code, history)


def analyze_mentor_sync(request: MentorRequest) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.analyze_mentor_mock(request).model_dump()
    try:
        res = _run_async_safely(provider.analyze_mentor(request))
        return res.model_dump()
    except Exception as exc:
        logger.warning("analyze_mentor_sync failed: %s, falling back to mock", exc)
        return MockAITutorProvider().analyze_mentor_mock(request).model_dump()


def interact_mentor_sync(request: MentorInteractRequest) -> dict:
    provider = get_ai_tutor()
    if isinstance(provider, MockAITutorProvider):
        return provider.interact_mentor_mock(request).model_dump()
    try:
        res = _run_async_safely(provider.interact_mentor(request))
        return res.model_dump()
    except Exception as exc:
        logger.error("interact_mentor_sync failed: %s", exc)
        return {
            "evaluation": None,
            "feedback": "AI Tutor Notice",
            "message": f"AlgoMentor couldn't reach the AI service right now: {exc}. Please check your connection and try again.",
            "teaching_step": request.teaching_step,
            "contextual_actions": ["Try Again", "Ask Another Question", "Explain Concept"],
        }


# --- TTS / Voice Explanation Service ---
_tts_cache: dict[str, str] = {}


def format_text_for_speech(text: str) -> str:
    """Format markdown, mathematical, and algorithmic notations for natural educational narration."""
    s = text
    s = re.sub(r"```[\s\S]*?```", " ", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    s = re.sub(r"#+\s*", "", s)
    s = s.replace("O(n²)", "O of n squared")
    s = s.replace("O(n)", "O of n")
    s = s.replace("O(log n)", "O of log n")
    s = s.replace("O(1)", "O of 1")
    s = s.replace("<=", " is less than or equal to ")
    s = s.replace(">=", " is greater than or equal to ")
    s = s.replace("==", " equals ")
    s = s.replace("!=", " does not equal ")
    s = s.replace("<", " is less than ")
    s = s.replace(">", " is greater than ")
    s = s.replace("+=", " plus equals ")
    s = s.replace("-=", " minus equals ")
    s = s.replace("//", " integer division by ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    """Convert raw 16-bit PCM bytes into standard playable WAV format."""
    import io
    import wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


def prepare_concise_spoken_text(text: str, max_chars: int = 200) -> str:
    """Format and trim assistant response to <= 200 characters for fast, natural TTS narration."""
    cleaned = format_text_for_speech(text)
    if not cleaned:
        return "Review your code step by step."
    if len(cleaned) <= max_chars:
        return cleaned

    # Trim at last punctuation mark (. ! ?) before max_chars
    trimmed = cleaned[:max_chars]
    last_punct = max(trimmed.rfind("."), trimmed.rfind("!"), trimmed.rfind("?"))
    if last_punct > 50:
        return trimmed[: last_punct + 1].strip()

    # Fall back to last word boundary
    last_space = trimmed.rfind(" ")
    if last_space > 50:
        return trimmed[:last_space].strip() + "."

    return trimmed.strip()


def generate_speech_sync(text: str, voice: str = "autumn") -> dict:
    """Generate audio speech using Groq TTS (canopylabs/orpheus-v1-english) with in-memory caching."""
    import os
    import base64
    import hashlib
    import groq
    from app.core.config import get_settings

    cleaned = prepare_concise_spoken_text(text, max_chars=200)
    if not cleaned:
        cleaned = "Review your code step by step."

    settings = get_settings()
    groq_key = os.getenv("GROQ_API_KEY") or getattr(settings, "effective_groq_api_key", None) or settings.groq_api_key
    if not groq_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend/.env or environment.")

    # Validated Groq Orpheus voices
    allowed_voices = {"autumn", "diana", "hannah", "austin", "daniel", "troy"}
    groq_voice = voice.lower() if voice.lower() in allowed_voices else "autumn"

    cache_key = hashlib.sha256(f"{groq_voice}:{cleaned}".encode()).hexdigest()
    if cache_key in _tts_cache:
        logger.info("Groq TTS Cache HIT for key %s", cache_key[:8])
        return {
            "audio_base64": _tts_cache[cache_key],
            "mime_type": "audio/wav",
            "cached": True,
            "provider": "groq",
            "model": "canopylabs/orpheus-v1-english",
            "voice": groq_voice,
        }

    # Call Groq TTS via official Groq SDK
    try:
        client = groq.Groq(api_key=groq_key)
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=groq_voice,
            input=cleaned,
            response_format="wav",
        )
        wav_bytes = response.read() if hasattr(response, "read") else getattr(response, "content", b"")
        if not wav_bytes:
            raise RuntimeError("Empty audio bytes returned by Groq TTS")

        b64 = base64.b64encode(wav_bytes).decode("ascii")
        _tts_cache[cache_key] = b64
        logger.info(
            "Groq TTS SUCCESS with model canopylabs/orpheus-v1-english, voice %s, bytes %d",
            groq_voice,
            len(wav_bytes),
        )
        return {
            "audio_base64": b64,
            "mime_type": "audio/wav",
            "cached": False,
            "provider": "groq",
            "model": "canopylabs/orpheus-v1-english",
            "voice": groq_voice,
        }
    except groq.APIError as api_err:
        err_msg = getattr(api_err, "message", str(api_err))
        logger.error("Groq TTS API error: %s", err_msg)
        raise RuntimeError(f"Groq TTS API error: {err_msg}")
    except Exception as exc:
        logger.error("Groq TTS error: %s", exc)
        raise RuntimeError(f"Groq TTS error: {exc}")


