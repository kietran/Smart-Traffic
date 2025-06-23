import logging
from rich.logging import RichHandler
import os

LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")

logger = logging.getLogger("rich")
logger.setLevel(LOGGING_LEVEL)
logger.propagate = False 

# Add file handler
file_handler = logging.FileHandler("app.log", mode="w")
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
file_handler.setLevel(LOGGING_LEVEL)
logger.addHandler(file_handler)

console_handler = RichHandler(markup=True)
console_handler.setLevel(LOGGING_LEVEL)
console_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(console_handler)

if __name__ == "__main__":
    logger.debug("This is an debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")