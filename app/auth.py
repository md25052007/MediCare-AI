import bcrypt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from . import config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password: str) -> str:
    """Hashes a password with a 72-byte safety limit for Bcrypt."""
    # 1. Encode to bytes to check actual byte length (not just character count)
    print(f"DEBUG: Hashing string: {password}") # Add this!
    print(f"DEBUG: Length: {len(password)}")
    pw_bytes = password.encode('utf-8')
    
    # 2. Truncate to the first 72 bytes
    truncated_pw = pw_bytes[:72]
    
    # 3. Hash the truncated bytes
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(truncated_pw, salt)
    
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored hashed version."""
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Generates a secure JWT token for the user upon login."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    """FastAPI Dependency: Decodes the token and extracts user info."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: str = payload.get("user_id")
        
        if username is None:
            raise credentials_exception
            
        return {"username": username, "role": role, "user_id": user_id}
    except JWTError:
        raise credentials_exception