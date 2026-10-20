import hashlib

from fastapi.concurrency import run_in_threadpool
from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()


# Argon2 is deliberately CPU-heavy; running it in the thread pool keeps it from
# blocking the event loop (argon2-cffi releases the GIL while it hashes).
async def hash_password(plain_password: str):
    return await run_in_threadpool(password_hasher.hash, plain_password)


async def verify_password(plain_password: str, hashed_password: str):
    return await run_in_threadpool(
        password_hasher.verify, plain_password, hashed_password
    )


async def verify_and_update_password(plain_password: str, hashed_password: str):
    return await run_in_threadpool(
        password_hasher.verify_and_update, plain_password, hashed_password
    )


def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()
