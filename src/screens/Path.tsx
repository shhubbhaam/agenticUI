import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Bell,
  BookOpen,
  Dumbbell,
  Headphones,
  Play,
  LockKeyhole,
  Flame,
  Gem,
  ChevronDown,
} from 'lucide-react-native';
import twrnc from 'twrnc';
const s = twrnc;

type Lesson = {
  title: string;
  icon: 'dumbbell' | 'headphones' | 'play' | 'lock';
  status: 'completed' | 'active' | 'locked';
};

const lessons: Lesson[] = [
  { title: 'Neural\nNetworks', icon: 'dumbbell', status: 'completed' },
  { title: 'Tokenization', icon: 'headphones', status: 'completed' },
  { title: 'Transformer\nArchitecture', icon: 'play', status: 'active' },
  { title: 'Attention\nMechanism', icon: 'play', status: 'locked' },
  { title: 'Fine-tuning', icon: 'play', status: 'locked' },
  { title: 'RLHF', icon: 'dumbbell', status: 'locked' },
  { title: 'Model\nEvaluation', icon: 'headphones', status: 'locked' },
  { title: 'Deployment', icon: 'play', status: 'locked' },
];

const getLessonIcon = (
  icon: Lesson['icon'],
  color: string,
  size: number = 24,
) => {
  switch (icon) {
    case 'dumbbell':
      return <Dumbbell size={size} color={color} strokeWidth={2.4} />;
    case 'headphones':
      return <Headphones size={size} color={color} strokeWidth={2.4} />;
    case 'play':
      return <Play size={size} color={color} fill={color} strokeWidth={2} />;
    case 'lock':
      return <LockKeyhole size={size} color={color} strokeWidth={2.4} />;
    default:
      return null;
  }
};

/* ---------------------------------------------------------------------- */
/* Decorative floating blobs used behind the whole screen for visual depth */
/* ---------------------------------------------------------------------- */
const BackgroundAbstracts = () => (
  <View
    pointerEvents="none"
    style={s`absolute inset-0 overflow-hidden`}>
    {/* big soft blob, top right */}
    <View
      style={[
        s`absolute bg-sky-200/40`,
        {
          width: 260,
          height: 260,
          top: -90,
          right: -80,
          borderTopLeftRadius: 130,
          borderTopRightRadius: 90,
          borderBottomLeftRadius: 90,
          borderBottomRightRadius: 140,
          transform: [{ rotate: '18deg' }],
        },
      ]}
    />
    {/* mid blob, left side */}
    <View
      style={[
        s`absolute bg-indigo-100/60`,
        {
          width: 180,
          height: 180,
          top: 260,
          left: -70,
          borderTopLeftRadius: 90,
          borderTopRightRadius: 60,
          borderBottomLeftRadius: 100,
          borderBottomRightRadius: 70,
          transform: [{ rotate: '-12deg' }],
        },
      ]}
    />
    {/* small blob, right side lower */}
    <View
      style={[
        s`absolute bg-sky-100/70`,
        {
          width: 140,
          height: 140,
          top: 620,
          right: -50,
          borderTopLeftRadius: 70,
          borderTopRightRadius: 50,
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 80,
          transform: [{ rotate: '25deg' }],
        },
      ]}
    />
    {/* faint dotted texture, scattered small circles */}
    {[...Array(10)].map((_, i) => (
      <View
        key={i}
        style={[
          s`absolute rounded-full bg-sky-300/30`,
          {
            width: 6 + (i % 3) * 3,
            height: 6 + (i % 3) * 3,
            top: 40 + i * 95,
            left: i % 2 === 0 ? 24 + i * 4 : undefined,
            right: i % 2 !== 0 ? 24 + i * 3 : undefined,
          },
        ]}
      />
    ))}
    {/* large faint ring outline for extra depth */}
    <View
      style={[
        s`absolute rounded-full border-[10px] border-sky-100/50`,
        { width: 220, height: 220, top: 900, left: -60 },
      ]}
    />
  </View>
);

