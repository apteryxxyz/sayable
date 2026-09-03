import { Say } from '@saykit/react';
import { SayProvider, useSay } from '@saykit/react/client';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HabitCard } from './src/habit-card';
import { completedToday, type Habit, habits as seed } from './src/habits';
import { locales, store } from './src/i18n';

function Home() {
  const { locale } = useSay();
  const [habits, setHabits] = useState<Habit[]>(seed);
  const done = completedToday(habits);

  function toggle(id: string) {
    setHabits((current) =>
      current.map((habit) => (habit.id === id ? { ...habit, doneToday: !habit.doneToday } : habit)),
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.switcher}>
          {locales.map((option) => (
            <Pressable key={option} onPress={() => void store.set(option)}>
              <Text style={[styles.switcherItem, option === locale && styles.switcherActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.title}>
          <Say>Streaks</Say>
        </Text>

        <Text style={styles.summary}>
          <Say.Plural
            _={done}
            _0="Nothing ticked off yet today"
            one={<>{done} habit done today</>}
            other={<>{done} habits done today</>}
          />
        </Text>

        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onToggle={() => toggle(habit.id)} />
        ))}

        <Text style={styles.footer}>
          <Say>
            Streaks reset at midnight in your device's time zone. Missing a day is fine — the habit
            is the point, not the number.
          </Say>
        </Text>
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SayProvider store={store}>
        <Home />
      </SayProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 48 },
  switcher: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 8 },
  switcherItem: { fontSize: 13, color: '#667085' },
  switcherActive: { color: '#3538cd', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700' },
  summary: { fontSize: 14, color: '#667085', marginBottom: 20 },
  footer: { fontSize: 12, color: '#667085', marginTop: 8, lineHeight: 18 },
});
