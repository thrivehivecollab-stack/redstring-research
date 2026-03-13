import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus, Minus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import type { Timeline, CanvasNode } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
} as const;

const CURRENT_YEAR = new Date().getFullYear();

function getYears(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [start || new Date().getFullYear()];
  const years: number[] = [];
  const range = end - start;
  const step = range > 100 ? 10 : range > 30 ? 5 : 1;
  for (let y = start; y <= end; y += step) {
    years.push(y);
  }
  if (years.length > 0 && years[years.length - 1] !== end) years.push(end);
  return years;
}

function getTimelinePosition(
  timestamp: number,
  startYear: number,
  endYear: number,
  totalWidth: number
): number {
  const date = new Date(timestamp);
  const year = date.getFullYear() + date.getMonth() / 12;
  const frac = (year - startYear) / (endYear - startYear);
  return Math.max(0, Math.min(1, frac)) * totalWidth;
}

// ---- Single timeline row ----
interface TimelineRowProps {
  timeline: Timeline;
  nodes: CanvasNode[];
  isMain: boolean;
  onToggleMinimize: () => void;
  onDelete: () => void;
  onUpdateLabel: (label: string) => void;
}

function TimelineRow({
  timeline,
  nodes,
  isMain,
  onToggleMinimize,
  onDelete,
  onUpdateLabel,
}: TimelineRowProps) {
  const [editingLabel, setEditingLabel] = useState<boolean>(false);
  const [labelText, setLabelText] = useState<string>(timeline.label);
  const scrollRef = useRef<ScrollView>(null);

  // Nodes that have timestamps
  const timedNodes = useMemo(
    () => nodes.filter((n) => n.timestamp != null),
    [nodes]
  );

  // Auto-derive effective start/end from node timestamps, with padding
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (!timedNodes || timedNodes.length === 0) {
      const s = Number.isFinite(timeline.startYear) ? timeline.startYear : new Date().getFullYear() - 5;
      const e = Number.isFinite(timeline.endYear) && timeline.endYear > s ? timeline.endYear : s + 10;
      return { effectiveStart: s, effectiveEnd: e };
    }
    const years = timedNodes.map((n) => new Date(n.timestamp!).getFullYear()).filter(Number.isFinite);
    if (years.length === 0) return { effectiveStart: new Date().getFullYear() - 5, effectiveEnd: new Date().getFullYear() + 5 };
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const start = minYear - 5;
    const end = Math.max(maxYear + 5, CURRENT_YEAR);
    return { effectiveStart: start, effectiveEnd: end };
  }, [timedNodes, timeline.startYear, timeline.endYear]);

  const years = useMemo(
    () => getYears(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd]
  );

  const YEAR_WIDTH = 60;
  const totalScrollWidth = years.length * YEAR_WIDTH;

  if (timeline.isMinimized) {
    return (
      <View style={styles.rowMinimized}>
        <View style={[styles.colorSidebar, { backgroundColor: timeline.color }]} />
        <Pressable
          onPress={onToggleMinimize}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}
        >
          <Text style={[styles.rowLabel, { color: timeline.color }]}>
            {timeline.label}
          </Text>
          <ChevronDown size={14} color={C.muted} strokeWidth={2} style={{ marginLeft: 6 }} />
        </Pressable>
        {!isMain ? (
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Trash2 size={12} color={C.muted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.rowExpanded}>
      {/* Colored left sidebar */}
      <View style={[styles.colorSidebar, { backgroundColor: timeline.color }]} />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Header row */}
        <View style={styles.rowHeader}>
          {editingLabel ? (
            <TextInput
              value={labelText}
              onChangeText={setLabelText}
              onBlur={() => {
                setEditingLabel(false);
                if (labelText.trim()) onUpdateLabel(labelText.trim());
              }}
              autoFocus
              style={[styles.labelInput, { color: timeline.color }]}
            />
          ) : (
            <Pressable onPress={() => !isMain && setEditingLabel(true)}>
              <Text style={[styles.rowLabel, { color: timeline.color }]}>
                {timeline.label}
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable onPress={onToggleMinimize} style={styles.iconBtn}>
              <ChevronUp size={13} color={C.muted} strokeWidth={2} />
            </Pressable>
            {!isMain ? (
              <Pressable onPress={onDelete} style={styles.iconBtn}>
                <Trash2 size={13} color={C.muted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Scrollable timeline track */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 56 }}
          contentContainerStyle={{ width: totalScrollWidth, position: 'relative' }}
        >
          {/* Track line */}
          <View
            style={{
              position: 'absolute',
              top: 32,
              left: 0,
              width: totalScrollWidth,
              height: 2,
              backgroundColor: timeline.color,
              opacity: 0.5,
            }}
          />

          {/* Year notches */}
          {years.map((year, i) => (
            <View
              key={year}
              style={{
                position: 'absolute',
                left: i * YEAR_WIDTH,
                top: 0,
                width: YEAR_WIDTH,
                alignItems: 'center',
              }}
            >
              {/* Tick mark */}
              <View
                style={{
                  width: 1,
                  height: 10,
                  backgroundColor: timeline.color,
                  opacity: 0.6,
                  marginTop: 26,
                }}
              />
              <Text
                style={{
                  color: C.text,
                  fontSize: 9,
                  opacity: 0.7,
                  marginTop: 2,
                }}
              >
                {year}
              </Text>
            </View>
          ))}

          {/* Node dots on timeline */}
          {timedNodes.map((node) => {
            if (!node.timestamp) return null;
            const xPos = getTimelinePosition(
              node.timestamp,
              effectiveStart,
              effectiveEnd,
              totalScrollWidth
            );
            const dotColor = '#F59E0B'; // amber for evidence dots
            const label = node.title.length > 10 ? node.title.slice(0, 10) + '…' : node.title;
            return (
              <View
                key={node.id}
                style={{
                  position: 'absolute',
                  left: xPos - 4,
                  top: 4,
                  alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <Text style={{ color: dotColor, fontSize: 7, fontWeight: '700', marginBottom: 2, width: 50, textAlign: 'center' }} numberOfLines={1}>
                  {label}
                </Text>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: dotColor,
                    borderWidth: 1.5,
                    borderColor: C.bg,
                  }}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ---- Main TimelinePanel ----
interface TimelinePanelProps {
  investigationId: string;
  timelines: Timeline[];
  nodes: CanvasNode[];
  onAddTimeline: (label: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onToggleMinimized: (timelineId: string) => void;
  onUpdateTimeline: (timelineId: string, updates: Partial<Timeline>) => void;
}

export default function TimelinePanel({
  investigationId,
  timelines,
  nodes,
  onAddTimeline,
  onDeleteTimeline,
  onToggleMinimized,
  onUpdateTimeline,
}: TimelinePanelProps) {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');

  const handleAdd = useCallback(() => {
    const label = newLabel.trim() || `Timeline ${timelines.length + 1}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddTimeline(label);
    setNewLabel('');
    setShowAddModal(false);
  }, [newLabel, timelines.length, onAddTimeline]);

  return (
    <View style={styles.panel}>
      {/* Panel header */}
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>TIMELINE</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddModal(true);
          }}
          style={styles.addBtn}
          testID="add-timeline-button"
        >
          <Plus size={14} color={C.text} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Timeline rows */}
      <ScrollView
        style={{ maxHeight: 200 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {timelines.map((tl, idx) => (
          <TimelineRow
            key={tl.id}
            timeline={tl}
            nodes={nodes}
            isMain={idx === 0}
            onToggleMinimize={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleMinimized(tl.id);
            }}
            onDelete={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onDeleteTimeline(tl.id);
            }}
            onUpdateLabel={(label) => onUpdateTimeline(tl.id, { label })}
          />
        ))}
      </ScrollView>

      {/* Add timeline modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable onPress={() => {}} style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Timeline</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={18} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Timeline label (e.g. Person, Topic)"
              placeholderTextColor={C.muted}
              style={styles.modalInput}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: pressed ? '#A3162E' : C.red },
              ]}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                Add Timeline
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1A1614',
    borderTopWidth: 1,
    borderTopColor: '#3D332C',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  panelTitle: {
    color: '#6B5B4F',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3D332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMinimized: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  rowExpanded: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  colorSidebar: {
    width: 4,
    alignSelf: 'stretch',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 2,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelInput: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#6B5B4F',
    minWidth: 80,
    paddingVertical: 0,
  },
  iconBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3D332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#231F1C',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3D332C',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#1A1614',
    borderRadius: 10,
    padding: 14,
    color: '#E8DCC8',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3D332C',
    marginBottom: 16,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
