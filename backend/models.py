from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime,timezone

from database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    date = Column(String(50))
    venue = Column(String(100))

    seats = relationship(
        "Seat",
        back_populates="event"
    )


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)

    seat_number = Column(
        String(20),
        nullable=False
    )

    # Possible values:
    # available → can be booked
    # booked    → already booked
    # blocked   → unavailable for booking
    status = Column(
        String(20),
        default="available",
        nullable=False
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    event = relationship(
        "Event",
        back_populates="seats"
    )

    # Same seat number cannot be repeated
    # inside the same event.
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "seat_number",
            name="unique_seat_per_event"
        ),
    )


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    customer_name = Column(
        String(100),
        nullable=False
    )

    customer_email = Column(
        String(150),
        nullable=False
    )

    seat_id = Column(
        Integer,
        ForeignKey("seats.id"),
        nullable=False
    )

    created_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc),
    nullable=False
)

    # One seat can have only one booking
    __table_args__ = (
        UniqueConstraint(
            "seat_id",
            name="unique_booking_per_seat"
        ),
    )

    seat = relationship("Seat")