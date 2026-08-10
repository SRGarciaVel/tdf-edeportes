import uuid

from sqlalchemy import SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class QuarterlyGoal(Base):
    __tablename__ = "quarterly_goals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1-4
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # en_progreso | cumplido | descartado
    status: Mapped[str] = mapped_column(String, default="en_progreso", nullable=False)
