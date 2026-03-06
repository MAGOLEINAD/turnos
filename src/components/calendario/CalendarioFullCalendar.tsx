'use client'

import { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core'
import { FULLCALENDAR_CONFIG } from '@/lib/utils/calendario'
import { Card } from '@/components/ui/card'

interface CalendarioFullCalendarProps {
  eventos: any[]
  onDateSelect?: (selectInfo: DateSelectArg) => void
  onEventClick?: (clickInfo: EventClickArg) => void
  editable?: boolean
  selectable?: boolean
}

export function CalendarioFullCalendar({
  eventos,
  onDateSelect,
  onEventClick,
  editable = false,
  selectable = true,
}: CalendarioFullCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (onDateSelect) {
      onDateSelect(selectInfo)
    }
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (onEventClick) {
      onEventClick(clickInfo)
    }
  }

  const renderEventContent = (eventContent: EventContentArg) => {
    return (
      <div className="p-1">
        <div className="font-medium text-xs">{eventContent.timeText}</div>
        <div className="text-xs truncate">{eventContent.event.title}</div>
      </div>
    )
  }

  return (
    <Card className="p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        {...FULLCALENDAR_CONFIG}
        locale={esLocale}
        events={eventos}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        editable={editable}
        selectable={selectable}
        selectMinDistance={0}
        views={{
          timeGridWeek: {
            titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
          },
          timeGridDay: {
            titleFormat: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
          },
        }}
      />

      {/* Estilos custom para FullCalendar */}
      <style jsx global>{`
        .fc {
          --fc-border-color: #e5e7eb;
          --fc-button-bg-color: #3b82f6;
          --fc-button-border-color: #3b82f6;
          --fc-button-hover-bg-color: #2563eb;
          --fc-button-hover-border-color: #2563eb;
          --fc-button-active-bg-color: #1d4ed8;
          --fc-button-active-border-color: #1d4ed8;
          --fc-today-bg-color: rgba(59, 130, 246, 0.1);
        }

        .fc .fc-button {
          text-transform: capitalize;
          font-weight: 500;
        }

        .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .fc-event {
          cursor: pointer;
          border-radius: 4px;
        }

        .fc-event:hover {
          opacity: 0.9;
        }

        .fc-daygrid-event {
          padding: 2px 4px;
        }
      `}</style>
    </Card>
  )
}
