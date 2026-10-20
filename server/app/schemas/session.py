from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    browser_name: str | None
    os_name: str | None
    device_type: str | None
    ip_address: str | None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    is_current: bool = False
