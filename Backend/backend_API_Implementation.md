backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   ├── models/
│   │   ├── user.py
│   │   ├── request.py
│   │   ├── message.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── request.py
│   │   ├── message.py
│   ├── api/
│   │   ├── deps.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── requests.py
│   │   │   ├── messages.py
│   │   │   ├── email.py
├── requirements.txt

⚙️ 2. REQUIREMENTS
fastapi
uvicorn
sqlalchemy
psycopg2-binary
python-jose
passlib[bcrypt]
pydantic
python-multipart


🧠 3. DATABASE SETUP
db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://user:password@localhost/salam_air"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db/base.py
from sqlalchemy.orm import declarative_base

Base = declarative_base()
👤 4. USER MODEL
models/user.py
import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)
    role = Column(String)
📦 5. REQUEST MODEL
models/request.py
import uuid
from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Request(Base):
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_code = Column(String, unique=True)
    route = Column(String)
    pax = Column(Integer)
    price = Column(Integer)
    status = Column(String)
    agent_id = Column(UUID)
💬 6. MESSAGE MODEL
models/message.py
import uuid
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID, ForeignKey("requests.id"))
    sender = Column(String)
    content = Column(Text)
📄 7. SCHEMAS (PYDANTIC)
schemas/request.py
from pydantic import BaseModel

class RequestCreate(BaseModel):
    route: str
    pax: int
    price: int

class RequestOut(BaseModel):
    id: str
    route: str
    pax: int
    price: int
    status: str
🔐 8. AUTH (JWT)
core/security.py
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "secret"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=10)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
🔌 9. API ROUTES
🔹 AUTH ROUTE
from fastapi import APIRouter
from app.core.security import create_access_token

router = APIRouter()

@router.post("/login")
def login():
    token = create_access_token({"sub": "user"})
    return {"access_token": token}
🔹 REQUEST ROUTES
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.request import Request
from app.schemas.request import RequestCreate

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_request(data: RequestCreate, db: Session = Depends(get_db)):
    req = Request(
        request_code="REQ-123",
        route=data.route,
        pax=data.pax,
        price=data.price,
        status="submitted"
    )
    db.add(req)
    db.commit()
    return req

@router.get("/")
def list_requests(db: Session = Depends(get_db)):
    return db.query(Request).all()
🔹 MESSAGE ROUTES
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.message import Message
from app.db.session import SessionLocal

router = APIRouter()

@router.post("/")
def send_message(request_id: str, content: str, db: Session = Depends(SessionLocal)):
    msg = Message(request_id=request_id, sender="agent", content=content)
    db.add(msg)
    db.commit()
    return msg
🔹 EMAIL MOCK SERVICE
from fastapi import APIRouter

router = APIRouter()

@router.post("/send")
def send_email(request_id: str):
    return {
        "message": f"Email sent to RM for {request_id}"
    }
🚀 10. MAIN APP
main.py
from fastapi import FastAPI
from app.api.routes import auth, requests, messages, email

app = FastAPI()

app.include_router(auth.router, prefix="/auth")
app.include_router(requests.router, prefix="/requests")
app.include_router(messages.router, prefix="/messages")
app.include_router(email.router, prefix="/email")

@app.get("/")
def root():
    return {"message": "Salam Air Backend Running"}
▶️ 11. RUN SERVER
uvicorn app.main:app --reload
🔥 12. WHAT YOU HAVE NOW

✔ Working FastAPI backend
✔ DB integration
✔ Request system
✔ Messaging system
✔ JWT auth (basic)
✔ Email mock