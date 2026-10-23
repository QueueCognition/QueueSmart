import { useEffect, useState } from "react";
import "../styles/calendar.css";
import { useAuth } from "../context/AuthContext";
import { getQueueHistory, getServices } from "../services/queueService";
import type { QueueEntry, Service } from "../types/queue";

function Calendar() {
  const { user } = useAuth();

  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!user) return;

    getQueueHistory()
      .then(setHistory)
      .catch((error) => {
        console.error("Failed to load queue history:", error);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    getServices()
      .then(setServices)
      .catch((error) => {
        console.error("Failed to load services:", error);
      });
  }, [user]);


  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  function changeMonth(amount: number) {
    setCurrentMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index),
    label: new Date(2000, index, 1).toLocaleDateString("en-US", {
      month: "long",
    }),
  }));

  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from(
    { length: 12 },
    (_, index) => currentYear - 5 + index,
  );

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentMonth.getFullYear() &&
    today.getMonth() === currentMonth.getMonth();

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function getHistoryForDay(day: number) {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    const dateString = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return history.filter(
      (entry) => entry.date === dateString,
    );
  }

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <div className="calendar-month-navigation">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>

          <h2>{monthYear}</h2>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="calendar-date-selectors">
          <select
            aria-label="Select month"
            value={String(currentMonth.getMonth())}
            onChange={(event) => {
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  Number(event.target.value),
                  1,
                ),
              );
            }}
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Select year"
            value={String(currentMonth.getFullYear())}
            onChange={(event) => {
              setCurrentMonth(
                new Date(
                  Number(event.target.value),
                  currentMonth.getMonth(),
                  1,
                ),
              );
            }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="calendar-grid">
        {weekdays.map((day) => (
          <div className="calendar-weekday" key={day}>
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const dayHistory = day !== null ? getHistoryForDay(day) : [];

          return (
            <div
              className={`calendar-day ${
                day === null ? "calendar-day-empty" : ""
              } ${
                isCurrentMonth && day === today.getDate()
                  ? "calendar-day-today"
                  : ""
              }`}
              key={index}
            >
              {day !== null && (
                <>
                  <span className="calendar-date">{day}</span>

                  <div className="calendar-appointments">
                    {dayHistory.map((entry) => {
                      const service = services.find(
                        (service) => service.id === entry.serviceId,
                      );

                      const status =
                        entry.status === "served"
                          ? "completed"
                          : entry.status === "cancelled"
                            ? "cancelled"
                            : "joined";

                      return (
                        <div
                          className={`calendar-appointment calendar-appointment--${status}`}
                          key={entry.id}
                        >
                          <strong>{entry.timeSlot}</strong>
                          <span>{service?.name ?? `Service ${entry.serviceId}`}</span>
                          <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;
