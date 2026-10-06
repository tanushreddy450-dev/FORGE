from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so that Base.metadata is populated for create_all / Alembic.
# These imports must happen after Base is defined.
# noqa: F401, E402 — intentional late imports

def _import_models() -> None:
    import app.models.user  # noqa: F401
    import app.models.topic  # noqa: F401
    import app.models.problem  # noqa: F401
    import app.models.submission  # noqa: F401
    import app.models.progress  # noqa: F401
    import app.models.tutor  # noqa: F401
