from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import hashlib
from datetime import datetime

try:
    import jwt as pyjwt
except ImportError:
    import json
    import base64
    import hmac
    import time

    class SimpleJWT:
        @staticmethod
        def encode(payload, secret, algorithm):
            payload_str = json.dumps(payload, separators=(",", ":"))
            payload_b64 = base64.urlsafe_b64encode(payload_str.encode()).decode().rstrip("=")
            header_b64 = base64.urlsafe_b64encode(b'{"typ":"JWT","alg":"HS256"}').decode().rstrip("=")
            message = f"{header_b64}.{payload_b64}"
            signature = base64.urlsafe_b64encode(
                hmac.new(secret.encode(), message.encode(), "sha256").digest()
            ).decode().rstrip("=")
            return f"{message}.{signature}"

        @staticmethod
        def decode(token, secret, algorithms):
            try:
                parts = token.split(".")
                if len(parts) != 3:
                    return None

                payload_b64 = parts[1]
                padding = 4 - len(payload_b64) % 4
                if padding != 4:
                    payload_b64 += "=" * padding

                payload_str = base64.urlsafe_b64decode(payload_b64).decode()
                payload = json.loads(payload_str)

                if "exp" in payload and payload["exp"] < int(time.time()):
                    return None

                return payload
            except Exception:
                return None

    pyjwt = SimpleJWT()


