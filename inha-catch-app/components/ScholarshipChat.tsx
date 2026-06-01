import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Send, Sparkles } from 'lucide-react-native'
import api from '@/api/axios'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'

type Msg = { role: 'user' | 'model'; text: string }

const PRESETS = ['이 공고 자격이 되나요?', '필요한 서류는?', '준비할 점 알려줘']

export default function ScholarshipChat({ scholarshipId }: { scholarshipId: number }) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setError(null)
    const nextHistory: Msg[] = [...messages, { role: 'user', text: q }]
    setMessages(nextHistory)
    setInput('')
    setLoading(true)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    try {
      const res = await api.post(`/api/scholarships/${scholarshipId}/chat`, {
        question: q,
        history: messages,
      })
      const answer = res.data?.answer ?? '응답이 비어있습니다.'
      setMessages([...nextHistory, { role: 'model', text: answer }])
    } catch (e: any) {
      if (e.response?.status === 429) {
        setError(e.response?.data?.message || '잠시 후 다시 시도해주세요.')
      } else {
        setError('답변을 가져오지 못했어요.')
      }
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={14} strokeWidth={1.5} color={colors.signal} />
        <Text style={[styles.title, { color: colors.stone400 }]}>AI에게 물어보기 ─ ASK AI</Text>
      </View>

      {messages.length === 0 && !loading && (
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => send(p)}
              style={[styles.presetChip, { backgroundColor: colors.signalSoft, borderColor: colors.stone100 }]}
            >
              <Text style={[styles.presetText, { color: colors.signal }]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {messages.length > 0 && (
        <ScrollView
          ref={scrollRef}
          style={[styles.messages, { backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
          contentContainerStyle={{ padding: 12, gap: 8 }}
        >
          {messages.map((m, idx) => (
            <View
              key={idx}
              style={[
                styles.bubble,
                m.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: colors.ink }
                  : { alignSelf: 'flex-start', backgroundColor: colors.paperCard, borderColor: colors.stone100, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: m.role === 'user' ? colors.paper : colors.ink },
                ]}
              >
                {m.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.bubble, { alignSelf: 'flex-start', backgroundColor: colors.paperCard, borderColor: colors.stone100, borderWidth: 1 }]}>
              <ActivityIndicator size="small" color={colors.signal} />
            </View>
          )}
        </ScrollView>
      )}

      {error && <Text style={[styles.errorText, { color: colors.critical }]}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.ink,
              backgroundColor: colors.stone50,
              borderColor: colors.stone100,
            },
          ]}
          placeholder="궁금한 점을 입력하세요"
          placeholderTextColor={colors.stone300}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          editable={!loading}
          maxLength={400}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={loading || !input.trim()}
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.ink,
              opacity: loading || !input.trim() ? 0.4 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.paper} />
          ) : (
            <Send size={16} strokeWidth={1.5} color={colors.paper} />
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  presetText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  messages: {
    maxHeight: 280,
    borderWidth: 1,
    borderRadius: 12,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
})
