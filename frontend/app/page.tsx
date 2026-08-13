"use client";

import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

type Event = {
  id: number;
  name: string;
  description: string;
  date: string;
  venue: string;
};

type Seat = {
  id: number;
  event_id: number;
  seat_number: string;
  status: string;
};

type Booking = {
  id: number;
  customer_name: string;
  customer_email: string;
  seat_id: number;
};

export default function Home() {
  // =========================
  // COMMON STATE
  // =========================

  const [mode, setMode] = useState<"user" | "admin">("user");

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // USER BOOKING STATE
  // =========================

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [booking, setBooking] = useState(false);

  // =========================
  // ADMIN STATE
  // =========================

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");

  const [adminEventId, setAdminEventId] = useState<number | null>(null);

  const [seatPrefix, setSeatPrefix] = useState("A");
  const [seatCount, setSeatCount] = useState(10);
  const [creatingSeats, setCreatingSeats] = useState(false);

  // =========================
  // BOOKINGS
  // =========================

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBookings, setShowBookings] = useState(false);

  // =========================
  // LOAD EVENTS
  // =========================

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/events`);

      if (!response.ok) {
        throw new Error("Failed to load events");
      }

      const data = await response.json();
      setEvents(data);
    } catch {
      setError(
        "Unable to load events. Make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD SEATS
  // =========================

  async function selectEvent(event: Event) {
    setSelectedEvent(event);
    setSelectedSeat(null);
    setMessage("");
    setError("");
    setSeats([]);

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/events/${event.id}/seats`
      );

      if (!response.ok) {
        throw new Error("Failed to load seats");
      }

      const data = await response.json();
      setSeats(data);
    } catch {
      setError("Unable to load seats.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // SELECT SEAT
  // =========================

  function selectSeat(seat: Seat) {
    if (seat.status === "booked") {
      return;
    }

    setSelectedSeat(seat);
    setMessage("");
    setError("");
  }

  // =========================
  // BOOK SEAT
  // =========================

  async function bookSeat() {
    if (!selectedSeat) {
      setError("Please select an available seat.");
      return;
    }

    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!customerEmail.trim()) {
      setError("Please enter your email.");
      return;
    }

    try {
      setBooking(true);
      setMessage("");
      setError("");

      const params = new URLSearchParams({
        customer_name: customerName,
        customer_email: customerEmail,
        seat_id: String(selectedSeat.id),
      });

      const response = await fetch(
        `${API_URL}/bookings?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.message === "Seat booked successfully") {
        setMessage(
          `Booking successful! Booking ID: ${data.booking_id}`
        );

        setSeats((currentSeats) =>
          currentSeats.map((seat) =>
            seat.id === selectedSeat.id
              ? { ...seat, status: "booked" }
              : seat
          )
        );

        setSelectedSeat(null);
        setCustomerName("");
        setCustomerEmail("");
      } else if (data.message === "Seat is already booked") {
        setError(
          "This seat was just booked by another user. Please select another seat."
        );

        if (selectedEvent) {
          selectEvent(selectedEvent);
        }
      } else {
        setError(data.message || "Booking failed.");
      }
    } catch {
      setError("Unable to complete booking.");
    } finally {
      setBooking(false);
    }
  }

  // =========================
  // ADMIN - CREATE EVENT
  // =========================

  async function createEvent() {
    if (!eventName.trim()) {
      setError("Please enter event name.");
      return;
    }

    if (!eventDescription.trim()) {
      setError("Please enter event description.");
      return;
    }

    if (!eventDate.trim()) {
      setError("Please enter event date.");
      return;
    }

    if (!eventVenue.trim()) {
      setError("Please enter event venue.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const params = new URLSearchParams({
        name: eventName,
        description: eventDescription,
        date: eventDate,
        venue: eventVenue,
      });

      const response = await fetch(
        `${API_URL}/events?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.event_id) {
        setAdminEventId(data.event_id);

        setMessage(
          `Event created successfully. Event ID: ${data.event_id}`
        );

        setEventName("");
        setEventDescription("");
        setEventDate("");
        setEventVenue("");

        await fetchEvents();
      } else {
        setError(data.message || "Event creation failed.");
      }
    } catch {
      setError("Unable to create event.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // ADMIN - CREATE SEATS
  // =========================

  async function createSeats() {
    if (!adminEventId) {
      setError("First create an event.");
      return;
    }

    if (!seatPrefix.trim()) {
      setError("Please enter seat prefix.");
      return;
    }

    if (seatCount < 1 || seatCount > 100) {
      setError("Seat count must be between 1 and 100.");
      return;
    }

    try {
      setCreatingSeats(true);
      setMessage("");
      setError("");

      let successfulSeats = 0;

      for (let i = 1; i <= seatCount; i++) {
        const params = new URLSearchParams({
          seat_number: `${seatPrefix}${i}`,
          event_id: String(adminEventId),
        });

        const response = await fetch(
          `${API_URL}/seats?${params.toString()}`,
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (data.seat_id) {
          successfulSeats++;
        }
      }

      setMessage(
        `${successfulSeats} seats created successfully for Event #${adminEventId}.`
      );
    } catch {
      setError("Unable to create seats.");
    } finally {
      setCreatingSeats(false);
    }
  }

  // =========================
  // GET BOOKINGS
  // =========================

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/bookings`);

      if (!response.ok) {
        throw new Error("Failed to load bookings");
      }

      const data = await response.json();

      setBookings(data);
      setShowBookings(true);
    } catch {
      setError("Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // BACK TO EVENTS
  // =========================

  function backToEvents() {
    setSelectedEvent(null);
    setSelectedSeat(null);
    setSeats([]);
    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* =========================
          HEADER
      ========================= */}

      <header className="bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold">
              Event Seat Booking
            </h1>

            <p className="text-sm text-slate-300">
              Simple, fast and secure event seat booking
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={() => {
                setMode("user");
                setShowBookings(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              User Booking
            </button>

            <button
              onClick={() => {
                setMode("admin");
                setSelectedEvent(null);
                setShowBookings(false);
                setMessage("");
                setError("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "admin"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Admin
            </button>

            <button
              onClick={loadBookings}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              My Bookings
            </button>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* =========================
            MESSAGES
        ========================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            ✅ {message}
          </div>
        )}

        {/* =========================
            BOOKINGS
        ========================= */}

        {showBookings && (
          <section className="mb-10">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  Booking History
                </h2>

                <p className="mt-1 text-slate-500">
                  All bookings stored in the database.
                </p>
              </div>

              <button
                onClick={() => setShowBookings(false)}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow">
                No bookings found.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl bg-white p-6 shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold">
                        Booking #{booking.id}
                      </h3>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Confirmed
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Name:</strong>{" "}
                        {booking.customer_name}
                      </p>

                      <p>
                        <strong>Email:</strong>{" "}
                        {booking.customer_email}
                      </p>

                      <p>
                        <strong>Seat ID:</strong>{" "}
                        {booking.seat_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* =========================
            ADMIN PANEL
        ========================= */}

        {mode === "admin" && !showBookings && (
          <section>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Admin Panel
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Create Event & Seat Layout
              </h2>

              <p className="mt-2 text-slate-600">
                Create an event and generate seats for the event.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">

              {/* CREATE EVENT */}

              <div className="rounded-2xl bg-white p-7 shadow-md">

                <h3 className="text-xl font-bold">
                  1. Create Event
                </h3>

                <div className="mt-6 space-y-5">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Event Name
                    </label>

                    <input
                      value={eventName}
                      onChange={(e) =>
                        setEventName(e.target.value)
                      }
                      placeholder="College Fest 2026"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Description
                    </label>

                    <textarea
                      value={eventDescription}
                      onChange={(e) =>
                        setEventDescription(e.target.value)
                      }
                      placeholder="Annual college cultural event"
                      rows={4}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Date
                    </label>

                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) =>
                        setEventDate(e.target.value)
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Venue
                    </label>

                    <input
                      value={eventVenue}
                      onChange={(e) =>
                        setEventVenue(e.target.value)
                      }
                      placeholder="Pune University Auditorium"
                      className="input-field"
                    />
                  </div>

                  <button
                    onClick={createEvent}
                    disabled={loading}
                    className="primary-button"
                  >
                    {loading
                      ? "Creating..."
                      : "Create Event"}
                  </button>

                </div>
              </div>

              {/* CREATE SEATS */}

              <div className="rounded-2xl bg-white p-7 shadow-md">

                <h3 className="text-xl font-bold">
                  2. Create Seat Layout
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  First create an event. Then generate seats.
                </p>

                <div className="mt-6 rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm text-slate-500">
                    Current Event ID
                  </p>

                  <p className="mt-1 text-2xl font-bold text-indigo-700">
                    {adminEventId ?? "Not created"}
                  </p>
                </div>

                <div className="mt-6 space-y-5">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Seat Prefix
                    </label>

                    <input
                      value={seatPrefix}
                      onChange={(e) =>
                        setSeatPrefix(
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="A"
                      maxLength={3}
                      className="input-field"
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      Example: A → A1, A2, A3...
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Number of Seats
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={seatCount}
                      onChange={(e) =>
                        setSeatCount(
                          Number(e.target.value)
                        )
                      }
                      className="input-field"
                    />
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">
                      Preview
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {seatPrefix}1, {seatPrefix}2,{" "}
                      {seatPrefix}3 ... {seatPrefix}
                      {seatCount}
                    </p>
                  </div>

                  <button
                    onClick={createSeats}
                    disabled={
                      !adminEventId || creatingSeats
                    }
                    className="primary-button"
                  >
                    {creatingSeats
                      ? "Creating Seats..."
                      : "Create Seats"}
                  </button>

                </div>
              </div>

            </div>

            {/* ADMIN EVENT LIST */}

            <div className="mt-8 rounded-2xl bg-white p-7 shadow-md">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    Existing Events
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Select an event ID to use for seat setup.
                  </p>
                </div>

                <button
                  onClick={fetchEvents}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Venue</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-4 font-semibold">
                          {event.id}
                        </td>

                        <td className="px-4 py-4">
                          {event.name}
                        </td>

                        <td className="px-4 py-4">
                          {event.date}
                        </td>

                        <td className="px-4 py-4">
                          {event.venue}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() =>
                              setAdminEventId(event.id)
                            }
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </section>
        )}

        {/* =========================
            USER EVENT LIST
        ========================= */}

        {mode === "user" &&
          !selectedEvent &&
          !showBookings && (
            <section>

              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  User Portal
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Upcoming Events
                </h2>

                <p className="mt-2 text-slate-600">
                  Choose an event and select your preferred seat.
                </p>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow">
                  Loading events...
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow">
                  No events available.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">

                        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                          Event #{event.id}
                        </p>

                        <h3 className="mt-2 text-2xl font-bold">
                          {event.name}
                        </h3>

                      </div>

                      <div className="p-6">

                        <p className="min-h-[48px] text-slate-600">
                          {event.description}
                        </p>

                        <div className="mt-5 space-y-2 text-sm text-slate-600">
                          <p>📅 {event.date}</p>
                          <p>📍 {event.venue}</p>
                        </div>

                        <button
                          onClick={() =>
                            selectEvent(event)
                          }
                          className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-indigo-600"
                        >
                          View Seats →
                        </button>

                      </div>
                    </div>
                  ))}
                </div>
              )}

            </section>
          )}

        {/* =========================
            USER SEAT SELECTION
        ========================= */}

        {mode === "user" &&
          selectedEvent &&
          !showBookings && (
            <section>

              <button
                onClick={backToEvents}
                className="mb-6 rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                ← Back to Events
              </button>

              {/* EVENT INFO */}

              <div className="mb-8 rounded-2xl bg-white p-6 shadow-md">

                <p className="text-sm font-semibold text-indigo-600">
                  EVENT #{selectedEvent.id}
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {selectedEvent.name}
                </h2>

                <p className="mt-2 text-slate-600">
                  {selectedEvent.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
                  <span>📅 {selectedEvent.date}</span>
                  <span>📍 {selectedEvent.venue}</span>
                </div>

              </div>

              {loading ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow">
                  Loading seats...
                </div>
              ) : (
                <div className="grid gap-8 lg:grid-cols-3">

                  {/* SEAT AREA */}

                  <div className="rounded-2xl bg-white p-6 shadow-md lg:col-span-2">

                    <h3 className="text-xl font-bold">
                      Select Your Seat
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Green = Available, Red = Booked, Blue = Selected
                    </p>

                    <div className="mt-6 rounded-lg bg-slate-800 py-3 text-center text-sm font-bold tracking-widest text-white">
                      SCREEN
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                      {seats.map((seat) => {

                        const booked =
                          seat.status === "booked";

                        const selected =
                          selectedSeat?.id === seat.id;

                        return (
                          <button
                            key={seat.id}
                            onClick={() =>
                              selectSeat(seat)
                            }
                            disabled={booked}
                            className={`rounded-xl border-2 p-4 font-bold transition ${
                              booked
                                ? "cursor-not-allowed border-red-300 bg-red-500 text-white"
                                : selected
                                ? "border-indigo-700 bg-indigo-600 text-white scale-105"
                                : "border-green-300 bg-green-500 text-white hover:scale-105 hover:bg-green-600"
                            }`}
                          >
                            <div className="text-lg">
                              {seat.seat_number}
                            </div>

                            <div className="mt-1 text-xs font-normal">
                              {booked
                                ? "Booked"
                                : selected
                                ? "Selected"
                                : "Available"}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {seats.length === 0 && (
                      <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                        No seats have been created for this event.
                      </div>
                    )}

                  </div>

                  {/* BOOKING FORM */}

                  <div className="rounded-2xl bg-white p-6 shadow-md">

                    <h3 className="text-xl font-bold">
                      Booking Details
                    </h3>

                    <div className="mt-5 rounded-xl bg-indigo-50 p-4">
                      <p className="text-sm text-slate-500">
                        Selected Seat
                      </p>

                      <p className="mt-1 text-2xl font-bold text-indigo-700">
                        {selectedSeat
                          ? selectedSeat.seat_number
                          : "Not selected"}
                      </p>
                    </div>

                    <div className="mt-6">
                      <label className="mb-2 block text-sm font-semibold">
                        Your Name
                      </label>

                      <input
                        value={customerName}
                        onChange={(e) =>
                          setCustomerName(
                            e.target.value
                          )
                        }
                        placeholder="Enter your name"
                        className="input-field"
                      />
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm font-semibold">
                        Email
                      </label>

                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) =>
                          setCustomerEmail(
                            e.target.value
                          )
                        }
                        placeholder="you@example.com"
                        className="input-field"
                      />
                    </div>

                    <button
                      onClick={bookSeat}
                      disabled={
                        !selectedSeat || booking
                      }
                      className="primary-button mt-6"
                    >
                      {booking
                        ? "Booking..."
                        : "Book Seat"}
                    </button>

                  </div>

                </div>
              )}

            </section>
          )}

      </div>

      {/* FOOTER */}

      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        Event Seat Booking System • Built with Next.js + FastAPI + MySQL
      </footer>

    </main>
  );
}