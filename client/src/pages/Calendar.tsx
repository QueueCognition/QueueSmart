import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, isSameMonth, startOfMonth } from "date-fns";
import "../styles/calendar.css";
import { useAuth } from "../context/AuthContext";
import { queryKeys } from "../lib/queryClient";
import { getMyQueue, getQueueHistory } from "../services/queueService";
import { useServices } from "../hooks/useServices";
import {
  buildMonthGrid,
  formatMonthName,
  formatMonthYear,
  toDateKey,
} from "../utils/dateUtils";

function Calendar() {
  const { user } = useAuth();

  const myQueueQuery = useQuery({
    queryKey: queryKeys.myQueue,
    queryFn: getMyQueue,
    enabled: Boolean(user),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.queueHistory,
    queryFn: getQueueHistory,
    enabled: Boolean(user),
  });

  const servicesQuery = useServices();

  const myQueue = myQueueQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const services = servicesQuery.data ?? [];

  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  function changeMonth(amount: number) {
    setCurrentMonth((current) => addMonths(startOfMonth(current), amount));
  }

  const monthYear = formatMonthYear(currentMonth);

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index),
    label: formatMonthName(new Date(2000, index, 1)),
  }));

  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from(
    { length: 12 },
    (_, index) => currentYear - 5 + index,
  );

  const calendarDays = buildMonthGrid(currentMonth);

  const isCurrentMonth = isSameMonth(new Date(), currentMonth);
  const todayDate = new Date().getDate();

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function getEntriesForDay(day: number) {
    const dateString = toDateKey(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    );

    return [...myQueue, ...history].filter(
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
          const dayHistory = day !== null ? getEntriesForDay(day) : [];

          return (
            <div
              className={`calendar-day ${
                day === null ? "calendar-day-empty" : ""
              } ${
                isCurrentMonth && day === todayDate ? "calendar-day-today" : ""
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
                          <span>
                            {service?.name ?? `Service ${entry.serviceId}`}
                          </span>
                          <span>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
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
