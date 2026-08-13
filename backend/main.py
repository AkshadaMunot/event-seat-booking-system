from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# -------------------------
# EVENT APIs
# -------------------------

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

# -------------------------
# SEAT APIs
# -------------------------

@app.post("/seats")
def create_seat(
    seat_number: str,
    event_id: int,
    db: Session = Depends(get_db)
):
    # Check whether event exists
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if not event:
        return {
            "message": "Event not found"
        }

    seat = models.Seat(
        seat_number=seat_number,
        status="available",
        event_id=event_id
    )

    db.add(seat)
    db.commit()
    db.refresh(seat)

    return {
        "message": "Seat created successfully",
        "seat_id": seat.id,
        "seat_number": seat.seat_number,
        "status": seat.status,
        "event_id": seat.event_id
    }


@app.get("/events/{event_id}/seats")
def get_event_seats(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if not event:
        return {
            "message": "Event not found"
        }

    seats = db.query(models.Seat).filter(
        models.Seat.event_id == event_id
    ).all()

    return seats

# -------------------------
# BOOKING API
# -------------------------

@app.post("/bookings")
def create_booking(
    customer_name: str,
    customer_email: str,
    seat_id: int,
    db: Session = Depends(get_db)
):
    # Lock the selected seat row
    # This prevents two users from booking
    # the same seat at the same time.
    seat = (
        db.query(models.Seat)
        .filter(models.Seat.id == seat_id)
        .with_for_update()
        .first()
    )

    # Check if seat exists
    if not seat:
        raise HTTPException(
            status_code=404,
            detail="Seat not found"
        )

    # Check if seat is already booked
    if seat.status == "booked":
        raise HTTPException(
            status_code=409,
            detail="Seat is already booked"
        )

    try:
        # Create booking
        booking = models.Booking(
            customer_name=customer_name,
            customer_email=customer_email,
            seat_id=seat_id
        )

        # Change seat status
        seat.status = "booked"

        db.add(booking)

        # Save both changes together
        db.commit()

        db.refresh(booking)

        return {
            "message": "Seat booked successfully",
            "booking_id": booking.id,
            "customer_name": booking.customer_name,
            "customer_email": booking.customer_email,
            "seat_id": booking.seat_id,
            "seat_status": seat.status
        }

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Seat is already booked"
        )
# -------------------------
# GET ALL BOOKINGS API
# -------------------------

@app.get("/bookings")
def get_bookings(db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).all()

    return bookings