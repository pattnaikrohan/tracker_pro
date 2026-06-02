from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
import json
import time
import base64
import uuid
import re
from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles

import schemas

app = FastAPI(title="AAW Project Tracker API (File Based)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══ WEBSOCKETS ═══
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.copy():
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "TYPING":
                    await manager.broadcast(msg)
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "projects")
os.makedirs(DATA_DIR, exist_ok=True)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def append_audit_log(event_type: str, data: dict):
    path = os.path.join(os.path.dirname(__file__), "data", "audit_logs.json")
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f)
    with open(path, "r", encoding="utf-8") as f:
        try:
            logs = json.load(f)
        except:
            logs = []
    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": event_type,
        "details": data
    }
    logs.append(log_entry)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=4)

def log_event(event_type: str, data: dict):
    print(f"\n--- [SYSTEM EVENT TRIGGERED] ---")
    print(f"Event: {event_type}")
    print(f"Payload: {data}")
    print(f"----------------------------------------\n")
    append_audit_log(event_type, data)

def calculate_health_status(created_at_str: str, deadline_str: Optional[str]) -> str:
    if not deadline_str:
        return "Green"
    try:
        now = datetime.utcnow()
        deadline_clean = deadline_str.replace('Z', '')
        if '.' in deadline_clean:
            deadline_clean = deadline_clean.split('.')[0]
        if len(deadline_clean) <= 10:
            deadline_dt = datetime.strptime(deadline_clean, "%Y-%m-%d")
        else:
            deadline_dt = datetime.fromisoformat(deadline_clean)
            
        remaining_days = (deadline_dt - now).total_seconds() / 86400
        
        if remaining_days <= 2:
            return "Red"
        elif remaining_days <= 4:
            return "Amber"
        else:
            return "Green"
    except Exception as e:
        print(f"Error calculating health: {e}")
        return "Green"


def get_project_file_path(project_id: int):
    return os.path.join(DATA_DIR, f"{project_id}.json")

def read_project_data(project_id: int):
    path = get_project_file_path(project_id)
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_project_data(project_id: int, data: dict):
    path = get_project_file_path(project_id)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def load_all_projects():
    projects = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r', encoding='utf-8') as f:
                projects.append(json.load(f))
    return projects

def find_request_in_all_projects(request_id: int):
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r', encoding='utf-8') as f:
                proj_data = json.load(f)
            for req in proj_data.get("change_requests", []):
                if req["id"] == request_id:
                    return proj_data, req
    return None, None

# ═══ AUTH ═══
@app.post("/api/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest):
    users_path = os.path.join(os.path.dirname(__file__), "data", "users.json")
    with open(users_path, 'r', encoding='utf-8') as f:
        users = json.load(f)
    user = users.get(request.username.lower())
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"token": f"dummy-jwt-{request.username}", "username": request.username, "role": user["role"], "name": user["name"], "permissions": user.get("permissions", [])}

@app.get("/api/users")
def get_users():
    users_path = os.path.join(os.path.dirname(__file__), "data", "users.json")
    try:
        with open(users_path, 'r', encoding='utf-8') as f:
            users = json.load(f)
            # Return safe user data (no passwords)
            return [{"username": k, "name": v["name"], "role": v["role"]} for k, v in users.items()]
    except Exception as e:
        return []

