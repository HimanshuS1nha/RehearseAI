from user_agents import parse


def parse_user_agent(user_agent: str | None):
    if not user_agent:
        return {"browser_name": None, "os_name": None, "device_type": None}

    parsed = parse(user_agent)

    if parsed.is_bot:
        device_type = "bot"
    elif parsed.is_tablet:
        device_type = "tablet"
    elif parsed.is_mobile:
        device_type = "mobile"
    elif parsed.is_pc:
        device_type = "desktop"
    else:
        device_type = None

    return {
        "browser_name": None if parsed.browser.family == "Other" else parsed.browser.family,
        "os_name": None if parsed.os.family == "Other" else parsed.os.family,
        "device_type": device_type,
    }
