from models import SystemLog

async def create_log(username: str, action: str, target: str, details: str = ""):
    """
    Hàm helper để ghi lại nhật ký hoạt động vào MongoDB
    """
    log = SystemLog(
        username=username,
        action=action,
        target=target,
        details=details
    )
    await log.create()