/* ---------------------------------------------------------------------- */
/* 3D lesson node                                                          */
/* ---------------------------------------------------------------------- */
const LessonNode = ({ lesson, index }: { lesson: Lesson; index: number }) => {
  const isActive = lesson.status === 'active';
  const isCompleted = lesson.status === 'completed';
  const isLocked = lesson.status === 'locked';

  const amplitude = 65;
  const horizontalOffset = Math.round(
    Math.sin((index * Math.PI) / 2) * amplitude,
  );

  const NODE_SIZE = 68;

  const baseColor = isCompleted
    ? '#0ea5e9'
    : isActive
    ? '#38bdf8'
    : '#f1f5f9';

  const rimColor = isCompleted
    ? '#0c4a6e'
    : isActive
    ? '#075985'
    : '#cbd5e1';

  const shadowColor = isCompleted || isActive ? '#0c4a6e' : '#94a3b8';

  return (
    <View
      style={[
        s`items-center w-full ${index === 0 ? 'mt-6' : 'mt-2'}`,
        { transform: [{ translateX: horizontalOffset }] },
      ]}>
      {/* Node stack: floor shadow + rim + sphere + gloss */}
      <View
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE + 10,
          alignItems: 'center',
        }}>
        {/* soft cast shadow puddle underneath, gives it a "resting on ground" feel */}
        <View
          style={[
            s`absolute rounded-full`,
            {
              width: NODE_SIZE * 0.7,
              height: 16,
              bottom: 0,
              backgroundColor: shadowColor,
              opacity: isLocked ? 0.12 : 0.25,
              transform: [{ scaleX: 1.1 }],
            },
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          style={{ width: NODE_SIZE, height: NODE_SIZE }}>
          {/* rim / base layer sits slightly lower to fake extrusion depth */}
          <View
            style={[
              s`absolute rounded-full`,
              {
                width: NODE_SIZE,
                height: NODE_SIZE,
                top: 7,
                backgroundColor: rimColor,
              },
            ]}
          />

          {/* main sphere: flat base color + layered overlays fake a lit, 3D sphere */}
          <View
            style={[
              s`rounded-full items-center justify-center overflow-hidden`,
              {
                width: NODE_SIZE,
                height: NODE_SIZE,
                backgroundColor: baseColor,
                shadowColor,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: isLocked ? 0.15 : 0.4,
                shadowRadius: 8,
                elevation: isLocked ? 3 : 7,
              },
            ]}>
            {/* lighter wash over the upper half to fake a light source from above */}
            <View
              style={[
                s`absolute top-0 left-0 right-0 bg-white`,
                { height: NODE_SIZE * 0.42, opacity: isLocked ? 0.25 : 0.22 },
              ]}
            />
            {/* darker wash over the lower half to fake falloff / shading */}
            <View
              style={[
                s`absolute bottom-0 left-0 right-0 bg-black`,
                { height: NODE_SIZE * 0.3, opacity: 0.12 },
              ]}
            />
            {/* small crisp gloss highlight, curved like light hitting a sphere */}
            <View
              style={[
                s`absolute rounded-full bg-white`,
                {
                  width: 36,
                  height: 18,
                  top: 9,
                  left: 14,
                  opacity: isLocked ? 0.4 : 0.55,
                  transform: [{ rotate: '-20deg' }],
                },
              ]}
            />

            {getLessonIcon(
              lesson.icon,
              isCompleted || isActive ? '#ffffff' : '#94a3b8',
              32,
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Lesson Title Badge */}
      <View
        style={s`
          mt-2
          px-2.5
          py-1
          rounded-md
          items-center
          ${isActive ? 'bg-sky-100' : 'bg-transparent'}
        `}>
        <Text
          style={s`
            text-center
            text-[12px]
            leading-[15px]
            ${
              isActive
                ? 'text-sky-800 font-bold'
                : isCompleted
                ? 'text-slate-800 font-semibold'
                : 'text-slate-400 font-medium'
            }
          `}>
          {lesson.title}
        </Text>
      </View>
    </View>
  );
};

export default function Path() {
  return (
    <SafeAreaView style={s`flex-1 bg-slate-50`}>
      <BackgroundAbstracts />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s`pb-12`}>
        {/* Header */}
        <View
          style={s`
            h-14
            px-4
            flex-row
            items-center
            justify-between
            bg-white
            border-b
            border-slate-100
          `}>
          <Text style={s`text-[20px] font-bold text-sky-800`}>
            AI Launchpad
          </Text>

          <TouchableOpacity activeOpacity={0.7} style={s`p-2`}>
            <Bell size={20} color="#475569" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Top Stats Strip */}
        <View
          style={s`
            h-12
            px-6
            flex-row
            items-center
            justify-between
            bg-white
            border-b
            border-slate-100
            shadow-sm
          `}>
          <View style={s`flex-row items-center`}>
            <BookOpen size={16} color="#0284c7" strokeWidth={2.2} />
            <Text style={s`text-xs font-bold text-slate-700 ml-1.5`}>12</Text>
          </View>

          <View style={s`flex-row items-center`}>
            <Flame size={17} color="#f97316" fill="#f97316" strokeWidth={2} />
            <Text style={s`text-xs font-bold text-orange-500 ml-1`}>5</Text>
          </View>

          <View style={s`flex-row items-center`}>
            <Gem size={16} color="#0284c7" fill="#0284c7" strokeWidth={2} />
            <Text style={s`text-xs font-bold text-sky-700 ml-1`}>1,024</Text>
          </View>
        </View>

        {/* Roadmap Unit Banner */}
        <View
          style={s`
            mx-4
            mt-5
            h-20
            rounded-2xl
            bg-sky-700
            border-b-4
            border-sky-900
            px-4
            flex-row
            items-center
            justify-between
            shadow-md
            overflow-hidden
          `}>
          {/* diagonal light wash to fake a gradient without the library */}
          <View
            style={[
              s`absolute -top-6 -left-6 rounded-full bg-white/10`,
              { width: 140, height: 140, transform: [{ rotate: '20deg' }] },
            ]}
          />
          <View>
            <Text
              style={s`text-[10px] font-bold tracking-wider text-sky-200 uppercase mb-0.5`}>
              Section 1, Unit 1
            </Text>
            <Text style={s`text-lg font-bold text-white`}>
              AI Fundamentals
            </Text>
          </View>

          <View
            style={s`
              w-10
              h-10
              rounded-xl
              bg-white/15
              items-center
              justify-center
            `}>
            <BookOpen size={20} color="white" strokeWidth={2} />
          </View>
        </View>

        {/* Roadmap Path */}
        <View style={s`mt-4 px-4`}>
          {lessons.map((lesson, index) => (
            <LessonNode key={lesson.title} lesson={lesson} index={index} />
          ))}
        </View>

        {/* Unit Completion Box */}
        <View style={s`items-center mt-8`}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={s`
              w-16
              h-16
              rounded-2xl
              border-2
              border-b-4
              border-slate-300
              bg-white
              items-center
              justify-center
              shadow-sm
            `}>
            <LockKeyhole size={24} color="#94a3b8" strokeWidth={2.2} />
          </TouchableOpacity>

          <Text style={s`text-xs font-semibold text-slate-500 mt-2`}>
            Unit 1 Completion
          </Text>
        </View>
      </ScrollView>

      {/* Floating Action / Scroll Hint */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={s`
          absolute
          right-4
          bottom-6
          w-11
          h-11
          rounded-full
          bg-white
          border-b-2
          border-slate-200
          items-center
          justify-center
          shadow-lg
        `}>
        <ChevronDown size={22} color="#0284c7" strokeWidth={2.4} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}