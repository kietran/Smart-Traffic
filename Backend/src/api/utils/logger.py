import logging
from rich.logging import RichHandler
from rich.console import Console
import os
from config import LOGGING_LEVEL

logging.basicConfig(
    level=LOGGING_LEVEL,
    format="""{"log.level" : "%(levelname)s", "log.description" : "%(message)s", "timestamps" : "%(asctime)s"}""",
    handlers=[logging.FileHandler("app.log", mode="w")],
)

console_handler = RichHandler(markup=True, console=Console())
console_handler.setLevel(LOGGING_LEVEL)
console_handler.setFormatter(
    logging.Formatter(
        "%(message)s",
    )
)

logger = logging.getLogger("rich")
logger.addHandler(console_handler)
