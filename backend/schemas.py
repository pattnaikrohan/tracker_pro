from pydantic import BaseModel, Field
from typing import List, Optional

class UploadRequest(BaseModel):
    filename: str
    base64_data: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
    role: str
    name: str
    permissions: Optional[List[str]] = []

class CommentBase(BaseModel):
    author_role: str
    text: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    request_id: Optional[int] = None
    blocker_id: Optional[int] = None
    created_at: str

    class Config:
        from_attributes = True

class ChangeRequestBase(BaseModel):
    title: str
    request_text: str
    priority: Optional[str] = "Medium"
    type: Optional[str] = "Enhancement"

class Subtask(BaseModel):
    id: str
    title: str
    completed: bool = False

class TimeLog(BaseModel):
    id: str
    date: str
    hours: float
    developer: str

class ChangeRequestCreate(ChangeRequestBase):
    deadline: Optional[str] = None
    estimated_days_client: Optional[int] = None
    complexity_client: Optional[str] = None
    attachments: Optional[List[str]] = []

class ChangeRequestUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    complexity_client: Optional[str] = None
    complexity_dev: Optional[str] = None
    agreed_complexity: Optional[str] = None
    estimated_days_client: Optional[int] = None
    estimated_days_dev: Optional[int] = None
    agreed_days: Optional[int] = None
    progress_percent: Optional[int] = None
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    dev_notes: Optional[str] = None
    hours_spent: Optional[float] = None
    is_blocked: Optional[bool] = None
    blocker_reason: Optional[str] = None
    client_approved_estimate: Optional[bool] = None
    escalated: Optional[bool] = None
    tags: Optional[str] = None
    subtasks: Optional[List[Subtask]] = None
    time_logs: Optional[List[TimeLog]] = None
    attachments: Optional[List[str]] = None

class ChangeRequest(ChangeRequestBase):
    id: int
    project_id: int
    status: str
    complexity_client: Optional[str] = None
    complexity_dev: Optional[str] = None
    agreed_complexity: Optional[str] = None
    estimated_days_client: Optional[int] = None
    estimated_days_dev: Optional[int] = None
    agreed_days: Optional[int] = None
    progress_percent: Optional[int] = 0
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    dev_notes: Optional[str] = None
    hours_spent: Optional[float] = 0
    is_blocked: Optional[bool] = False
    blocker_reason: Optional[str] = None
    client_approved_estimate: Optional[bool] = None
    escalated: Optional[bool] = False
    tags: Optional[str] = None
    subtasks: Optional[List[Subtask]] = []
    time_logs: Optional[List[TimeLog]] = []
    attachments: Optional[List[str]] = []
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    comments: List[Comment] = []
    blocker_comments: List[Comment] = []

    class Config:
        from_attributes = True

# ── Blockers ──
class BlockerCreate(BaseModel):
    title: str
    description: str
    severity: Optional[str] = "Medium"
    related_request_title: Optional[str] = None

class BlockerUpdate(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None

class Blocker(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    severity: str
    reported_by: str
    status: str
    related_request_title: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    comments: List[Comment] = []

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    description: str
    client: Optional[str] = None
    developers: Optional[List[str]] = []
    status: Optional[str] = "Active"

class ProjectCreate(ProjectBase):
    estimated_days_client: Optional[int] = None
    complexity_client: Optional[str] = None
    deadline: Optional[str] = None
    attachments: Optional[List[str]] = []

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client: Optional[str] = None
    developers: Optional[List[str]] = None
    complexity_client: Optional[str] = None
    complexity_dev: Optional[str] = None
    agreed_complexity: Optional[str] = None
    estimated_days_client: Optional[int] = None
    estimated_days_dev: Optional[int] = None
    agreed_days: Optional[int] = None
    deadline: Optional[str] = None
    client_approved_estimate: Optional[bool] = None
    status: Optional[str] = None

class Project(ProjectBase):
    id: int
    created_at: str
    deadline: Optional[str] = None
    complexity_client: Optional[str] = None
    complexity_dev: Optional[str] = None
    agreed_complexity: Optional[str] = None
    estimated_days_client: Optional[int] = None
    estimated_days_dev: Optional[int] = None
    agreed_days: Optional[int] = None
    client_approved_estimate: Optional[bool] = None
    attachments: Optional[List[str]] = []
    comments: List[Comment] = []
    change_requests: List[ChangeRequest] = []
    blockers: List[Blocker] = []

    class Config:
        from_attributes = True
