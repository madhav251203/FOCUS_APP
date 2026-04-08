import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocus } from '../context/FocusContext';
import { Button } from '../components/Button';
import { GradientCard } from '../components/GradientCard';
import { COLORS, FOCUS_DURATIONS, POINT_REWARDS } from '../constants';
import { formatTime, formatDuration } from '../utils/format';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;

export function TimerScreen() {
  const {
    activeSession,
    timeRemaining,
    isRunning,
    appSwitches,
    startSession,
    cancelSession,
    completedPoints,
    sessionFailed,
    dismissResult,
  } = useFocus();
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const { error } = await startSession(selectedDuration);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure? You won\'t earn any points.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: cancelSession,
        },
      ]
    );
  };

  // Result modal
  if (completedPoints !== null || sessionFailed) {
    return (
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight] as const}
        style={styles.container}
      >
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: sessionFailed ? COLORS.error + '20' : COLORS.accent + '20' },
            ]}
          >
            <Ionicons
              name={sessionFailed ? 'close-circle' : 'checkmark-circle'}
              size={64}
              color={sessionFailed ? COLORS.error : COLORS.accent}
            />
          </View>
          <Text style={styles.resultTitle}>
            {sessionFailed ? 'Session Failed' : 'Great Work!'}
          </Text>
          <Text style={styles.resultSubtitle}>
            {sessionFailed
              ? 'Cheating was detected. Stay focused next time!'
              : `You earned ${completedPoints} points!`}
          </Text>
          <Button title="Continue" onPress={dismissResult} size="large" style={styles.resultButton} />
        </View>
      </LinearGradient>
    );
  }

  // Active timer
  if (isRunning && activeSession) {
    const totalSeconds = activeSession.duration_minutes * 60;
    const progress = 1 - timeRemaining / totalSeconds;

    return (
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight] as const}
        style={styles.container}
      >
        <View style={styles.timerContainer}>
          <Text style={styles.focusLabel}>Stay Focused</Text>

          <View style={styles.circleContainer}>
            <View style={styles.circleOuter}>
              <View style={styles.circleInner}>
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timerSubtext}>
                  {formatDuration(activeSession.duration_minutes)} session
                </Text>
              </View>
            </View>
            {/* Progress ring visual indicator */}
            <View style={[styles.progressArc, { opacity: progress }]} />
          </View>

          {appSwitches > 0 && (
            <GradientCard colors={[COLORS.error + '30', COLORS.error + '10'] as const} style={styles.warningCard}>
              <View style={styles.warningRow}>
                <Ionicons name="warning" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  App switches: {appSwitches}/2 allowed
                </Text>
              </View>
            </GradientCard>
          )}

          <Button
            title="Cancel Session"
            onPress={handleCancel}
            variant="danger"
            size="large"
            style={styles.cancelButton}
          />
        </View>
      </LinearGradient>
    );
  }

  // Duration selection
  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.backgroundLight] as const}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Focus Timer</Text>
        <Text style={styles.screenSubtitle}>
          Choose your focus duration and earn rewards
        </Text>

        <View style={styles.durationsGrid}>
          {FOCUS_DURATIONS.map((duration) => {
            const points = POINT_REWARDS[duration] || 0;
            const isSelected = selectedDuration === duration;

            return (
              <TouchableOpacity
                key={duration}
                onPress={() => setSelectedDuration(duration)}
                style={[
                  styles.durationCard,
                  isSelected && styles.durationCardSelected,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationValue,
                    isSelected && styles.durationValueSelected,
                  ]}
                >
                  {formatDuration(duration)}
                </Text>
                <Text
                  style={[
                    styles.durationPoints,
                    isSelected && styles.durationPointsSelected,
                  ]}
                >
                  +{points} pts
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <GradientCard style={styles.selectedInfo}>
          <View style={styles.selectedInfoRow}>
            <View>
              <Text style={styles.selectedLabel}>Selected Duration</Text>
              <Text style={styles.selectedValue}>{formatDuration(selectedDuration)}</Text>
            </View>
            <View style={styles.selectedPointsBadge}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.selectedPointsText}>
                +{POINT_REWARDS[selectedDuration] || 0} points
              </Text>
            </View>
          </View>
        </GradientCard>

        <Button
          title="Start Focus Session"
          onPress={handleStart}
          loading={loading}
          size="large"
          style={styles.startButton}
        />

        <GradientCard style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Rules</Text>
          <View style={styles.ruleItem}>
            <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.ruleText}>Don't switch apps (max 2 allowed)</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="eye-off-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.ruleText}>Keep your screen on</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-done-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.ruleText}>Complete the full session to earn points</Text>
          </View>
        </GradientCard>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  durationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  durationCard: {
    width: (width - 52) / 3,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  durationValueSelected: {
    color: COLORS.primary,
  },
  durationPoints: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  durationPointsSelected: {
    color: COLORS.primaryLight,
  },
  selectedInfo: {
    marginBottom: 16,
  },
  selectedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  selectedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 4,
  },
  startButton: {
    marginBottom: 16,
  },
  rulesCard: {},
  rulesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  // Timer active styles
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  focusLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    marginBottom: 32,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 4,
    borderColor: COLORS.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    color: COLORS.text,
    letterSpacing: 2,
  },
  timerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressArc: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
  },
  warningCard: {
    width: '100%',
    marginBottom: 16,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warning,
    marginLeft: 8,
  },
  cancelButton: {
    width: '100%',
  },
  // Result styles
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resultIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  resultButton: {
    width: '100%',
  },
});
