from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ExampleSchema(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class TestCaseSchema(BaseModel):
    id: str
    input: str
    expectedOutput: str
    hidden: bool = False


class ProblemBase(BaseModel):
    title: str
    slug: str
    difficulty: str
    topic_id: int | None = None  # FK to DsaTopic — optional in seed mapping
    topic_name: str | None = None  # denormalized for quick access
    description: str
    examples: list[ExampleSchema] = []
    constraints: list[str] = []
    starter_code: str = ""
    test_cases: list[TestCaseSchema] = []
    tags: list[str] = []
    acceptance: float = 0.0


class ProblemCreate(ProblemBase):
    pass


class ProblemResponse(ProblemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # Legacy / frontend compatibility aliases
    starterCode: str | None = None  # alias of starter_code
    testCases: list[TestCaseSchema] | None = None  # alias of test_cases
    topicName: str | None = None
    topicId: str | None = None

    is_published: bool = True
    created_at: datetime | None = None


class ProblemListResponse(BaseModel):
    success: bool = True
    data: list[ProblemResponse]
    total: int


class ProblemDetailResponse(BaseModel):
    success: bool = True
    data: ProblemResponse
