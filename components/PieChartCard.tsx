import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export interface PieChartSliceData {
    key: string;
    label: string;
    count: number;
    color: string;
    lightBg: string;
    darkBg: string;
}

interface PieChartCardProps {
    title?: string;
    subtitle?: string;
    data: PieChartSliceData[];
    totalGoals: number;
    averagePercentage?: number;
    selectedFilter?: string;
}

const { width } = Dimensions.get('window');

export default function PieChartCard({
    title = "Developmental Improvement",
    subtitle = "Goals Status Distribution & Progress",
    data,
    totalGoals,
    averagePercentage,
    selectedFilter
}: PieChartCardProps) {
    const { resolvedTheme } = useTheme();
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    const chartSize = Math.min(width * 0.48, 190);
    const radius = chartSize / 2;
    const strokeWidth = 26;
    const innerRadius = radius - strokeWidth;
    const center = radius;

    // Filter non-zero items
    const nonZeroTotal = data.reduce((acc, item) => acc + item.count, 0);

    // Calculate polar coordinates for SVG slices
    let cumulativeAngle = -90; // Start at 12 o'clock

    const slices = data.map((item) => {
        const sliceAngle = nonZeroTotal > 0 ? (item.count / nonZeroTotal) * 360 : 0;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + sliceAngle;
        cumulativeAngle += sliceAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1Outer = center + radius * Math.cos(startRad);
        const y1Outer = center + radius * Math.sin(startRad);
        const x2Outer = center + radius * Math.cos(endRad);
        const y2Outer = center + radius * Math.sin(endRad);

        const x1Inner = center + innerRadius * Math.cos(endRad);
        const y1Inner = center + innerRadius * Math.sin(endRad);
        const x2Inner = center + innerRadius * Math.cos(startRad);
        const y2Inner = center + innerRadius * Math.sin(startRad);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

        const pathData = sliceAngle >= 359.99
            ? `M ${center} ${center - radius}
               A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius}
               L ${center - 0.01} ${center - innerRadius}
               A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius}
               Z`
            : `M ${x1Outer} ${y1Outer}
               A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
               L ${x1Inner} ${y1Inner}
               A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}
               Z`;

        const percent = nonZeroTotal > 0 ? Math.round((item.count / nonZeroTotal) * 100) : 0;

        return {
            ...item,
            pathData,
            percent,
            hasData: item.count > 0
        };
    });

    // Calculate computed overall improvement percentage if not provided
    const computedImprovement = React.useMemo(() => {
        if (averagePercentage !== undefined && averagePercentage !== null) {
            return Math.round(averagePercentage);
        }
        if (nonZeroTotal === 0) return 0;
        const achieved = data.find(d => d.key === 'Achieved' || d.key === 'A')?.count || 0;
        const developing = data.find(d => d.key === 'Developing' || d.key === 'D')?.count || 0;
        const emerging = data.find(d => d.key === 'Emerging' || d.key === 'E')?.count || 0;
        // Weighted progress score: Achieved = 100%, Developing = 65%, Emerging = 30%
        const score = (achieved * 100 + developing * 65 + emerging * 30) / nonZeroTotal;
        return Math.round(score);
    }, [data, nonZeroTotal, averagePercentage]);

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: '#05966918' }]}>
                        <Ionicons name="pie-chart" size={18} color="#059669" />
                    </View>
                    <View>
                        <ThemedText style={styles.title}>{title}</ThemedText>
                        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
                            {selectedFilter && selectedFilter !== 'All' ? `${selectedFilter}` : subtitle}
                        </ThemedText>
                    </View>
                </View>
                <View style={[styles.totalPill, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <ThemedText style={styles.totalPillText}>{totalGoals} Goals</ThemedText>
                </View>
            </View>

            {/* Centered Donut Chart */}
            <View style={styles.chartCenterContainer}>
                <View style={styles.chartWrapper}>
                    <Svg width={chartSize} height={chartSize}>
                        <G>
                            {nonZeroTotal === 0 ? (
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={(radius + innerRadius) / 2}
                                    stroke={resolvedTheme === 'dark' ? '#334155' : '#e2e8f0'}
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                />
                            ) : (
                                slices.map((slice, idx) => {
                                    if (!slice.hasData) return null;
                                    return (
                                        <Path
                                            key={idx}
                                            d={slice.pathData}
                                            fill={slice.color}
                                        />
                                    );
                                })
                            )}
                        </G>
                    </Svg>

                    {/* Donut Center Display */}
                    <View style={[styles.donutCenter, { width: innerRadius * 2 - 4, height: innerRadius * 2 - 4, borderRadius: innerRadius }]}>
                        <ThemedText style={[styles.donutCenterValue, { color: computedImprovement >= 50 ? '#10b981' : primaryColor }]}>
                            {computedImprovement}%
                        </ThemedText>
                        <ThemedText style={[styles.donutCenterLabel, { color: textSecondary }]}>
                            Improvement
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* 2x2 Grid Legend: Achieved, Developed, Emerging, Not Started */}
            <View style={styles.gridLegendContainer}>
                {data.map((item, idx) => {
                    const percent = nonZeroTotal > 0 ? Math.round((item.count / nonZeroTotal) * 100) : 0;
                    const isDark = resolvedTheme === 'dark';
                    const badgeBg = isDark ? item.darkBg : item.lightBg;

                    return (
                        <View key={idx} style={[styles.gridLegendItem, { backgroundColor: badgeBg, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <View style={styles.gridLegendTop}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <ThemedText style={[styles.gridLegendLabel, { color: textColor }]} numberOfLines={1}>
                                    {item.label}
                                </ThemedText>
                            </View>
                            <View style={styles.gridLegendBottom}>
                                <ThemedText style={[styles.gridLegendCount, { color: item.color }]}>
                                    {item.count}
                                </ThemedText>
                                <ThemedText style={[styles.gridLegendPercent, { color: item.color }]}>
                                    ({percent}%)
                                </ThemedText>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    totalPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    totalPillText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#2563eb',
    },
    chartCenterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    chartWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    donutCenter: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    donutCenterValue: {
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 28,
    },
    donutCenterLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    gridLegendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 14,
    },
    gridLegendItem: {
        width: '48%',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
    },
    gridLegendTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    gridLegendLabel: {
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },
    gridLegendBottom: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    gridLegendCount: {
        fontSize: 15,
        fontWeight: '900',
    },
    gridLegendPercent: {
        fontSize: 12,
        fontWeight: '800',
    },
});
