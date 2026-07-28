import { Say } from '@saykit/react';
import { SayProvider } from '@saykit/react/client';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HabitCard } from './src/habit-card';
import { completedToday, type Habit, habits as seed } from './src/habits';
import say, { deviceLocale, type Locale, locales } from './src/i18n';

// Resolve the device's language once, at module scope, before the first render.
const initialLocale = deviceLocale();
say.activate(initialLocale);

function Home({ locale, onLocale }: { locale: Locale; onLocale: (next: Locale) => void }) {
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
            <Pressable key={option} onPress={() => onLocale(option)}>
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
            one="# habit done today"
            other="# habits done today"
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
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const change = (next: Locale) => {
    setLocale(next);
    say.activate(next);
  };

  return (
    <SafeAreaProvider>
      <SayProvider locale={locale} messages={say.messages}>
        <Home locale={locale} onLocale={change} />
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