app = FastAPI(
    title="Business Auth Service API",
    description="Authentication-only service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "vben-admin-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720


# ========= 统一返回结构 =========
def ok(data=None, message="ok"):
    return {"code": 0, "message": message, "data": data}


def fail(message="error", code=400, data=None):
    return JSONResponse(
        status_code=code,
        content={"code": code, "message": message, "data": data},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return fail(message=str(exc.detail), code=exc.status_code)


# ========= 登录相关 =========
class LoginRequest(BaseModel):
    username: str
    password: str


MOCK_USERS = [
    {
        "id": 0,
        "username": "vben",
        "password": hashlib.md5("123456".encode()).hexdigest(),
        "realName": "Vben Admin",
        "roles": ["super"],
        "homePath": "/analytics",
    },
    {
        "id": 1,
        "username": "admin",
        "password": hashlib.md5("123456".encode()).hexdigest(),
        "realName": "Admin",
        "roles": ["admin"],
        "homePath": "/system/defect-detection",
    },
    {
        "id": 2,
        "username": "user",
        "password": hashlib.md5("123456".encode()).hexdigest(),
        "realName": "User",
        "roles": ["user"],
        "homePath": "/system/defect-detection",
    },
]

MOCK_CODES = {
    "vben": ["AC_100100", "AC_100110", "AC_100120", "AC_100010"],
    "admin": ["AC_100010", "AC_100020", "AC_100030"],
    "user": ["AC_1000001", "AC_1000002"],
}


def _now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ========= 角色内存数据 =========
MOCK_ROLES = [
    {
        "id": 1,
        "name": "超级管理员",
        "code": "super",
        "status": 1,
        "description": "系统最高权限",
        "createdAt": _now_str(),
    },
    {
        "id": 2,
        "name": "管理员",
        "code": "admin",
        "status": 1,
        "description": "系统管理权限",
        "createdAt": _now_str(),
    },
    {
        "id": 3,
        "name": "普通用户",
        "code": "user",
        "status": 1,
        "description": "基础访问权限",
        "createdAt": _now_str(),
    },
]
ROLE_ID_SEQ = 4


# ========= 菜单（你原来的不动） =========
MOCK_MENUS = {
    "vben": [
        {
            "meta": {"order": 1, "title": "System", "icon": "carbon:settings"},
            "name": "System",
            "path": "/system",
            "redirect": "/system/defect-detection",
            "children": [
                {
                    "name": "DefectDetection",
                    "path": "/system/defect-detection",
                    "component": "/system/defect-detection/index",
                    "meta": {"icon": "carbon:camera", "title": "page.system.defectDetection"},
                },
                {
                    "name": "ImageDatabase",
                    "path": "/system/image-database",
                    "component": "/system/image-database/index",
                    "meta": {"icon": "lucide:database", "title": "page.system.imageDatabase"},
                },
            ],
        }
    ],
    "admin": [
        {
            "meta": {"order": 1, "title": "System", "icon": "carbon:settings"},
            "name": "System",
            "path": "/system",
            "redirect": "/system/defect-detection",
            "children": [
                {
                    "name": "DefectDetection",
                    "path": "/system/defect-detection",
                    "component": "/system/defect-detection/index",
                    "meta": {"icon": "carbon:camera", "title": "page.system.defectDetection"},
                },
                {
                    "name": "ImageDatabase",
                    "path": "/system/image-database",
                    "component": "/system/image-database/index",
                    "meta": {"icon": "lucide:database", "title": "page.system.imageDatabase"},
                },
            ],
        }
    ],
    "user": [
        {
            "meta": {"order": 1, "title": "System", "icon": "carbon:settings"},
            "name": "System",
            "path": "/system",
            "redirect": "/system/defect-detection",
            "children": [
                {
                    "name": "DefectDetection",
                    "path": "/system/defect-detection",
                    "component": "/system/defect-detection/index",
                    "meta": {"icon": "carbon:camera", "title": "page.system.defectDetection"},
                },
                {
                    "name": "ImageDatabase",
                    "path": "/system/image-database",
                    "component": "/system/image-database/index",
                    "meta": {"icon": "lucide:database", "title": "page.system.imageDatabase"},
                },
            ],
        }
    ],
}


def create_access_token(data: dict):
    import time

    to_encode = data.copy()
    expire = int(time.time()) + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    to_encode.update({"exp": expire})
    return pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    try:
        return pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication scheme")

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    username = payload.get("username")
    user = next((u for u in MOCK_USERS if u["username"] == username), None)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.get("/health")
async def health_check():
    return ok({"status": "healthy", "service": "business-service-auth-only"}, "ok")


@app.post("/auth/login")
async def login(request: LoginRequest):
    password_hash = hashlib.md5(request.password.encode()).hexdigest()
    user = next(
        (u for u in MOCK_USERS if u["username"] == request.username and u["password"] == password_hash),
        None,
    )

    if not user:
        return fail("Invalid username or password", 403)

    access_token = create_access_token(
        {
            "username": user["username"],
            "id": user["id"],
            "roles": user["roles"],
        }
    )

    return ok(
        {
            "id": user["id"],
            "username": user["username"],
            "realName": user["realName"],
            "roles": user["roles"],
            "homePath": user.get("homePath"),
            "accessToken": access_token,
        },
        "success",
    )


@app.post("/auth/refresh")
async def refresh_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    new_token = create_access_token(
        {
            "username": payload.get("username"),
            "id": payload.get("id"),
            "roles": payload.get("roles"),
        }
    )

    return ok(new_token, "success")


@app.post("/auth/logout")
async def logout():
    return ok(None, "success")


@app.get("/user/info")
async def get_user_info(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    return ok(
        {
            "id": user["id"],
            "username": user["username"],
            "realName": user["realName"],
            "roles": user["roles"],
            "homePath": user.get("homePath"),
        },
        "success",
    )


@app.get("/auth/codes")
async def get_user_codes(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    codes = MOCK_CODES.get(user["username"], [])
    return ok(codes, "success")


@app.get("/menu/all")
async def get_user_menus(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    menus = MOCK_MENUS.get(user["username"], [])
    return ok(menus, "success")


# =============================
# 系统管理：角色管理 API
# =============================
class RoleCreateReq(BaseModel):
    name: str
    code: str
    status: int = 1
    description: str = ""


class RoleUpdateReq(BaseModel):
    name: str | None = None
    code: str | None = None
    status: int | None = None
    description: str | None = None


@app.get("/system/roles")
def list_roles():
    return ok(MOCK_ROLES, "ok")


@app.post("/system/roles")
def create_role(req: RoleCreateReq):
    global ROLE_ID_SEQ

    if any(r["code"] == req.code.strip() for r in MOCK_ROLES):
        raise HTTPException(status_code=400, detail="角色编码 code 已存在")

    role = {
        "id": ROLE_ID_SEQ,
        "name": req.name.strip(),
        "code": req.code.strip(),
        "status": req.status,
        "description": (req.description or "").strip(),
        "createdAt": _now_str(),
    }
    ROLE_ID_SEQ += 1
    MOCK_ROLES.append(role)
    return ok(role, "created")


@app.put("/system/roles/{role_id}")
def update_role(role_id: int, req: RoleUpdateReq):
    role = next((r for r in MOCK_ROLES if r["id"] == role_id), None)
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    if req.code and req.code.strip() != role["code"]:
        if any(r["code"] == req.code.strip() for r in MOCK_ROLES):
            raise HTTPException(status_code=400, detail="角色编码 code 已存在")
        role["code"] = req.code.strip()

    if req.name is not None:
        role["name"] = req.name.strip()
    if req.status is not None:
        role["status"] = req.status
    if req.description is not None:
        role["description"] = (req.description or "").strip()

    return ok(role, "updated")


@app.delete("/system/roles/{role_id}")
def delete_role(role_id: int):
    global MOCK_ROLES
    before = len(MOCK_ROLES)
    MOCK_ROLES = [r for r in MOCK_ROLES if r["id"] != role_id]
    if len(MOCK_ROLES) == before:
        raise HTTPException(status_code=404, detail="角色不存在")
    return ok(True, "deleted")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
