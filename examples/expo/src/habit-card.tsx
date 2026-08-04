import { Say } from '@saykit/react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Habit } from './habits';

export function HabitCard({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{habit.name}</Text>
        <Text style={styles.cadence}>
          <Say.Select
            _={habit.cadence}
            daily="Every day"
            weekdays="Weekdays"
            weekly="Once a week"
            other="Sometimes"
          />
        </Text>
      </View>

      <Text style={styles.streak}>
        {habit.streak === 0 ? (
          <Say>No streak yet — today is a good day to start</Say>
        ) : (
          <Say.Plural
            _={habit.streak}
            one={<>{habit.streak} day streak</>}
            other={<>{habit.streak} day streak</>}
          />
        )}
      </Text>

      <Text style={styles.progress}>
        <Say>
          <Text style={styles.strong}>{habit.thisWeek}</Text> of{' '}
          <Text style={styles.strong}>{habit.target}</Text> this week
        </Say>
      </Text>

      {habit.best > habit.streak && (
        <Text style={styles.best}>
          <Say.Plural
            _={habit.best}
            one={<>Your best was {habit.best} day</>}
            other={<>Your best was {habit.best} days</>}
          />
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.button, habit.doneToday && styles.buttonDone]}
      >
        <Text style={styles.buttonLabel}>
          {habit.doneToday ? <Say>Done today</Say> : <Say>Mark as done</Say>}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  cadence: { fontSize: 12, color: '#667085' },
  streak: { fontSize: 14, marginTop: 4 },
  progress: { fontSize: 13, color: '#475467' },
  best: { fontSize: 12, color: '#667085' },
  strong: { fontWeight: '700' },
  button: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3538cd',
    alignItems: 'center',
  },
  buttonDone: { backgroundColor: '#067647' },
  buttonLabel: { color: 'white', fontWeight: '600', fontSize: 14 },
});
