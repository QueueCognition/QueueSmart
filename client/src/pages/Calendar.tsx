import { useState } from "react";
import "../styles/calendar.css";

function Calendar() {
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

        {calendarDays.map((day, index) => (
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
            {day !== null && <span className="calendar-date">{day}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Calendar;
