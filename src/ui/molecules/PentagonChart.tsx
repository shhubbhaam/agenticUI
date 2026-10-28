import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { polygonVertices, valuePolygon, pointsToString } from '../../core/geometry/radar';

export interface PentagonAxis {
  label: string;
  // 0..1
  value: number;
}

interface PentagonChartProps {
  // 3 to 5 axes, clockwise from the top. Outside that range the chart renders nothing.
  axes: PentagonAxis[];
  accessibilityLabel?: string;
}

// Geometry measured from the Figma radar export (350x225 canvas): outline radius
// 76.5 around (175.5, 110.5); inner guide rings at 62.4% and 31.2% of it.
const WIDTH = 350;
const HEIGHT = 225;
const CX = 175.5;
const CY = 110.5;
const RADIUS = 76.5;
const RING_FRACTIONS = [1, 0.6245, 0.3116];

// Axis labels sit just outside the outline, centred on the axis direction.
// Pushed out a little further than the outline radius; clamped into the canvas.
const LABEL_RADIUS = RADIUS + 28;
function labelCenters(count: number): { x: number; y: number }[] {
  return polygonVertices(count, LABEL_RADIUS, CX, CY).map((p) => ({
    x: Math.max(LABEL_WIDTH / 2, Math.min(WIDTH - LABEL_WIDTH / 2, p.x)),
    y: Math.max(LABEL_HEIGHT / 2, Math.min(HEIGHT - LABEL_HEIGHT / 2, p.y)),
  }));
}
const LABEL_WIDTH = 70;
const LABEL_HEIGHT = 14;

export const PentagonChart: React.FC<PentagonChartProps> = ({ axes: allAxes, accessibilityLabel }) => {
  // Despite the name this draws a regular N-gon (N = 3..5).
  const axes = allAxes.slice(0, 5);
  if (axes.length < 3) return null;
  const centers = labelCenters(axes.length);
  const dataPoints = valuePolygon(axes.map((a) => a.value), RADIUS, CX, CY);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ?? axes.map((a) => `${a.label} ${Math.round(a.value * 100)} percent`).join(', ')
      }
      style={{ width: '100%', aspectRatio: WIDTH / HEIGHT }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {RING_FRACTIONS.map((fraction) => (
          <Polygon
            key={fraction}
            points={pointsToString(polygonVertices(axes.length, RADIUS * fraction, CX, CY))}
            fill="none"
            stroke={colors.profile.radar.ring}
            strokeWidth={0.957}
            strokeLinejoin="round"
          />
        ))}
        <Polygon
          points={pointsToString(dataPoints)}
          fill={colors.profile.radar.fill}
          fillOpacity={0.1647}
          stroke={colors.profile.radar.stroke}
          strokeWidth={1.915}
          strokeLinejoin="round"
        />
      </Svg>
      {axes.map((axis, i) => (
        <Text
          key={`${i}-${axis.label}`}
          numberOfLines={2}
          // Labels sit in fixed boxes around the chart; cap OS font scaling so they can't spill out.
          maxFontSizeMultiplier={1.2}
          style={{
            position: 'absolute',
            width: `${(LABEL_WIDTH / WIDTH) * 100}%`,
            left: `${((centers[i].x - LABEL_WIDTH / 2) / WIDTH) * 100}%`,
            top: `${((centers[i].y - LABEL_HEIGHT / 2) / HEIGHT) * 100}%`,
            textAlign: 'center',
            fontFamily: typography.fontFamily.jakarta,
            color: colors.profile.radar.label,
            ...typography.fontSize['type-10'],
          }}
        >
          {axis.label}
        </Text>
      ))}
    </View>
  );
};
