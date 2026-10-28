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
  // Exactly five axes, clockwise from the top.
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

// Centre point of each axis label in the 350x225 canvas.
const LABEL_CENTERS = [
  { x: 175, y: 14.5 },
  { x: 279, y: 84 },
  { x: 242, y: 202 },
  { x: 96, y: 202 },
  { x: 68, y: 84 },
];
const LABEL_WIDTH = 70;
const LABEL_HEIGHT = 14;

export const PentagonChart: React.FC<PentagonChartProps> = ({ axes, accessibilityLabel }) => {
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
            points={pointsToString(polygonVertices(5, RADIUS * fraction, CX, CY))}
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
      {axes.slice(0, 5).map((axis, i) => (
        <Text
          key={axis.label}
          style={{
            position: 'absolute',
            width: `${(LABEL_WIDTH / WIDTH) * 100}%`,
            left: `${((LABEL_CENTERS[i].x - LABEL_WIDTH / 2) / WIDTH) * 100}%`,
            top: `${((LABEL_CENTERS[i].y - LABEL_HEIGHT / 2) / HEIGHT) * 100}%`,
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
