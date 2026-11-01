import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import type { CalendarDay, CalendarDayStatus } from '../../../core/streak/streak';

interface StreakCalendarProps {
  days: CalendarDay[]; // Monday-first, multiple of 7
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const cal = colors.streak.calendar;

const CELL_STYLE: Record<CalendarDayStatus, { backgroundColor: string; color: string; borderColor?: string }> = {
  done: { backgroundColor: cal.done.surface, color: cal.done.ink },
  // Freeze-covered dates borrow the frozen badge palette (not drawn in Figma).
  covered: { backgroundColor: colors.streak.frozen.surface, color: colors.streak.frozen.ink },
  today: { backgroundColor: cal.current.surface, color: cal.current.ink, borderColor: cal.current.border },
  idle: { backgroundColor: cal.idle.surface, color: cal.idle.ink },
};

const STATUS_LABEL: Record<CalendarDayStatus, string> = {
  done: 'activity completed',
  covered: 'covered by freeze',
  today: 'today, not yet done',
  idle: 'no activity',
};

// Figma Practice/StreakCalendar (32:870): weekday header + 4 weeks of 44x33 day tiles.
export const StreakCalendar: React.FC<StreakCalendarProps> = ({ days }) => {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6.8 }}>
        {WEEKDAYS.map((label, i) => (
          <Text
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              width: 44,
              textAlign: 'center',
              paddingTop: 6,
              fontFamily: typography.fontFamily.jakarta,
              color: cal.weekdayInk,
              ...typography.fontSize['type-10'],
            }}
          >
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: w === 0 ? 0 : 7 }}>
          {week.map((day) => {
            const look = CELL_STYLE[day.status];
            return (
              <View
                key={day.isoDate}
                accessible
                accessibilityLabel={`${day.isoDate}, ${STATUS_LABEL[day.status]}`}
                style={{
                  width: 44,
                  height: 33,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9,
                  backgroundColor: look.backgroundColor,
                  borderWidth: look.borderColor ? 1.6 : 0,
                  borderColor: look.borderColor,
                }}
              >
                <Text style={{ fontFamily: typography.fontFamily.jakarta, color: look.color, ...typography.fontSize['type-11'] }}>
                  {day.dayOfMonth}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};
