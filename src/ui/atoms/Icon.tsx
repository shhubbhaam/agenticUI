import React from 'react';
import { Dumbbell, Play, LockKeyhole } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

export type IconType =
  | 'dumbbell'
  | 'play'
  | 'lock'
  // Path screen redesign glyphs — hand-converted from the exact Figma-exported
  // SVGs (source: AI Launchpad — Mobile Design System, node 18:407/18:107/18:604).
  // No svg-transformer is configured in metro.config.js, so raw .svg files can't
  // be imported directly; these reproduce the same path data as <Svg><Path/></Svg>.
  | 'blocks'
  | 'brief'
  | 'layers'
  | 'workflow'
  | 'agents'
  | 'shield'
  | 'chart'
  | 'capstone'
  | 'chevron'
  | 'check'
  | 'file'
  | 'slides'
  | 'edit'
  | 'headphones'
  | 'arrow'
  | 'plus'
  | 'route';

export interface IconProps {
  name: IconType;
  color: string;
  size?: number;
}

const FIGMA_PATHS: Partial<Record<IconType, { viewBox: string; d: string; strokeWidth: number }>> = {
  blocks: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M3.125 3.125H10.4167V10.4167H3.125V3.125ZM14.5833 3.125H21.875V10.4167H14.5833V3.125ZM3.125 14.5833H10.4167V21.875H3.125V14.5833ZM14.5833 14.5833H21.875V21.875H14.5833V14.5833Z' },
  brief: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M9.375 4.16667V2.08333H15.625V4.16667M8.33333 9.375H16.6667M8.33333 13.5417H16.6667M8.33333 17.7083H13.5417M5.20833 4.16667H19.7917V21.875H5.20833V4.16667Z' },
  layers: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M2.08333 12.5L12.5 17.7083L22.9167 12.5M2.08333 16.6667L12.5 21.875L22.9167 16.6667M12.5 3.125L22.9167 8.33333L12.5 13.5417L2.08333 8.33333L12.5 3.125Z' },
  workflow: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M6.25 9.375V18.75H15.625M9.375 6.25H18.75V15.625M3.125 3.125H9.375V9.375H3.125V3.125ZM15.625 15.625H21.875V21.875H15.625V15.625Z' },
  agents: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M12.5 3.125V8.33333M5.20833 16.6667L9.375 11.4583M19.7917 16.6667L15.625 11.4583M16.6667 16.6667H22.9167V21.875H16.6667M9.375 8.33333H15.625V13.5417H9.375V8.33333ZM2.08333 16.6667H8.33333V21.875H2.08333V16.6667Z' },
  shield: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M8.33333 12.5L11.4583 15.625L16.6667 9.375M12.5 2.08333L20.8333 5.20833V11.4583C20.8333 16.6667 16.6667 20.8333 12.5 22.9167C8.33333 20.8333 4.16667 16.6667 4.16667 11.4583V5.20833L12.5 2.08333Z' },
  chart: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M4.16667 20.8333V10.4167H8.33333V20.8333M10.4167 20.8333V5.20833H14.5833V20.8333M16.6667 20.8333V2.08333H20.8333V20.8333M2.08333 22.9167H22.9167' },
  capstone: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M3.125 7.29167V17.7083L12.5 22.9167L21.875 17.7083V7.29167L12.5 2.08333L3.125 7.29167ZM21.875 7.29167L12.5 12.5M12.5 22.9167V12.5M3.125 7.29167L12.5 12.5' },
  chevron: { viewBox: '0 0 14 14', strokeWidth: 1.05, d: 'M5.25 2.91667L9.33333 7L5.25 11.0833' },
  check: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M5.20833 12.5L9.375 16.6667L19.7917 6.25' },
  file: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M14.5833 2.08333H5.20833V22.9167H19.7917V7.29167L14.5833 2.08333ZM14.5833 2.08333V8.33333H19.7917M8.33333 12.5H16.6667M8.33333 16.6667H14.5833' },
  slides: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M7.29167 21.875H17.7083M12.5 17.7083V21.875M7.29167 7.29167H13.5417M7.29167 11.4583H17.7083M3.125 3.125H21.875V17.7083H3.125V3.125Z' },
  edit: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M12.5 6.25L18.75 12.5M15.625 3.125L21.875 9.375L9.375 21.875H3.125V15.625L15.625 3.125Z' },
  headphones: { viewBox: '0 0 25 25', strokeWidth: 1.875, d: 'M4.16667 14.5833V11.4583C4.16667 9.2482 5.04464 7.12858 6.60744 5.56578C8.17025 4.00297 10.2899 3.125 12.5 3.125C14.7101 3.125 16.8298 4.00297 18.3926 5.56578C19.9554 7.12858 20.8333 9.2482 20.8333 11.4583V14.5833M20.8333 12.5H22.9167V20.8333H17.7083V12.5M4.16667 12.5H2.08333V20.8333H7.29167V12.5H4.16667Z' },
  arrow: { viewBox: '0 0 18 18', strokeWidth: 1.35, d: 'M3 9H15M10.5 13.5L15 9L10.5 4.5' },
  plus: { viewBox: '0 0 15 15', strokeWidth: 1.125, d: 'M7.5 2.5V12.5M2.5 7.5H12.5' },
  route: { viewBox: '0 0 20 20', strokeWidth: 1.83333, d: 'M5.83333 3.33333C5.82237 2.89505 5.63916 2.47874 5.32339 2.1746C5.00763 1.87046 4.58474 1.70298 4.14635 1.70846C3.70797 1.71394 3.2894 1.89194 2.98133 2.20388C2.67327 2.51582 2.50052 2.93658 2.50052 3.375C2.50052 3.81342 2.67327 4.23418 2.98133 4.54612C3.2894 4.85806 3.70797 5.03606 4.14635 5.04154C4.58474 5.04702 5.00763 4.87954 5.32339 4.5754C5.63916 4.27126 5.82237 3.85495 5.83333 3.41667M14.1667 15C14.1557 14.5617 13.9725 14.1454 13.6567 13.8413C13.341 13.5371 12.9181 13.3696 12.4797 13.3751C12.0413 13.3806 11.6227 13.5586 11.3147 13.8705C11.0066 14.1825 10.8339 14.6032 10.8339 15.0417C10.8339 15.4801 11.0066 15.9008 11.3147 16.2128C11.6227 16.5247 12.0413 16.7027 12.4797 16.7082C12.9181 16.7137 13.341 16.5462 13.6567 16.2421C13.9725 15.9379 14.1557 15.5216 14.1667 15.0833M5.83333 5.83333V8.33333C5.83333 8.99637 6.09673 9.63226 6.56557 10.1011C7.03441 10.5699 7.67029 10.8333 8.33333 10.8333H11.6667C12.3297 10.8333 12.9656 11.0967 13.4344 11.5656C13.9033 12.0344 14.1667 12.6703 14.1667 13.3333' },
};

export const Icon: React.FC<IconProps> = ({ name, color, size = 24 }) => {
  switch (name) {
    case 'dumbbell':
      return <Dumbbell size={size} color={color} strokeWidth={2.4} />;
    case 'play':
      return <Play size={size} color={color} fill={color} strokeWidth={2} />;
    case 'lock':
      return <LockKeyhole size={size} color={color} strokeWidth={2.4} />;
    default: {
      const spec = FIGMA_PATHS[name];
      if (!spec) return null;
      return (
        <Svg width={size} height={size} viewBox={spec.viewBox} fill="none">
          <Path d={spec.d} stroke={color} strokeWidth={spec.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    }
  }
};
