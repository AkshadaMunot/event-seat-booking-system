from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import engine, Base, get_db
import models


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(title="Event Seat Booking API")


app.add_middleware(
    CORSMiddleware,
  allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://event-seat-booking-system.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class BookingRequest(BaseModel):
    customer_name: str
    customer_email: EmailStr
    seat_ids: List[int]


# =========================================================
# BASIC APIs
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Event Seat Booking API is running"
    }


@app.get("/db-test")
def db_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "result": result.scalar()
        }


@app.get("/tables-test")
def tables_test(db: Session = Depends(get_db)):

    events_count = db.query(models.Event).count()
    seats_count = db.query(models.Seat).count()
    bookings_count = db.query(models.Booking).count()

    return {
        "events": events_count,
        "seats": seats_count,
        "bookings": bookings_count
    }


# =========================================================
# EVENT APIs
# =========================================================

@app.post("/events")
def create_event(
    name: str,
    description: str,
    date: str,
    venue: str,
    db: Session = Depends(get_db)
):

    event = models.Event(
        name=name,
        description=description,
        date=date,
        venue=venue
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "message": "Event created successfully",
        "event_id": event.id,
        "name": event.name,
        "description": event.description,
        "date": event.date,
        "venue": event.venue
    }


@app.get("/events")
def get_events(db: Session = Depends(get_db)):

    events = db.query(models.Event).all()

    return events


# =========================================================
# SEAT APIs
# =========================================================

@app.post("/seats")
def create_seats(
    seat_prefix: str,
    number_of_seats: int,
    event_id: int,
    db: Session = Depends(get_db)
):
    # Check whether event exists
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    # Validate number of seats
    if number_of_seats <= 0:
        raise HTTPException(
            status_code=400,
            detail="Number of seats must be greater than 0"
        )

    # Get existing seats for this event
    existing_seats = (
        db.query(models.Seat)
        .filter(models.Seat.event_id == event_id)
        .all()
    )

    # Find the highest existing seat number
    highest_number = 0

    for seat in existing_seats:
        if seat.seat_number.startswith(seat_prefix):
            number_part = seat.seat_number[len(seat_prefix):]

            if number_part.isdigit():
                highest_number = max(
                    highest_number,
                    int(number_part)
                )

    # Create only NEW seats
    created_seats = []

    for i in range(
        highest_number + 1,
        highest_number + number_of_seats + 1
    ):
        seat_number = f"{seat_prefix}{i}"

        seat = models.Seat(
            seat_number=seat_number,
            status="available",
            event_id=event_id
        )

        db.add(seat)
        created_seats.append(seat_number)

    try:
        db.commit()

        return {
            "message": "Seats created successfully",
            "event_id": event_id,
            "created_seats": created_seats,
            "number_of_seats": len(created_seats)
        }

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="One or more seats already exist"
        )

@app.get("/events/{event_id}/seats")
def get_event_seats(
    event_id: int,
    db: Session = Depends(get_db)
):

    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    seats = (
        db.query(models.Seat)
        .filter(models.Seat.event_id == event_id)
        .order_by(models.Seat.id)
        .all()
    )

    return seats


# =========================================================
# BLOCK / UNBLOCK SEAT
# =========================================================

@app.patch("/seats/{seat_id}/block")
def block_seat(
    seat_id: int,
    db: Session = Depends(get_db)
):

    seat = (
        db.query(models.Seat)
        .filter(models.Seat.id == seat_id)
        .first()
    )

    if not seat:
        raise HTTPException(
            status_code=404,
            detail="Seat not found"
        )

    if seat.status == "booked":
        raise HTTPException(
            status_code=409,
            detail="Booked seat cannot be blocked"
        )

    seat.status = "blocked"

    db.commit()
    db.refresh(seat)

    return {
        "message": "Seat blocked successfully",
        "seat_id": seat.id,
        "seat_number": seat.seat_number,
        "status": seat.status
    }


@app.patch("/seats/{seat_id}/unblock")
def unblock_seat(
    seat_id: int,
    db: Session = Depends(get_db)
):

    seat = (
        db.query(models.Seat)
        .filter(models.Seat.id == seat_id)
        .first()
    )

    if not seat:
        raise HTTPException(
            status_code=404,
            detail="Seat not found"
        )

    if seat.status != "blocked":
        raise HTTPException(
            status_code=400,
            detail="Seat is not blocked"
        )

    seat.status = "available"

    db.commit()
    db.refresh(seat)

    return {
        "message": "Seat unblocked successfully",
        "seat_id": seat.id,
        "seat_number": seat.seat_number,
        "status": seat.status
    }


# =========================================================
# MULTI-SEAT ATOMIC BOOKING
# =========================================================