# ═══ UPLOADS ═══
@app.post("/api/upload")
def upload_file(req: schemas.UploadRequest):
    try:
        header, encoded = req.base64_data.split(",", 1)
        file_ext = req.filename.split(".")[-1]
        unique_name = f"{uuid.uuid4().hex}.{file_ext}"
        path = os.path.join(UPLOAD_DIR, unique_name)
        with open(path, "wb") as f:
            f.write(base64.b64decode(encoded))
        return {"url": f"http://localhost:8000/uploads/{unique_name}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ═══ NOTIFICATIONS ═══
@app.get("/api/notifications")
def get_notifications(role: Optional[str] = None):
    notifs = []
    for proj in load_all_projects():
        # New Project notification (useful for all roles, especially Dev/Manager)
        if proj.get("created_at"):
            notifs.append({"id": f"proj_{proj['id']}", "title": "New Project Created", "desc": proj["title"], "time": proj["created_at"], "project_id": proj["id"], "request_id": None})
            
        for c in proj.get("comments", []):
            if role and c["author_role"].lower() != role.lower():
                notifs.append({"id": f"pcom_{c['id']}", "title": f"Project Update ({c['author_role']})", "desc": f"{proj['title']}: {c['text'][:60]}...", "time": c["created_at"], "project_id": proj["id"], "request_id": None})
                
        for b in proj.get("blockers", []):
            if b.get("status") == "Active":
                notifs.append({"id": f"b_{b['id']}", "title": "Project Blocker", "desc": f"{proj.get('title', 'Project')}: {b['title']}", "time": b["created_at"], "project_id": proj["id"], "request_id": None})
        
        for req in proj.get("change_requests", []):
            req_id = req["id"]
            if req.get("status") != "Completed":
                if req.get("is_blocked"):
                    notifs.append({"id": f"req_{req['id']}", "title": "Blocked Request", "desc": f"{req['title']}: {req.get('blocker_reason')}", "time": req["updated_at"] or req["created_at"], "project_id": proj["id"], "request_id": req_id})
                if req.get("escalated"):
                    notifs.append({"id": f"esc_{req['id']}", "title": "Escalated Request", "desc": f"{req['title']} requires attention.", "time": req["updated_at"] or req["created_at"], "project_id": proj["id"], "request_id": req_id})
                if req.get("status") == "Pending":
                    notifs.append({"id": f"new_{req['id']}", "title": "New Request", "desc": f"Pending: {req['title']}", "time": req["created_at"], "project_id": proj["id"], "request_id": req_id})
            
            # Thread Comments Notification
            for c in req.get("comments", []):
                # Notify everyone except the person who sent it
                if role and c["author_role"].lower() != role.lower():
                    notifs.append({"id": f"com_{c['id']}", "title": f"New Reply ({c['author_role']})", "desc": f"{req['title']}: {c['text'][:60]}...", "time": c["created_at"], "project_id": proj["id"], "request_id": req_id})
        
        for m in proj.get("mentions", []):
            if not role or role.lower() in m["role"].lower() or m["role"].lower() in role.lower():
                notifs.append({"id": f"ment_{m['id']}", "title": m["title"], "desc": f"In {proj.get('title', 'Project')}", "time": m["created_at"], "project_id": proj["id"], "request_id": m.get("request_id")})

    notifs.sort(key=lambda x: x["time"], reverse=True)
    return notifs[:25]

# ═══ PROJECTS CRUD ═══
@app.get("/api/projects", response_model=List[schemas.Project])
def read_projects(include_archived: bool = False):
    projects = load_all_projects()
    if not include_archived:
        projects = [p for p in projects if p.get("status") != "Archived"]
    projects.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return projects

@app.post("/api/projects", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate):
    project_id = int(time.time() * 1000)
    now = datetime.utcnow()
    deadline = project.deadline
    if not deadline and project.estimated_days_client:
        deadline = (now + timedelta(days=project.estimated_days_client)).isoformat()
        
    new_project = {
        "id": project_id, "title": project.title, "description": project.description,
        "client": project.client, "developers": project.developers or [], "status": project.status or "Active",
        "complexity_client": project.complexity_client, "complexity_dev": None, "agreed_complexity": None,
        "estimated_days_client": project.estimated_days_client, "estimated_days_dev": None,
        "agreed_days": None, "client_approved_estimate": None,
        "deadline": deadline,
        "attachments": project.attachments or [],
        "comments": [],
        "created_at": now.isoformat(), "change_requests": [], "blockers": []
    }
    write_project_data(project_id, new_project)
    return new_project

@app.put("/api/projects/{project_id}", response_model=schemas.Project)
async def update_project(project_id: int, project_update: schemas.ProjectUpdate, role: str = "System"):
    project = read_project_data(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.dict(exclude_unset=True)

    if "agreed_days" in update_data and update_data["agreed_days"] is not None:
        update_data["deadline"] = (datetime.utcnow() + timedelta(days=update_data["agreed_days"])).isoformat()
    elif "estimated_days_client" in update_data and update_data["estimated_days_client"] is not None and not project.get("agreed_days") and not update_data.get("agreed_days"):
        try:
            created_at_dt = datetime.fromisoformat(project["created_at"].replace('Z', ''))
            update_data["deadline"] = (created_at_dt + timedelta(days=update_data["estimated_days_client"])).isoformat()
        except Exception:
            update_data["deadline"] = (datetime.utcnow() + timedelta(days=update_data["estimated_days_client"])).isoformat()

    if "estimated_days_dev" in update_data or "estimated_days_client" in update_data:
        pass # Client explicit approval required
            
    if "complexity_dev" in update_data or "complexity_client" in update_data:
        pass # Client explicit approval required

    # Generate system comments for negotiations
    negotiation_fields = {
        "estimated_days_client": "Client Estimate (Days)",
        "estimated_days_dev": "Dev Estimate (Days)",
        "agreed_days": "Agreed Delivery Days",
        "complexity_client": "Client Complexity",
        "complexity_dev": "Dev Complexity",
        "agreed_complexity": "Agreed Complexity"
    }
    
    for k, label in negotiation_fields.items():
        if k in update_data and update_data[k] != project.get(k):
            project.setdefault("comments", []).append({
                "id": int(time.time() * 1000) + hash(k) % 1000,
                "request_id": 0, # 0 means project level
                "author_role": role,
                "text": f"System: {role} updated Project {label} to {update_data[k]}",
                "created_at": datetime.utcnow().isoformat()
            })

    for key, value in update_data.items():
        project[key] = value

    write_project_data(project_id, project)
    await manager.broadcast({"type": "UPDATE"})
    return project

@app.post("/api/projects/{project_id}/comments", response_model=schemas.Comment)
async def create_project_comment(project_id: int, comment: schemas.CommentCreate):
    project = read_project_data(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    comment_id = int(time.time() * 1000)
    new_comment = {
        "id": comment_id,
        "request_id": 0,
        "author_role": comment.author_role,
        "text": comment.text,
        "created_at": datetime.utcnow().isoformat()
    }
    project.setdefault("comments", []).append(new_comment)
    write_project_data(project_id, project)
    await manager.broadcast({"type": "UPDATE"})
    return new_comment

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int):
    data = read_project_data(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    # Ensure blockers key exists for older projects
    data.setdefault("blockers", [])
    return data

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int):
    path = get_project_file_path(project_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Project not found")
    os.remove(path)
    return {"message": "Project deleted successfully"}

# ═══ CHANGE REQUESTS ═══
@app.get("/api/projects/{project_id}/requests", response_model=List[schemas.ChangeRequest])
def read_project_requests(project_id: int):
    data = read_project_data(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return data.get("change_requests", [])

@app.post("/api/projects/{project_id}/requests", response_model=schemas.ChangeRequest)
async def create_project_request(project_id: int, request: schemas.ChangeRequestCreate):
    data = read_project_data(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    request_id = int(time.time() * 1000)
    now = datetime.utcnow()
    deadline = request.deadline
    if not deadline and request.estimated_days_client:
        deadline = (now + timedelta(days=request.estimated_days_client)).isoformat()
        
    new_request = {
        "id": request_id, "project_id": project_id,
        "title": request.title, "request_text": request.request_text,
        "priority": request.priority or "Medium", "type": request.type or "Enhancement",
        "status": "Pending", 
        "complexity_client": request.complexity_client, "complexity_dev": None, "agreed_complexity": None,
        "estimated_days_client": request.estimated_days_client, "estimated_days_dev": None,
        "agreed_days": None, "progress_percent": 0,
        "deadline": deadline, "assigned_to": None, "dev_notes": None,
        "hours_spent": 0, "is_blocked": False, "blocker_reason": None,
        "client_approved_estimate": None, "escalated": False, "tags": None,
        "attachments": request.attachments or [],
        "created_at": now.isoformat(), "updated_at": now.isoformat(),
        "completed_at": None, "comments": [], "subtasks": [], "time_logs": []
    }
    data.setdefault("change_requests", []).append(new_request)
    write_project_data(project_id, data)
    log_event("NEW_CHANGE_REQUEST", {"project_id": project_id, "request_id": request_id, "title": new_request["title"]})
    await manager.broadcast({"type": "UPDATE"})
    return new_request

@app.put("/api/requests/{request_id}", response_model=schemas.ChangeRequest)
async def update_request(request_id: int, request_update: schemas.ChangeRequestUpdate, role: str = "System"):
    found_project, found_request = find_request_in_all_projects(request_id)
    if not found_request:
        raise HTTPException(status_code=404, detail="Request not found")

    update_data = request_update.dict(exclude_unset=True)

    if "agreed_days" in update_data and update_data["agreed_days"] is not None:
        update_data["deadline"] = (datetime.utcnow() + timedelta(days=update_data["agreed_days"])).isoformat()
    else:
        est_days = None
        if "estimated_days_client" in update_data and update_data["estimated_days_client"] is not None:
            est_days = update_data["estimated_days_client"]
        elif "estimated_days_dev" in update_data and update_data["estimated_days_dev"] is not None:
            est_days = update_data["estimated_days_dev"]
            
        if est_days is not None and not found_request.get("agreed_days") and not update_data.get("agreed_days"):
            try:
                created_at_dt = datetime.fromisoformat(found_request["created_at"].replace('Z', ''))
                update_data["deadline"] = (created_at_dt + timedelta(days=est_days)).isoformat()
            except Exception:
                update_data["deadline"] = (datetime.utcnow() + timedelta(days=est_days)).isoformat()

    if "status" in update_data and update_data["status"] != found_request.get("status"):
        new_status = update_data["status"]
        if new_status == "Completed":
            found_request["completed_at"] = datetime.utcnow().isoformat()
            if found_request.get("progress_percent", 0) < 100:
                found_request["progress_percent"] = 100
        else:
            found_request["completed_at"] = None
            
        if "comments" not in found_request:
            found_request["comments"] = []
        found_request["comments"].append({
            "id": int(datetime.utcnow().timestamp() * 1000),
            "text": f"System: Task moved to **{new_status}** by {role}. @Manager @Client please take note.",
            "author_role": "System",
            "created_at": datetime.utcnow().isoformat() + "Z"
        })

    def has_permission_by_role(role_name: str, permission: str) -> bool:
        users_path = os.path.join(os.path.dirname(__file__), "data", "users.json")
        try:
            with open(users_path, 'r', encoding='utf-8') as f:
                users = json.load(f)
            for user in users.values():
                if user.get("role") == role_name and permission in user.get("permissions", []):
                    return True
        except:
            pass
        return False

    if "client_approved_estimate" in update_data and update_data["client_approved_estimate"]:
        if not has_permission_by_role(role, "can_approve_estimates"):
            raise HTTPException(status_code=403, detail="Permission denied: You cannot approve estimates.")
            
    if "agreed_days" in update_data:
        if not has_permission_by_role(role, "can_approve_estimates"):
            raise HTTPException(status_code=403, detail="Permission denied: You cannot agree on estimates.")

    # Generate system comments for negotiations
    negotiation_fields = {
        "estimated_days_client": "Client Estimate (Days)",
        "estimated_days_dev": "Dev Estimate (Days)",
        "agreed_days": "Agreed Delivery Days",
        "complexity_client": "Client Complexity",
        "complexity_dev": "Dev Complexity",
        "agreed_complexity": "Agreed Complexity"
    }
    
    for k, label in negotiation_fields.items():
        if k in update_data and update_data[k] != found_request.get(k):
            found_request.setdefault("comments", []).append({
                "id": int(time.time() * 1000) + hash(k) % 1000,
                "request_id": request_id,
                "author_role": role,
                "text": f"System: {role} updated {label} to {update_data[k]}",
                "created_at": datetime.utcnow().isoformat()
            })

    for key, value in update_data.items():
        found_request[key] = value

    found_request["updated_at"] = datetime.utcnow().isoformat()
    write_project_data(found_project["id"], found_project)
    log_event("UPDATE_CHANGE_REQUEST", {"request_id": found_request["id"], "status": found_request["status"], "fields": list(update_data.keys())})
    await manager.broadcast({"type": "UPDATE"})
    return found_request

# ═══ COMMENTS ═══
@app.post("/api/requests/{request_id}/comments", response_model=schemas.Comment)
async def create_comment(request_id: int, comment: schemas.CommentCreate):
    found_project, found_request = find_request_in_all_projects(request_id)
    if not found_request:
        raise HTTPException(status_code=404, detail="Request not found")
    comment_id = int(time.time() * 1000)
    new_comment = {
        "id": comment_id, "request_id": request_id,
        "author_role": comment.author_role, "text": comment.text,
        "created_at": datetime.utcnow().isoformat()
    }
    found_request.setdefault("comments", []).append(new_comment)
    
    # Check for mentions
    mention_match = re.search(r'@(Manager|Developer|Cozentus|Client|AAW)\b', comment.text, re.IGNORECASE)
    if mention_match:
        mention_role = mention_match.group(1).capitalize()
        # Map developer to Cozentus and client to AAW for notification logic
        if mention_role == "Developer": mention_role = "Cozentus"
        if mention_role == "Client": mention_role = "AAW"
        
        found_project.setdefault("mentions", []).append({
            "id": int(time.time() * 1000),
            "role": mention_role,
            "request_id": request_id,
            "author": new_comment["author_role"],
            "created_at": new_comment["created_at"],
            "title": f"Mentioned by {new_comment['author_role']}"
        })

    write_project_data(found_project["id"], found_project)
    log_event("NEW_COMMENT", {"request_id": request_id, "author_role": new_comment["author_role"]})
    await manager.broadcast({"type": "UPDATE"})
    return new_comment

@app.post("/api/requests/{request_id}/blocker_comments", response_model=schemas.Comment)
async def create_request_blocker_comment(request_id: int, comment: schemas.CommentCreate):
    found_project, found_request = find_request_in_all_projects(request_id)
    if not found_request:
        raise HTTPException(status_code=404, detail="Request not found")
    comment_id = int(time.time() * 1000)
    new_comment = {
        "id": comment_id, "request_id": request_id,
        "author_role": comment.author_role, "text": comment.text,
        "created_at": datetime.utcnow().isoformat()
    }
    found_request.setdefault("blocker_comments", []).append(new_comment)
    
    # Notification
    found_project.setdefault("notifications", []).append({
        "id": int(time.time() * 1000),
        "project_id": found_project["id"],
        "request_id": request_id,
        "author": comment.author_role,
        "created_at": new_comment["created_at"],
        "title": f"Blocker Mentioned by {comment.author_role}"
    })
    
    write_project_data(found_project["id"], found_project)
    log_event("NEW_BLOCKER_COMMENT", {"request_id": request_id, "author_role": new_comment["author_role"]})
    await manager.broadcast({"type": "UPDATE"})
    return new_comment

# ═══ BLOCKERS ═══
@app.get("/api/projects/{project_id}/blockers", response_model=List[schemas.Blocker])
def get_blockers(project_id: int):
    data = read_project_data(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return data.get("blockers", [])

@app.post("/api/projects/{project_id}/blockers", response_model=schemas.Blocker)
async def create_blocker(project_id: int, blocker: schemas.BlockerCreate, role: str = "Cozentus"):
    data = read_project_data(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    blocker_id = int(time.time() * 1000)
    new_blocker = {
        "id": blocker_id, "project_id": project_id,
        "title": blocker.title, "description": blocker.description,
        "severity": blocker.severity or "Medium",
        "reported_by": role,
        "related_request_title": blocker.related_request_title,
        "status": "Active",
        "created_at": datetime.utcnow().isoformat(),
        "resolved_at": None, "resolution_notes": None,
        "comments": []
    }
    data.setdefault("blockers", []).append(new_blocker)
    write_project_data(project_id, data)
    log_event("NEW_BLOCKER", {"project_id": project_id, "blocker_id": blocker_id, "title": new_blocker["title"]})
    await manager.broadcast({"type": "UPDATE"})
    return new_blocker

@app.put("/api/blockers/{blocker_id}", response_model=schemas.Blocker)
async def update_blocker(blocker_id: int, update: schemas.BlockerUpdate):
    """Resolve or update a blocker. Searched across all projects."""
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r', encoding='utf-8') as f:
            proj_data = json.load(f)
        for blocker in proj_data.get("blockers", []):
            if blocker["id"] == blocker_id:
                update_dict = update.dict(exclude_unset=True)
                if update_dict.get("status") == "Resolved" and blocker.get("status") != "Resolved":
                    blocker["resolved_at"] = datetime.utcnow().isoformat()
                for k, v in update_dict.items():
                    blocker[k] = v
                write_project_data(proj_data["id"], proj_data)
                log_event("UPDATE_BLOCKER", {"blocker_id": blocker_id, "status": blocker["status"]})
                await manager.broadcast({"type": "UPDATE"})
                return blocker
    raise HTTPException(status_code=404, detail="Blocker not found")

@app.post("/api/blockers/{blocker_id}/comments", response_model=schemas.Comment)
async def add_blocker_comment(blocker_id: int, comment: schemas.CommentCreate):
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r', encoding='utf-8') as f:
            proj_data = json.load(f)
        for blocker in proj_data.get("blockers", []):
            if blocker["id"] == blocker_id:
                new_comment = {
                    "id": int(time.time() * 1000),
                    "blocker_id": blocker_id,
                    "author_role": comment.author_role,
                    "text": comment.text,
                    "created_at": datetime.utcnow().isoformat()
                }
                blocker.setdefault("comments", []).append(new_comment)
                
                # Notification
                proj_data.setdefault("notifications", []).append({
                    "id": int(time.time() * 1000),
                    "project_id": proj_data["id"],
                    "blocker_id": blocker_id,
                    "author": comment.author_role,
                    "created_at": new_comment["created_at"],
                    "title": f"Blocker Mentioned by {comment.author_role}"
                })
                
                write_project_data(proj_data["id"], proj_data)
                log_event("NEW_BLOCKER_COMMENT", {"blocker_id": blocker_id, "author_role": comment.author_role})
                await manager.broadcast({"type": "UPDATE"})
                return new_comment
    raise HTTPException(status_code=404, detail="Blocker not found")

# ═══ ACTIVITY FEED ═══
@app.get("/api/activity")
def get_activity_feed(limit: int = 20):
    projects = load_all_projects()
    activities = []
    for proj in projects:
        for req in proj.get("change_requests", []):
            activities.append({
                "type": "request_created", "project": proj["title"], "project_id": proj["id"],
                "request_title": req["title"], "request_id": req["id"],
                "timestamp": req["created_at"], "detail": f"New {req['type']}: {req['title']}"
            })
            for c in req.get("comments", []):
                activities.append({
                    "type": "comment", "project": proj["title"], "project_id": proj["id"],
                    "request_title": req["title"], "request_id": req["id"],
                    "author": c["author_role"], "timestamp": c["created_at"],
                    "detail": c["text"][:120] + ("..." if len(c["text"]) > 120 else "")
                })
            if req.get("completed_at"):
                activities.append({
                    "type": "completed", "project": proj["title"], "project_id": proj["id"],
                    "request_title": req["title"], "request_id": req["id"],
                    "timestamp": req["completed_at"], "detail": f"Resolved: {req['title']}"
                })
        # Blocker activities
        for bl in proj.get("blockers", []):
            activities.append({
                "type": "blocker", "project": proj["title"], "project_id": proj["id"],
                "request_title": bl["title"], "request_id": bl["id"],
                "author": bl.get("reported_by", "Dev"), "timestamp": bl["created_at"],
                "detail": f"🚫 Blocker: {bl['title']}"
            })

    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return activities[:limit]

# ═══ ANALYTICS ═══
@app.get("/api/analytics/metrics")
def get_analytics_metrics():
    projects = load_all_projects()
    all_requests = []
    for proj in projects:
        all_requests.extend(proj.get("change_requests", []))

    total = len(all_requests)
    completed = [r for r in all_requests if r.get("status") == "Completed"]
    pending = [r for r in all_requests if r.get("status") == "Pending"]
    in_progress = [r for r in all_requests if r.get("status") == "In Progress"]

    resolution_times = []
    for r in completed:
        c_at, cr_at = r.get("completed_at"), r.get("created_at")
        if c_at and cr_at:
            try:
                t1 = datetime.fromisoformat(cr_at.replace('Z', ''))
                t2 = datetime.fromisoformat(c_at.replace('Z', ''))
                resolution_times.append((t2 - t1).total_seconds() / 86400)
            except: pass
    avg_resolution = round(sum(resolution_times) / len(resolution_times), 2) if resolution_times else 0

    complexity_counts = {"Low": 0, "Medium": 0, "High": 0, "Unassigned": 0}
    for r in all_requests:
        comp = r.get("complexity")
        complexity_counts[comp if comp in complexity_counts else "Unassigned"] += 1

    priority_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for r in all_requests:
        pri = r.get("priority", "Medium")
        if pri in priority_counts: priority_counts[pri] += 1

    type_counts = {}
    for r in all_requests:
        t = r.get("type", "Enhancement")
        type_counts[t] = type_counts.get(t, 0) + 1

    per_project_stats = []
    project_health_counts = {"Green": 0, "Amber": 0, "Red": 0}
    for proj in projects:
        reqs = proj.get("change_requests", [])
        active_reqs = [r for r in reqs if r.get("status") != "Completed"]
        avg_progress = round(sum(r.get("progress_percent", 0) for r in active_reqs) / len(active_reqs)) if active_reqs else 0
        total_hours = sum(r.get("hours_spent", 0) or 0 for r in reqs)
        active_blockers = len([b for b in proj.get("blockers", []) if b.get("status") == "Active"])
        health = calculate_health_status(proj.get("created_at"), proj.get("deadline"))
        project_health_counts[health] = project_health_counts.get(health, 0) + 1
        per_project_stats.append({
            "project_id": proj.get("id"), "project_title": proj.get("title", "Unknown"),
            "total": len(reqs),
            "completed": len([r for r in reqs if r.get("status") == "Completed"]),
            "in_progress": len([r for r in reqs if r.get("status") == "In Progress"]),
            "pending": len([r for r in reqs if r.get("status") == "Pending"]),
            "critical": len([r for r in reqs if r.get("priority") == "Critical" and r.get("status") != "Completed"]),
            "avg_progress": avg_progress, "total_hours": total_hours,
            "active_blockers": active_blockers,
            "health": health,
            "deadline": proj.get("deadline")
        })

    estimation_data = []
    for r in all_requests:
        c_est, d_est = r.get("estimated_days_client"), r.get("estimated_days_dev")
        if c_est is not None and d_est is not None:
            estimation_data.append({
                "title": r.get("title", ""), "client": c_est, "dev": d_est,
                "agreed": r.get("agreed_days"), "variance": abs(c_est - d_est)
            })
    avg_variance = round(sum(e["variance"] for e in estimation_data) / len(estimation_data), 1) if estimation_data else 0

    now_str = datetime.utcnow().isoformat()[:10]
    overdue = len([r for r in all_requests if r.get("deadline") and r.get("status") != "Completed" and r["deadline"] < now_str])
    blocked = len([r for r in all_requests if r.get("is_blocked")])
    escalated = len([r for r in all_requests if r.get("escalated")])
    total_hours = sum(r.get("hours_spent", 0) or 0 for r in all_requests)

    # Blocker stats
    all_blockers = []
    for proj in projects:
        all_blockers.extend(proj.get("blockers", []))
    active_blockers = len([b for b in all_blockers if b.get("status") == "Active"])
    resolved_blockers = len([b for b in all_blockers if b.get("status") == "Resolved"])

    active = [r for r in all_requests if r.get("status") != "Completed"]
    avg_active_progress = round(sum(r.get("progress_percent", 0) for r in active) / len(active)) if active else 0
    total_comments = sum(len(r.get("comments", [])) for r in all_requests)
    avg_comments = round(total_comments / total, 1) if total > 0 else 0
    with_estimates = len([r for r in all_requests if r.get("estimated_days_client") or r.get("estimated_days_dev")])
    agreed_count = len([r for r in all_requests if r.get("agreed_days")])

    assignee_workload = {}
    for r in all_requests:
        assignee = r.get("assigned_to")
        if assignee and r.get("status") != "Completed":
            assignee_workload.setdefault(assignee, {"name": assignee, "count": 0, "hours": 0, "est_days": 0})
            assignee_workload[assignee]["count"] += 1
            assignee_workload[assignee]["hours"] += r.get("hours_spent", 0) or 0
            assignee_workload[assignee]["est_days"] += r.get("estimated_days_dev", 0) or 0

    daily_logs = {}
    for r in all_requests:
        for log in r.get("time_logs", []):
            d = log.get("date", "")
            if d: daily_logs[d] = daily_logs.get(d, 0) + log.get("hours", 0)
            
    sorted_dates = sorted(daily_logs.keys())
    burndown_data = []
    cumulative = 0
    for d in sorted_dates:
        cumulative += daily_logs[d]
        burndown_data.append({"date": d, "hours": daily_logs[d], "cumulative_hours": cumulative})

    return {
        "total": total, "completed": len(completed), "pending": len(pending),
        "in_progress": len(in_progress), "avg_resolution_days": avg_resolution,
        "complexity_distribution": complexity_counts, "priority_distribution": priority_counts,
        "type_distribution": type_counts, "per_project_stats": per_project_stats,
        "project_health_counts": project_health_counts,
        "overdue": overdue, "blocked": blocked, "escalated": escalated,
        "total_hours": round(total_hours, 1),
        "active_blockers": active_blockers, "resolved_blockers": resolved_blockers,
        "total_blockers": active_blockers + resolved_blockers,
        "avg_active_progress": avg_active_progress,
        "total_comments": total_comments, "avg_comments_per_request": avg_comments,
        "with_estimates": with_estimates, "agreed_count": agreed_count,
        "avg_estimation_variance": avg_variance, "estimation_data": estimation_data,
        "total_projects": len(projects),
        "assignee_workload": list(assignee_workload.values()),
        "burndown_data": burndown_data
    }
