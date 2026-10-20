from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
)


class UserBase(BaseModel):
    email: EmailStr = Field(max_length=255)
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]


class RegisterRequest(UserBase):
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def check_passwords_match(cls, value: str, info: ValidationInfo) -> str:
        # password is absent from info.data if it failed its own validation
        if "password" in info.data and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(max_length=128)


class VerifyEmailRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    code: str = Field(pattern=r"^\d{6}$")


class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(max_length=255)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=255)


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)
    confirm_new_password: str = Field(min_length=8, max_length=128)

    @field_validator("confirm_new_password")
    @classmethod
    def check_passwords_match(cls, value: str, info: ValidationInfo) -> str:
        # new_password is absent from info.data if it failed its own validation
        if "new_password" in info.data and value != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_changes(cls, value: str, info: ValidationInfo) -> str:
        if "current_password" in info.data and value == info.data["current_password"]:
            raise ValueError("New password must be different from the current one")
        return value

    @field_validator("confirm_new_password")
    @classmethod
    def check_passwords_match(cls, value: str, info: ValidationInfo) -> str:
        # new_password is absent from info.data if it failed its own validation
        if "new_password" in info.data and value != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return value


class DeleteAccountRequest(BaseModel):
    # Asked again so a session left open on someone else's screen can't
    # delete the account.
    password: str = Field(max_length=128)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class MeResponse(UserResponse):
    model_config = ConfigDict(from_attributes=True)

    # Read from the database: unlike the fields above it changes without a new
    # token, so it can't come from the token's claims.
    interview_credits: int
