import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventContentArg, EventClickArg } from "@fullcalendar/core";
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import PageMeta from "../components/common/PageMeta";
import ViewEventModal from "../components/modal/ViewEventModal";
import { Expense, Income } from "../types";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    amount: number;
    type: 'Expense' | 'Income';
  };
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        console.log(`Fetching events for ${year}-${month}`);

        const headers = { Authorization: `Bearer ${token}` };

        const [expensesRes, incomesRes] = await Promise.all([
          fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
          fetch(`/api/v1/incomes/date-range/${year}/${month}`, { headers }),
        ]);

        if (!expensesRes.ok) throw new Error(`Failed to fetch expenses: ${expensesRes.statusText}`);
        if (!incomesRes.ok) throw new Error(`Failed to fetch incomes: ${incomesRes.statusText}`);

        const expenses: Expense[] = await expensesRes.json();
        const incomes: Income[] = await incomesRes.json();

        console.log("Fetched Expenses:", expenses);
        console.log("Fetched Incomes:", incomes);

        const expenseEvents: CalendarEvent[] = expenses.map((expense) => ({
          id: `expense-${expense.id}`,
          title: expense.description || "Expense",
          start: expense.dueDate.split(" ")[0],
          allDay: true,
          extendedProps: { calendar: "Danger", amount: expense.amount, type: 'Expense' },
        }));

        const incomeEvents: CalendarEvent[] = incomes.map((income) => ({
          id: `income-${income.id}`,
          title: income.description || "Income",
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

  const handleNavClick = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Set to the first of the month to avoid date overflow issues
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event as unknown as CalendarEvent);
    setIsModalOpen(true);
  };

  const handleEventDidMount = (info: any) => {
    tippy(info.el, { content: info.event.title, placement: 'top' });
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
          left: "prevButton,nextButton",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        customButtons={{
          prevButton: { text: '<', click: () => handleNavClick('prev') },
          nextButton: { text: '>', click: () => handleNavClick('next') },
        }}
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        selectable={false}
        noEventsContent="Nenhum evento financeiro encontrado para este mês."
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
