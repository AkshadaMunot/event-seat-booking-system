
# Event Seat Booking System

A full-stack web application for managing events, seats, and online seat bookings.

The system allows administrators to create events and generate event-specific seat layouts, while users can view upcoming events, select available seats, and make bookings.

The application is built using **Next.js, FastAPI, SQLAlchemy, and MySQL**.

---

## 📌 Project Overview

The Event Seat Booking System provides a simple platform for managing event seat reservations.

Each event has its own independent seat layout. Seat numbers such as `A1`, `A2`, `A3` can therefore exist in multiple events without causing duplicate-seat issues between events.

### Admin can:

- Create new events
- Create event-specific seat layouts
- Generate multiple seats using a seat prefix
- View existing events
- Manage individual seats
- Block available seats
- Unblock blocked seats
- View event-specific dashboard
- Monitor bookings for a selected event
- View total, available, booked, and blocked seats

### Users can:

- View upcoming events
- Select an event
- View event-specific seat availability
- Select one or multiple available seats
- Enter customer details
- Book selected seats
- View booking history
- See booked and unavailable seats

The system also prevents a seat from being booked more than once.

---

## 🚀 Features

### Event Management

- Event creation
- Event listing
- Event-specific seat layouts
- Event-specific booking management
- Multiple events supported independently

### Seat Management

- Generate multiple seats at once
- Custom seat prefix support
- Example: `A1, A2, A3 ... A10`
- Event-specific seat numbering
- Available seat status
- Booked seat status
- Blocked seat status
- Block and unblock seats

### Booking

- Single-seat booking
- Multiple-seat booking
- Customer name and email
- Booking confirmation
- Already-booked seat protection
- Database-level duplicate booking protection
- Event-specific booking records

### Admin Dashboard

- Total seats
- Available seats
- Booked seats
- Blocked seats
- Event bookings
- Individual seat management

### Booking History

- Booking ID
- Customer name
- Customer email
- Seat ID
- Booking time
- Event-specific booking information

---

## 🛠️ Technologies Used

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic

### Database

- MySQL

### Development Tools

- Visual Studio Code
- MySQL Workbench
- Git
- GitHub
- Swagger / OpenAPI

---

## 🏗️ Project Architecture

```text
User / Admin
      │
      ▼
Next.js Frontend
      │
      │ REST API
      ▼
FastAPI Backend
      │
      │ SQLAlchemy ORM
      ▼
MySQL Database
````

---

## 📂 Project Structure

```text
event-seat-booking-system/
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

> The `.env` file contains local database credentials and should not be committed to GitHub.

---


## 🪑 Event-Specific Seat Management

Seats belong to a specific event.

For example:

```text
Event 1
A1  A2  A3  A4  A5  A6  A7  A8  A9  A10

Event 2
A1  A2  A3  A4  A5  A6  A7  A8  A9  A10
```

The same seat number can therefore exist in different events.

For example:

```text
Event 1 → A3
Event 2 → A3
```

These are two different seats because they belong to different events.

This prevents seat numbering from being incorrectly shared across events.

---

## 🔐 Double Booking Protection

The application uses multiple levels of protection to prevent the same seat from being booked twice.

### Application-Level Protection

Before creating a booking, the backend checks whether the selected seat is already booked.

```text
Available Seat
      ↓
Check Seat Status
      ↓
If Available
      ↓
Create Booking
      ↓
Change Status → Booked
```

If the seat has already been booked, the API returns a conflict response.

```text
409 Conflict
Seat is already booked
```

### Database-Level Protection

The `bookings` table contains a unique constraint on `seat_id`.

```text
unique_booking_per_seat
```

This ensures that one seat can have only one booking even if duplicate booking requests reach the database.

---

## 🔌 Main API Endpoints

| Method | Endpoint                      | Purpose                           |
| ------ | ----------------------------- | --------------------------------- |
| GET    | `/`                           | Check API status                  |
| GET    | `/db-test`                    | Test database connection          |
| GET    | `/tables-test`                | Test database tables              |
| POST   | `/events`                     | Create an event                   |
| GET    | `/events`                     | Get all events                    |
| POST   | `/seats`                      | Create seats                      |
| GET    | `/events/{event_id}/seats`    | Get seats for an event            |
| POST   | `/bookings`                   | Create a booking                  |
| GET    | `/events/{event_id}/bookings` | Get bookings for a specific event |

---

## ▶️ How to Run Locally

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd event-seat-booking-system
```

---

### 2. Backend Setup

Open the backend folder:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/seat_booking_db
```

Start the FastAPI backend:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger / OpenAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

### 3. Frontend Setup

Open another terminal and go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## 🧪 Testing

The application was tested for:

* Database connectivity
* Event creation
* Event listing
* Seat creation
* Event-specific seat layouts
* Seat availability
* Seat blocking and unblocking
* Single-seat booking
* Multiple-seat booking
* Already-booked seat handling
* Duplicate booking prevention
* Event-specific booking information
* Booking history
* Frontend-backend integration
* MySQL database operations

---

## 🔒 Security Notes

* Database credentials are stored in `.env`.
* `.env` is excluded from Git using `.gitignore`.
* `venv` is excluded from the repository.
* `node_modules` is excluded from the repository.
* Generated build files are excluded from the repository.
* Database credentials should never be exposed publicly.

---

## 🎯 Future Improvements

* User authentication and authorization
* Admin authentication
* Event editing
* Event deletion
* Booking cancellation
* Payment integration
* Email booking confirmation
* QR-code based booking tickets
* Online deployment
* Improved admin access control
* Responsive UI improvements

---

## 👩‍💻 Project

**Event Seat Booking System**

Built using:

**Next.js + FastAPI + SQLAlchemy + MySQL**

---

