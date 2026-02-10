from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import hashlib

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
    return {"status": "healthy", "service": "business-service-auth-only"}


@app.post("/auth/login")
async def login(request: LoginRequest):
    password_hash = hashlib.md5(request.password.encode()).hexdigest()
    user = next(
        (u for u in MOCK_USERS if u["username"] == request.username and u["password"] == password_hash),
        None,
    )

    if not user:
        return JSONResponse(
            status_code=403,
            content={"code": 403, "message": "Invalid username or password", "data": None},
        )

    access_token = create_access_token(
        {
            "username": user["username"],
            "id": user["id"],
            "roles": user["roles"],
        }
    )

    return {
        "code": 0,
        "message": "success",
        "data": {
            "id": user["id"],
            "username": user["username"],
            "realName": user["realName"],
            "roles": user["roles"],
            "homePath": user.get("homePath"),
            "accessToken": access_token,
        },
    }


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

    return {"code": 0, "message": "success", "data": new_token}


@app.post("/auth/logout")
async def logout():
    return {"code": 0, "message": "success", "data": None}


@app.get("/user/info")
async def get_user_info(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    return {
        "code": 0,
        "message": "success",
        "data": {
            "id": user["id"],
            "username": user["username"],
            "realName": user["realName"],
            "roles": user["roles"],
            "homePath": user.get("homePath"),
        },
    }


@app.get("/auth/codes")
async def get_user_codes(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    codes = MOCK_CODES.get(user["username"], [])
    return {"code": 0, "message": "success", "data": codes}


@app.get("/menu/all")
async def get_user_menus(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    menus = MOCK_MENUS.get(user["username"], [])
    return {"code": 0, "message": "success", "data": menus}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
