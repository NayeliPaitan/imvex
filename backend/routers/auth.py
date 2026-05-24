from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import timedelta
import base64, imghdr

from database import get_db
import models, schemas
from auth import verify_password, create_access_token, get_current_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    token = create_access_token({"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return schemas.Token(
        access_token=token, token_type="bearer",
        role=user.role.value, company_id=user.company_id,
        full_name=user.full_name or user.username,
        avatar_url=user.avatar_url,
    )


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if "full_name" in payload:
        current_user.full_name = payload["full_name"]
    if "avatar_url" in payload:
        current_user.avatar_url = payload["avatar_url"]
    if "password" in payload and payload["password"]:
        current_user.hashed_password = get_password_hash(payload["password"])
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Max 2MB
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 2MB")

    # Detect type
    img_type = imghdr.what(None, h=contents)
    if img_type not in ("jpeg", "png", "gif", "webp"):
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG, PNG o WEBP")

    # Store as base64 data URL
    b64 = base64.b64encode(contents).decode("utf-8")
    mime = "image/jpeg" if img_type == "jpeg" else f"image/{img_type}"
    data_url = f"data:{mime};base64,{b64}"

    current_user.avatar_url = data_url
    db.commit()
    db.refresh(current_user)
    return current_user
