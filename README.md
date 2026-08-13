
# Event Seat Booking System

A full-stack web application for managing events, seats, and online seat bookings.

The system allows administrators to create events and seat layouts, while users can view available seats and book them. The application uses a Next.js frontend, FastAPI backend, and MySQL database.

---

## 📌 Project Overview

The Event Seat Booking System provides a simple platform for managing event seat reservations.

### Admin can:
- Create new events
- Add seats to an event
- View existing events
- Manage seat layouts

### Users can:
- View available events
- View seat availability
- Select an available seat
- Enter customer details
- Book a seat
- View booking history

The system also prevents a seat from being booked more than once.

---

## 🚀 Features

- Event creation
- Seat layout creation
- Event listing
- Seat availability display
- Online seat booking
- Booking history
- Available and booked seat status
- Already-booked seat protection
- Database-level unique constraint for bookings
- REST APIs using FastAPI
- MySQL database integration
- Frontend and backend API integration
- Admin and user interfaces

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
     │ SQLAlchemy
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
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

> The `.env` file contains local database credentials and should not be committed to GitHub.

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
If Available → Create Booking
      ↓
Change Status → Booked
```

If the seat is already booked, the API returns:

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

| Method | Endpoint                   | Purpose                  |
| ------ | -------------------------- | ------------------------ |
| GET    | `/`                        | Check API status         |
| GET    | `/db-test`                 | Test database connection |
| GET    | `/tables-test`             | Test database tables     |
| POST   | `/events`                  | Create an event          |
| GET    | `/events`                  | Get all events           |
| POST   | `/seats`                   | Create a seat            |
| GET    | `/events/{event_id}/seats` | Get seats for an event   |
| POST   | `/bookings`                | Book a seat              |
| GET    | `/bookings`                | Get all bookings         |

---

## ▶️ How to Run Locally

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd event-seat-booking-system
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/seat_booking_db
```

Start the backend:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
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
* Seat creation
* Seat availability
* Successful booking
* Already-booked seat handling
* Booking history
* Frontend-backend integration
* Database-level duplicate booking prevention

---

## 🔒 Security Notes

* Database credentials are stored in `.env`.
* `.env` is excluded from Git using `.gitignore`.
* `venv`, `node_modules`, and generated build files are excluded from the repository.
* Database credentials should never be exposed publicly.

---

## 🎯 Future Improvements

* User authentication and authorization
* Event deletion and editing
* Booking cancellation
* Payment integration
* Email booking confirmation
* QR-code based booking tickets
* Online deployment
* Improved admin authentication

---

## 👩‍💻 Project

**Event Seat Booking System**

Built using **Next.js + FastAPI + MySQL**.

`

