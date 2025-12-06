import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventContentArg,
  EventClickArg,
  DatesSetArg,
  EventApi,
  EventMountArg,
} from "@fullcalendar/core";
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import PageMeta from "../components/common/PageMeta";
import ViewEventModal from "../components/modal/ViewEventModal";
import { Expense, Income, FinancialEvent } from "../types";

// --- Función de Fetching ---
const fetchCalendarEvents = async (date: Date): Promise<FinancialEvent[]> => {
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

  return [...expenseEvents, ...incomeEvents];
};

// --- Componente ---
const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const calendarRef = useRef<FullCalendar>(null);

  // --- Query ---
  const { data: events = [], isLoading, isError, error } = useQuery<FinancialEvent[], Error>({
    queryKey: ['calendarEvents', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: () => fetchCalendarEvents(currentDate),
  });

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event);
    setIsModalOpen(true);
  };

  const handleEventDidMount = (info: EventMountArg) => {
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
    if (isLoading) return <div className="flex items-center justify-center h-96"><p className="text-lg text-gray-500">Carregando eventos...</p></div>;
    if (isError) return <div className="flex items-center justify-center h-96"><p className="text-lg text-red-500">Erro: {(error as Error).message}</p></div>;

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
        selectable={true}
        locale={ptBrLocale}
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