@app.post("/bookings")
def create_booking(
    booking_request: BookingRequest,
    db: Session = Depends(get_db)
):

    seat_ids = booking_request.seat_ids

    # At least one seat is required
    if not seat_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one seat must be selected"
        )

    # Remove duplicate seat IDs
    seat_ids = list(set(seat_ids))

    # -----------------------------------------------------
    # LOCK ALL SELECTED SEATS
    # -----------------------------------------------------
    #
    # SELECT ... FOR UPDATE
    #
    # This prevents two users from modifying
    # the same seats simultaneously.
    #
    seats = (
        db.query(models.Seat)
        .filter(models.Seat.id.in_(seat_ids))
        .order_by(models.Seat.id)
        .with_for_update()
        .all()
    )

    # Check if all requested seats exist
    if len(seats) != len(seat_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more selected seats were not found"
        )

    # -----------------------------------------------------
    # CHECK ALL SEATS BEFORE CREATING ANY BOOKING
    # -----------------------------------------------------

    for seat in seats:

        if seat.status == "booked":
            raise HTTPException(
                status_code=409,
                detail=f"Seat {seat.seat_number} is already booked"
            )

        if seat.status == "blocked":
            raise HTTPException(
                status_code=409,
                detail=f"Seat {seat.seat_number} is unavailable"
            )

    # -----------------------------------------------------
    # ATOMIC BOOKING
    # -----------------------------------------------------
    #
    # Either ALL seats are booked
    # OR NONE of them are booked.
    #
    try:

        bookings = []

        for seat in seats:

            booking = models.Booking(
                customer_name=booking_request.customer_name,
                customer_email=booking_request.customer_email,
                seat_id=seat.id
            )

            seat.status = "booked"

            db.add(booking)
            bookings.append(booking)

        # Save everything together
        db.commit()

        for booking in bookings:
            db.refresh(booking)

        return {
            "message": "All selected seats booked successfully",
            "booking_ids": [booking.id for booking in bookings],
            "customer_name": booking_request.customer_name,
            "customer_email": booking_request.customer_email,
            "seat_ids": seat_ids,
            "number_of_seats": len(seat_ids)
        }

    except IntegrityError:

        # If ANY booking fails,
        # rollback EVERYTHING.
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="One or more selected seats were already booked"
        )


# =========================================================
# GET ALL BOOKINGS
# =========================================================

@app.get("/bookings")
def get_bookings(
    db: Session = Depends(get_db)
):

    bookings = (
        db.query(models.Booking)
        .order_by(models.Booking.id.desc())
        .all()
    )

    return bookings

@app.get("/events/{event_id}/bookings")
def get_event_bookings(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    rows = (
        db.query(
            models.Booking,
            models.Seat.seat_number
        )
        .join(
            models.Seat,
            models.Booking.seat_id == models.Seat.id
        )
        .filter(
            models.Seat.event_id == event_id
        )
        .order_by(
            models.Booking.id.desc()
        )
        .all()
    )

    return [
        {
            "id": booking.id,
            "customer_name": booking.customer_name,
            "customer_email": booking.customer_email,
            "seat_id": booking.seat_id,
            "seat_number": seat_number,
            "created_at": booking.created_at
        }
        for booking, seat_number in rows
    ]


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.get("/admin/events/{event_id}/summary")
def get_admin_event_summary(
    event_id: int,
    db: Session = Depends(get_db)
):

    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    total_seats = (
        db.query(models.Seat)
        .filter(models.Seat.event_id == event_id)
        .count()
    )

    booked_seats = (
        db.query(models.Seat)
        .filter(
            models.Seat.event_id == event_id,
            models.Seat.status == "booked"
        )
        .count()
    )

    blocked_seats = (
        db.query(models.Seat)
        .filter(
            models.Seat.event_id == event_id,
            models.Seat.status == "blocked"
        )
        .count()
    )

    available_seats = (
        db.query(models.Seat)
        .filter(
            models.Seat.event_id == event_id,
            models.Seat.status == "available"
        )
        .count()
    )

    bookings = (
        db.query(models.Booking)
        .join(
            models.Seat,
            models.Booking.seat_id == models.Seat.id
        )
        .filter(models.Seat.event_id == event_id)
        .order_by(models.Booking.id.desc())
        .all()
    )

    booking_list = []

    for booking in bookings:

        booking_list.append({
            "booking_id": booking.id,
            "seat_id": booking.seat_id,
            "customer_name": booking.customer_name,
            "customer_email": booking.customer_email,
            "created_at": booking.created_at
        })

    return {
        "event": {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "venue": event.venue
        },
        "summary": {
            "total_seats": total_seats,
            "booked_seats": booked_seats,
            "available_seats": available_seats,
            "blocked_seats": blocked_seats
        },
        "bookings": booking_list
    }