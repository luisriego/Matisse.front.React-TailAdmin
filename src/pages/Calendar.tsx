import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventContentArg,
  EventClickArg,
  DatesSetArg,
  EventApi, // Importar EventApi
  EventMountArg, // Importar EventMountArg
} from "@fullcalendar/core";
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import PageMeta from "../components/common/PageMeta";
import ViewEventModal from "../components/modal/ViewEventModal";
import { Expense, Income, FinancialEvent } from "../types"; // Importar FinancialEvent

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Tipado específico
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null); // Usar EventApi
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Tipado específico
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    const fetchEventsForMonth = async (date: Date) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");

        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const headers = { Authorization: `Bearer ${token}` };

        const [expensesRes, incomesRes] = await Promise.all([
          fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
          fetch(`/api/v1/incomes/date-range/${year}/${month}`, { headers }),
        ]);

        if (!expensesRes.ok) throw new Error(`Failed to fetch expenses: ${expensesRes.statusText}`);
        if (!incomesRes.ok) throw new Error(`Failed to fetch incomes: ${incomesRes.statusText}`);

        const expenses: Expense[] = await expensesRes.json();
        const incomes: Income[] = await incomesRes.json();

        const expenseEvents: FinancialEvent[] = expenses.map((expense) => ({
          id: `expense-${expense.id}`,
          title: expense.type.name || "Expense",
          start: expense.dueDate.split(" ")[0],
          allDay: true,
          extendedProps: { calendar: "Danger", amount: expense.amount, type: 'Expense' },
        }));

        const incomeEvents: FinancialEvent[] = incomes.map((income) => ({
          id: `income-${income.id}`,
          title: income.type.name || "Income",
          start: income.dueDate.split(" ")[0],
          allDay: true,
          extendedProps: { calendar: "Success", amount: income.amount, type: 'Income' },
        }));

        setEvents([...expenseEvents, ...incomeEvents]);
      } catch (err: unknown) {
        console.error("Error fetching calendar events:", err);
        if (err instanceof Error) setError(err.message);
        else setError("An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    void fetchEventsForMonth(currentDate);
  }, [currentDate]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event); // clickInfo.event ya es de tipo EventApi
    setIsModalOpen(true);
  };

  const handleEventDidMount = (info: EventMountArg) => { // Usar EventMountArg
    tippy(info.el, { content: info.event.title, placement: 'top' });
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    const newDisplayedMonth = dateInfo.view.currentStart.getMonth();
    const newDisplayedYear = dateInfo.view.currentStart.getFullYear();

    if (
      newDisplayedMonth !== currentDate.getMonth() ||
      newDisplayedYear !== currentDate.getFullYear()
    ) {
      setCurrentDate(new Date(newDisplayedYear, newDisplayedMonth, 1));
    }
  };

  const renderCalendar = () => {
    if (loading) return <div className="flex items-center justify-center h-96"><p className="text-lg text-gray-500">Carregando eventos...</p></div>;
    if (error) return <div className="flex items-center justify-center h-96"><p className="text-lg text-red-500">Erro: {error}</p></div>;

    return (
      <FullCalendar
        key={currentDate.toISOString()}
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialDate={currentDate}
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        datesSet={handleDatesSet}
        selectable={false}
      />
    );
  };

  return (
    <>
      <style>
        {`
          .fc-prevButton-button, .fc-nextButton-button {
            background-color: #dcfce7 !important;
            color: #166534 !important;
            border: 1px solid #166534 !important;
          }
        `}
      </style>
      <PageMeta
        title="Calendar | Matisse - React.js Admin Dashboard"
        description="Financial calendar displaying expenses and incomes."
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">{renderCalendar()}</div>
      </div>
      <ViewEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
      />
    </>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}>
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
