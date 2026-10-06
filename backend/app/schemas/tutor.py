from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ConceptRequest(BaseModel):
    problem_id: int
    title: str | None = None
    topic: str | None = None
    description: str | None = None


class HintRequest(BaseModel):
    problem_id: int
    hint_level: int = Field(ge=1, le=3, default=1)


class ExplainRequest(BaseModel):
    problem_id: int
    code: str
    error: str = ""


class ComplexityRequest(BaseModel):
    problem_id: int
    code: str


class AskRequest(BaseModel):
    problem_id: int
    question: str = Field(min_length=1, max_length=4000)
    code: str = ""
    title: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    description: str | None = None
    language: str = "python"
    execution_status: str | None = None
    error_message: str | None = None
    conversation_id: int | None = None
    history: list[dict] | None = None


class ConversationCreate(BaseModel):
    problem_id: int | None = None
    title: str | None = None


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    role: str = Field(default="user", pattern="^(user|assistant)$")


class TutorMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime | None = None


class MentorTestResult(BaseModel):
    index: int = 0
    passed: bool = False
    status: str = "Wrong Answer"
    hidden: bool = False
    input: str | None = None
    expected: str | None = None
    output: str | None = None


class LearningProfileData(BaseModel):
    is_personalized: bool = False
    difficulty_level: str = "normal"  # normal | repeated | persistent
    weak_topic: str | None = None
    topic_attempts: int = 0
    topic_failures: int = 0
    topic_solved: int = 0
    problem_attempts: int = 0
    recurring_pattern: str | None = None
    recommended_concept: str | None = None
    message: str | None = None


class MentorRequest(BaseModel):
    problem_id: int
    title: str = ""
    topic: str = ""
    difficulty: str = "Easy"
    description: str = ""
    language: str = "python"
    code: str = ""
    execution_status: str = ""
    compile_error: str = ""
    stderr: str = ""
    stdout: str = ""
    test_results: list[MentorTestResult] = []
    attempt_number: int = 1
    previous_hints: list[str] = []
    learning_profile: LearningProfileData | None = None


class VisualizerStep(BaseModel):
    array: list[int]
    active_indices: list[int] = []
    comparing_indices: list[int] = []
    found_indices: list[int] = []
    swapped_indices: list[int] = []
    sorted_indices: list[int] = []
    pointers: dict[str, int] = {}
    operation: str = ""
    description: str = ""


class VisualizationData(BaseModel):
    type: str = "array"
    title: str = ""
    concept: str = ""
    mistake_summary: str = ""
    steps: list[VisualizerStep] = []


class QuestionOption(BaseModel):
    label: str
    correct: bool
    feedback: str


class InteractiveQuestion(BaseModel):
    prompt: str
    options: list[QuestionOption] = []


class CodeReference(BaseModel):
    line_number: int | None = None
    code_snippet: str | None = None
    observation: str | None = None


class MicroExampleStep(BaseModel):
    current: str
    needed: str
    question: str
    options: list[str] = []
    correct_option: str
    explanation: str


class MicroExample(BaseModel):
    title: str = ""
    input_data: str = ""
    steps: list[MicroExampleStep] = []


class MentorResponseData(BaseModel):
    diagnosis: str
    concept: str
    explanation: str
    hint: str
    severity: str
    nextAction: str
    provider: str
    attempt_number: int
    has_3d_explanation: bool = True
    visualization: VisualizationData | None = None
    learning_profile: LearningProfileData | None = None
    interactive_question: InteractiveQuestion | None = None
    code_reference: CodeReference | None = None
    micro_example: MicroExample | None = None
    analogy: str | None = None
    teaching_step: int = 1
    contextual_actions: list[str] = ["Guide Me", "Ask Me", "Show Example", "Show 3D"]


class MentorInteractRequest(BaseModel):
    problem_id: int
    title: str = ""
    topic: str = ""
    difficulty: str = "Easy"
    description: str = ""
    code: str = ""
    language: str = "python"
    execution_status: str | None = None
    compile_error: str | None = None
    stderr: str | None = None
    stdout: str | None = None
    test_results: list[dict] | list[Any] = []
    action: str = "answer_question"  # answer_question | guide_me | give_hint | show_example | ask_me | explain_concept | show_3d | review_code | try_challenge | custom_query
    student_answer: str = ""
    current_question: str = ""
    conversation_history: list[dict] = []
    teaching_step: int = 1
    level: int = 1
    learning_profile: LearningProfileData | None = None


class MentorInteractResponse(BaseModel):
    evaluation: str | None = None  # "correct" | "partially_correct" | "incorrect" | None
    feedback: str
    message: str
    analogy: str | None = None
    micro_example: MicroExample | None = None
    next_question: InteractiveQuestion | None = None
    code_reference: CodeReference | None = None
    visualization: VisualizationData | None = None
    level: int = 1
    teaching_step: int = 1
    is_completed: bool = False
    contextual_actions: list[str] = ["Guide Me", "Ask Me", "Show Example", "Show 3D"]
    suggested_quick_check: str | None = None


class TutorConversationResponse(BaseModel):
    id: int
    user_id: str
    problem_id: int | None = None
    title: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    messages: list[TutorMessageResponse] = []


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str = "Kore"


class TTSResponseData(BaseModel):
    audio_base64: str
    mime_type: str = "audio/wav"
    cached: bool = False


