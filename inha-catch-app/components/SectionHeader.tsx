import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
}

export default function SectionHeader({ title, subtitle, rightSlot }: SectionHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.stone400 }]}>{title}</Text>
        {subtitle ? (
          <>
            <Text style={[styles.sep, { color: colors.stone300 }]}>─</Text>
            <Text style={[styles.subtitle, { color: colors.stone400 }]}>{subtitle}</Text>
          </>
        ) : null}
      </View>
      {rightSlot}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sep: {
    fontSize: 11,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
})
