"use client";

import { useEffect, useState } from "react";

const API_URL = "https://event-seat-booking-system.onrender.com";

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
  status: "available" | "booked" | "blocked" | string;
};

type Booking = {
  id: number;
  customer_name: string;
  customer_email: string;
  seat_id: number;
  seat_number?: string;
  event_id?: number;
  event_name?: string;
  created_at?: string;
};

type EventBookingGroup = {
  event: Event;
  bookings: Booking[];
};

type AdminSummary = {
  event: {
    id: number;
    name: string;
    date: string;
    venue: string;
  };
  summary: {
    total_seats: number;
    booked_seats: number;
    available_seats: number;
    blocked_seats: number;
  };
  bookings: {
    booking_id: number;
    seat_id: number;
    customer_name: string;
    customer_email: string;
    created_at?: string;
  }[];
};

export default function Home() {
  // =====================================================
  // COMMON STATE
  // =====================================================

  const [mode, setMode] = useState<"user" | "admin">("user");

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // USER BOOKING STATE
  // =====================================================

  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [booking, setBooking] = useState(false);

  // =====================================================
  // ADMIN EVENT STATE
  // =====================================================

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");

  const [adminEventId, setAdminEventId] = useState<number | null>(null);

  // =====================================================
  // ADMIN SEAT STATE
  // =====================================================

  const [seatPrefix, setSeatPrefix] = useState("A");
  const [seatCount, setSeatCount] = useState(10);
  const [creatingSeats, setCreatingSeats] = useState(false);

  // =====================================================
  // BOOKINGS
  // =====================================================

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBookings, setShowBookings] = useState(false);

  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  const [adminSummary, setAdminSummary] =
    useState<AdminSummary | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(false);

  // =====================================================
  // LOAD EVENTS
  // =====================================================

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

  // =====================================================
  // LOAD SEATS
  // =====================================================

  async function selectEvent(event: Event) {
    setSelectedEvent(event);
    setSelectedSeats([]);
    setAdminSummary(null);
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

  // =====================================================
  // MULTI-SEAT SELECTION
  // =====================================================

  function toggleSeat(seat: Seat) {
    // Booked and blocked seats cannot be selected
    if (seat.status === "booked" || seat.status === "blocked") {
      return;
    }

    setMessage("");
    setError("");

    const alreadySelected = selectedSeats.some(
      (selected) => selected.id === seat.id
    );

    if (alreadySelected) {
      setSelectedSeats((current) =>
        current.filter((selected) => selected.id !== seat.id)
      );
    } else {
      setSelectedSeats((current) => [...current, seat]);
    }
  }

  // =====================================================
  // BOOK MULTIPLE SEATS
  // =====================================================

  async function bookSeats() {
    if (selectedSeats.length === 0) {
      setError("Please select at least one available seat.");
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

      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          seat_ids: selectedSeats.map((seat) => seat.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail ||
            "Booking failed. Please select available seats again."
        );

        // Refresh seats because another user may have
        // booked one of the selected seats.
        if (selectedEvent) {
          await selectEvent(selectedEvent);
        }

        return;
      }

      setMessage(
        `Booking successful! ${data.number_of_seats} seat(s) booked. Booking IDs: ${data.booking_ids.join(
          ", "
        )}`
      );

      // Update booked seats locally
      const bookedIds = selectedSeats.map((seat) => seat.id);

      setSeats((currentSeats) =>
        currentSeats.map((seat) =>
          bookedIds.includes(seat.id)
            ? { ...seat, status: "booked" }
            : seat
        )
      );

      setSelectedSeats([]);
      setCustomerName("");
      setCustomerEmail("");

      // Refresh admin dashboard if currently available
      if (selectedEvent) {
        await loadAdminSummary(selectedEvent.id);
      }
    } catch {
      setError("Unable to complete booking.");
    } finally {
      setBooking(false);
    }
  }

  // =====================================================
  // ADMIN - CREATE EVENT
  // =====================================================

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

      if (!response.ok) {
        setError(data.detail || data.message || "Event creation failed.");
        return;
      }

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

  // =====================================================
  // ADMIN - CREATE SEATS
  // =====================================================

  async function createSeats() {
    if (!adminEventId) {
      setError("First create or select an event.");
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

      const params = new URLSearchParams({
        seat_prefix: seatPrefix.trim().toUpperCase(),
        number_of_seats: String(seatCount),
        event_id: String(adminEventId),
      });

      const response = await fetch(
        `${API_URL}/seats?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to create seats.");
        return;
      }

      setMessage(
        `${data.number_of_seats} new seat(s) created successfully: ${data.created_seats.join(
          ", "
        )}`
      );

      // Always refresh the admin dashboard and the complete seat list.
      // This makes newly created seats immediately visible in Seat Management.
      await loadAdminSummary(adminEventId);

      const seatsResponse = await fetch(
        `${API_URL}/events/${adminEventId}/seats`
      );

      if (seatsResponse.ok) {
        const updatedSeats = await seatsResponse.json();
        setSeats(updatedSeats);
      }
    } catch {
      setError("Unable to create seats.");
    } finally {
      setCreatingSeats(false);
    }
  }

  // =====================================================
  // ADMIN - LOAD SUMMARY
  // =====================================================

  async function loadAdminSummary(eventId: number) {
    try {
      setLoadingSummary(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/events/${eventId}/summary`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to load admin dashboard.");
        return;
      }

      setAdminSummary(data);
    } catch {
      setError("Unable to load admin dashboard.");
    } finally {
      setLoadingSummary(false);
    }
  }

  // =====================================================
  // ADMIN - SELECT EVENT
  // =====================================================

  async function selectAdminEvent(eventId: number) {
    setMode("admin");
    setAdminEventId(eventId);
    setSelectedEvent(null);
    setSelectedSeats([]);
    setShowBookings(false);
    setMessage("");
    setError("");
    setSeats([]);

    await loadAdminSummary(eventId);

    try {
      const response = await fetch(
        `${API_URL}/events/${eventId}/seats`
      );

      if (!response.ok) {
        throw new Error("Failed to load seats");
      }

      const data = await response.json();
      setSeats(data);
    } catch {
      setError("Unable to load seats for admin dashboard.");
    }
  }

  // View Seats is a user-facing view. It intentionally switches
  // from Admin mode to the normal seat-selection screen.
  function viewEventSeats(event: Event) {
    setMode("user");
    setShowBookings(false);
    setAdminSummary(null);
    setSelectedSeats([]);
    selectEvent(event);
  }

  // =====================================================
  // BLOCK SEAT
  // =====================================================

  async function blockSeat(seatId: number) {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/seats/${seatId}/block`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to block seat.");
        return;
      }

      setMessage(
        `Seat ${data.seat_number} blocked successfully.`
      );

      // Refresh selected admin event seats if applicable
      if (adminEventId) {
        await loadAdminSummary(adminEventId);
      }

      if (selectedEvent) {
        const seatsResponse = await fetch(
          `${API_URL}/events/${selectedEvent.id}/seats`
        );

        if (seatsResponse.ok) {
          const updatedSeats = await seatsResponse.json();
          setSeats(updatedSeats);
        }
      }
    } catch {
      setError("Unable to block seat.");
    }
  }

  // =====================================================
  // UNBLOCK SEAT
  // =====================================================

  async function unblockSeat(seatId: number) {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/seats/${seatId}/unblock`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to unblock seat.");
        return;
      }

      setMessage(
        `Seat ${data.seat_number} is available again.`
      );

      if (adminEventId) {
        await loadAdminSummary(adminEventId);
      }

      if (selectedEvent) {
        const seatsResponse = await fetch(
          `${API_URL}/events/${selectedEvent.id}/seats`
        );

        if (seatsResponse.ok) {
          const updatedSeats = await seatsResponse.json();
          setSeats(updatedSeats);
        }
      }
    } catch {
      setError("Unable to unblock seat.");
    }
  }

  // =====================================================
  // LOAD EVENT-WISE BOOKING HISTORY
  // =====================================================

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      // The backend does not expose GET /bookings.
      // Instead, use the existing event-wise admin summary API
      // and map each booking's seat_id to the actual seat number.
      const eventsResponse = await fetch(`${API_URL}/events`);

      if (!eventsResponse.ok) {
        throw new Error("Failed to load events");
      }

      const eventList: Event[] = await eventsResponse.json();

      const groups: EventBookingGroup[] = [];

      for (const event of eventList) {
        try {
          const [summaryResponse, seatsResponse] = await Promise.all([
            fetch(`${API_URL}/admin/events/${event.id}/summary`),
            fetch(`${API_URL}/events/${event.id}/seats`),
          ]);

          if (!summaryResponse.ok) {
            continue;
          }

          const summaryData: AdminSummary = await summaryResponse.json();

          let eventSeats: Seat[] = [];

          if (seatsResponse.ok) {
            eventSeats = await seatsResponse.json();
          }

          const seatMap = new Map<number, string>(
            eventSeats.map((seat) => [seat.id, seat.seat_number])
          );

          const eventBookings: Booking[] = summaryData.bookings.map(
            (booking) => ({
              id: booking.booking_id,
              customer_name: booking.customer_name,
              customer_email: booking.customer_email,
              seat_id: booking.seat_id,
              seat_number: seatMap.get(booking.seat_id) || `Seat ${booking.seat_id}`,
              event_id: event.id,
              event_name: event.name,
              created_at: booking.created_at,
            })
          );

          if (eventBookings.length > 0) {
            groups.push({
              event,
              bookings: eventBookings,
            });
          }
        } catch {
          // Skip one event if its summary cannot be loaded.
          // Other events should still appear in history.
        }
      }

      // Keep the existing state as a flat list for compatibility,
      // while the UI below groups the records by event.
      const allBookings = groups.flatMap((group) => group.bookings);
      setBookings(allBookings);
      setShowBookings(true);
    } catch {
      setError("Unable to load booking history.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // BACK TO EVENTS
  // =====================================================

  function backToEvents() {
    setSelectedEvent(null);
    setSelectedSeats([]);
    setSeats([]);
    setMessage("");
    setError("");
  }

  // =====================================================
  // CHANGE MODE
  // =====================================================

  function changeMode(newMode: "user" | "admin") {
    setMode(newMode);
    setShowBookings(false);
    setSelectedEvent(null);
    setSelectedSeats([]);
    setAdminSummary(null);
    setMessage("");
    setError("");
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(date?: string) {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* =================================================
          HEADER
      ================================================= */}

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
              onClick={() => changeMode("user")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              User Booking
            </button>

            <button
              onClick={() => changeMode("admin")}
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
              Booking History
            </button>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* =================================================
            MESSAGES
        ================================================= */}

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

        {/* =================================================
            EVENT-WISE BOOKING HISTORY
        ================================================= */}

        {showBookings && (
          <section className="mb-10">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Booking Records
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Booking History
                </h2>

                <p className="mt-1 text-slate-500">
                  Bookings are grouped separately for each event.
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
              <div className="space-y-8">
                {events.map((event) => {
                  const eventBookings = bookings.filter(
                    (booking) => booking.event_id === event.id
                  );

                  if (eventBookings.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={event.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-md"
                    >
                      <div className="border-b bg-indigo-50 px-6 py-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                              Event #{event.id}
                            </p>

                            <h3 className="mt-1 text-xl font-bold">
                              {event.name}
                            </h3>
                          </div>

                          <div className="text-sm text-slate-600 sm:text-right">
                            <p>📅 {event.date}</p>
                            <p>📍 {event.venue}</p>
                            <p className="mt-1 font-semibold text-indigo-700">
                              {eventBookings.length} booking
                              {eventBookings.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="px-5 py-4">Booking ID</th>
                              <th className="px-5 py-4">Customer</th>
                              <th className="px-5 py-4">Email</th>
                              <th className="px-5 py-4">Seat</th>
                              <th className="px-5 py-4">Booking Time</th>
                            </tr>
                          </thead>

                          <tbody>
                            {eventBookings.map((booking) => (
                              <tr
                                key={`${event.id}-${booking.id}`}
                                className="border-b last:border-0"
                              >
                                <td className="px-5 py-4 font-semibold">
                                  #{booking.id}
                                </td>

                                <td className="px-5 py-4">
                                  {booking.customer_name}
                                </td>

                                <td className="px-5 py-4">
                                  {booking.customer_email}
                                </td>

                                <td className="px-5 py-4 font-semibold text-indigo-700">
                                  {booking.seat_number || `Seat ${booking.seat_id}`}
                                </td>

                                <td className="px-5 py-4">
                                  {formatDate(booking.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </section>
        )}

        {/* =================================================
            ADMIN PANEL
        ================================================= */}

        {mode === "admin" && !showBookings && (
          <section>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Admin Panel
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Event & Seat Management
              </h2>

              <p className="mt-2 text-slate-600">
                Create events, generate seats, block seats and monitor bookings.
              </p>
            </div>

            {/* CREATE EVENT + CREATE SEATS */}

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
                    {loading ? "Creating..." : "Create Event"}
                  </button>

                </div>
              </div>

              {/* CREATE SEATS */}

              <div className="rounded-2xl bg-white p-7 shadow-md">

                <h3 className="text-xl font-bold">
                  2. Create Seat Layout
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  First create or select an event.
                </p>

                <div className="mt-6 rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm text-slate-500">
                    Current Event ID
                  </p>

                  <p className="mt-1 text-2xl font-bold text-indigo-700">
                    {adminEventId ?? "Not selected"}
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
                        setSeatCount(Number(e.target.value))
                      }
                      className="input-field"
                    />
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">
                      Preview
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {seatPrefix}1, {seatPrefix}2, {seatPrefix}3 ...{" "}
                      {seatPrefix}
                      {seatCount}
                    </p>
                  </div>

                  <button
                    onClick={createSeats}
                    disabled={!adminEventId || creatingSeats}
                    className="primary-button"
                  >
                    {creatingSeats
                      ? "Creating Seats..."
                      : "Create Seats"}
                  </button>

                </div>
              </div>

            </div>

            {/* EXISTING EVENTS */}

            <div className="mt-8 rounded-2xl bg-white p-7 shadow-md">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-xl font-bold">
                    Existing Events
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Select an event to manage its seats and dashboard.
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

                <table className="w-full min-w-[700px] text-left text-sm">

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

                          <div className="flex flex-wrap gap-2">

                            <button
                              onClick={() =>
                                selectAdminEvent(event.id)
                              }
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              Manage
                            </button>

                            <button
                              onClick={() => viewEventSeats(event)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                            >
                              View Seats
                            </button>

                          </div>

                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>

            </div>

            {/* ADMIN DASHBOARD */}

            {adminSummary && (
              <div className="mt-8">

                <div className="mb-6">
                  <h3 className="text-2xl font-bold">
                    Admin Dashboard
                  </h3>

                  <p className="mt-1 text-slate-500">
                    {adminSummary.event.name} •{" "}
                    {adminSummary.event.venue}
                  </p>
                </div>

                {/* SUMMARY CARDS */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-2xl bg-white p-6 shadow-md">
                    <p className="text-sm text-slate-500">
                      Total Seats
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {adminSummary.summary.total_seats}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-green-50 p-6 shadow-md">
                    <p className="text-sm text-green-700">
                      Available
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-700">
                      {adminSummary.summary.available_seats}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-6 shadow-md">
                    <p className="text-sm text-red-700">
                      Booked
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-700">
                      {adminSummary.summary.booked_seats}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-yellow-50 p-6 shadow-md">
                    <p className="text-sm text-yellow-700">
                      Blocked
                    </p>

                    <p className="mt-2 text-3xl font-bold text-yellow-700">
                      {adminSummary.summary.blocked_seats}
                    </p>
                  </div>

                </div>

                {/* BOOKINGS */}

                <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-md">

                  <div className="border-b p-6">
                    <h4 className="text-xl font-bold">
                      Event Bookings
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      Customer and booking information.
                    </p>
                  </div>

                  {loadingSummary ? (
                    <div className="p-8 text-center text-slate-500">
                      Loading dashboard...
                    </div>
                  ) : adminSummary.bookings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No bookings for this event yet.
                    </div>
                  ) : (
                    <table className="w-full min-w-[800px] text-left text-sm">

                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="px-5 py-4">
                            Booking ID
                          </th>

                          <th className="px-5 py-4">
                            Seat ID
                          </th>

                          <th className="px-5 py-4">
                            Customer
                          </th>

                          <th className="px-5 py-4">
                            Email
                          </th>

                          <th className="px-5 py-4">
                            Timestamp
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {adminSummary.bookings.map(
                          (booking) => (
                            <tr
                              key={booking.booking_id}
                              className="border-b last:border-0"
                            >

                              <td className="px-5 py-4 font-semibold">
                                #{booking.booking_id}
                              </td>

                              <td className="px-5 py-4">
                                {booking.seat_id}
                              </td>

                              <td className="px-5 py-4">
                                {booking.customer_name}
                              </td>

                              <td className="px-5 py-4">
                                {booking.customer_email}
                              </td>

                              <td className="px-5 py-4">
                                {formatDate(
                                  booking.created_at
                                )}
                              </td>

                            </tr>
                          )
                        )}
                      </tbody>

                    </table>
                  )}

                </div>

                {/* ADMIN SEAT MANAGEMENT */}

                <div className="mt-8 rounded-2xl bg-white p-7 shadow-md">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <h4 className="text-xl font-bold">
                        Seat Management
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        Block or unblock individual seats.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        loadAdminSummary(adminSummary.event.id)
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Refresh Dashboard
                    </button>

                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">

                    {seats
                      .filter(
                        (seat) =>
                          seat.event_id === adminSummary.event.id
                      )
                      .map((seat) => (

                        <div
                          key={seat.id}
                          className={`rounded-xl border p-3 text-center ${
                            seat.status === "booked"
                              ? "border-red-200 bg-red-50"
                              : seat.status === "blocked"
                              ? "border-yellow-200 bg-yellow-50"
                              : "border-green-200 bg-green-50"
                          }`}
                        >

                          <p className="font-bold">
                            {seat.seat_number}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {seat.status}
                          </p>

                          {seat.status === "available" && (
                            <button
                              onClick={() =>
                                blockSeat(seat.id)
                              }
                              className="mt-2 rounded-md bg-yellow-500 px-2 py-1 text-xs font-semibold text-white hover:bg-yellow-600"
                            >
                              Block
                            </button>
                          )}

                          {seat.status === "blocked" && (
                            <button
                              onClick={() =>
                                unblockSeat(seat.id)
                              }
                              className="mt-2 rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Unblock
                            </button>
                          )}

                          {seat.status === "booked" && (
                            <span className="mt-2 block text-xs font-semibold text-red-600">
                              Booked
                            </span>
                          )}

                        </div>

                      ))}

                  </div>

                </div>

              </div>
            )}

          </section>
        )}

        {/* =================================================
            USER EVENT LIST
        ================================================= */}

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
                  Choose an event and select one or more seats.
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
                          onClick={() => selectEvent(event)}
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

        {/* =================================================
            USER SEAT SELECTION
        ================================================= */}

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

                  {/* =================================================
                      SEAT AREA
                  ================================================= */}

                  <div className="rounded-2xl bg-white p-6 shadow-md lg:col-span-2">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <h3 className="text-xl font-bold">
                          Select Your Seats
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          You can select multiple available seats.
                        </p>
                      </div>

                    </div>

                    {/* LEGEND */}

                    <div className="mt-5 flex flex-wrap gap-4 text-sm">

                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded bg-green-500" />
                        Available
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded bg-indigo-600" />
                        Selected
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded bg-red-500" />
                        Booked
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded bg-yellow-500" />
                        Blocked
                      </div>

                    </div>

                    <div className="mt-6 rounded-lg bg-slate-800 py-3 text-center text-sm font-bold tracking-widest text-white">
                      SCREEN
                    </div>

                    {/* SEATS */}

                    <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">

                      {seats.map((seat) => {

                        const booked =
                          seat.status === "booked";

                        const blocked =
                          seat.status === "blocked";

                        const selected =
                          selectedSeats.some(
                            (selectedSeat) =>
                              selectedSeat.id === seat.id
                          );

                        return (
                          <button
                            key={seat.id}
                            onClick={() =>
                              toggleSeat(seat)
                            }
                            disabled={booked || blocked}
                            className={`rounded-xl border-2 p-4 font-bold transition ${
                              booked
                                ? "cursor-not-allowed border-red-300 bg-red-500 text-white"
                                : blocked
                                ? "cursor-not-allowed border-yellow-300 bg-yellow-500 text-white"
                                : selected
                                ? "scale-105 border-indigo-700 bg-indigo-600 text-white"
                                : "border-green-300 bg-green-500 text-white hover:scale-105 hover:bg-green-600"
                            }`}
                          >

                            <div className="text-lg">
                              {seat.seat_number}
                            </div>

                            <div className="mt-1 text-xs font-normal">
                              {booked
                                ? "Booked"
                                : blocked
                                ? "Blocked"
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

                  {/* =================================================
                      BOOKING FORM
                  ================================================= */}

                  <div className="rounded-2xl bg-white p-6 shadow-md">

                    <h3 className="text-xl font-bold">
                      Booking Details
                    </h3>

                    {/* SELECTED SEATS */}

                    <div className="mt-5 rounded-xl bg-indigo-50 p-4">

                      <p className="text-sm text-slate-500">
                        Selected Seats
                      </p>

                      {selectedSeats.length === 0 ? (
                        <p className="mt-2 text-xl font-bold text-indigo-700">
                          No seats selected
                        </p>
                      ) : (
                        <>
                          <p className="mt-2 text-xl font-bold text-indigo-700">
                            {selectedSeats
                              .map(
                                (seat) =>
                                  seat.seat_number
                              )
                              .join(", ")}
                          </p>

                          <p className="mt-2 text-sm text-slate-500">
                            {selectedSeats.length} seat
                            {selectedSeats.length > 1
                              ? "s"
                              : ""}{" "}
                            selected
                          </p>
                        </>
                      )}

                    </div>

                    {/* NAME */}

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

                    {/* EMAIL */}

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

                    {/* BOOK */}

                    <button
                      onClick={bookSeats}
                      disabled={
                        selectedSeats.length === 0 ||
                        booking
                      }
                      className="primary-button mt-6"
                    >
                      {booking
                        ? "Booking..."
                        : `Book ${
                            selectedSeats.length || ""
                          } Seat${
                            selectedSeats.length > 1
                              ? "s"
                              : ""
                          }`}
                    </button>

                    {selectedSeats.length > 0 && (
                      <button
                        onClick={() =>
                          setSelectedSeats([])
                        }
                        disabled={booking}
                        className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                      >
                        Clear Selection
                      </button>
                    )}

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