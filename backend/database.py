import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


if DATABASE_URL and DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "mysql://",
        "mysql+pymysql://",
        1
    )


# Remove Aiven's ssl-mode query parameter because
# PyMySQL does not accept it as a connection argument.
if DATABASE_URL and "ssl-mode=REQUIRED" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace(
        "ssl-mode=REQUIRED",
        ""
    )

if DATABASE_URL and DATABASE_URL.endswith("?"):
    DATABASE_URL = DATABASE_URL[:-1]


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()