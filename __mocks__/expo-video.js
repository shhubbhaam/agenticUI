// Test double for expo-video: a player whose events tests fire by hand (player.emit).
const React = require('react');
const { View } = require('react-native');

function createPlayer(source) {
  const listeners = {};
  const player = {
    source, currentTime: 0, duration: 0, playing: false, loop: true,
    play: jest.fn(() => { player.playing = true; }),
    pause: jest.fn(() => { player.playing = false; }),
    addListener: (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); return { remove: () => { listeners[name] = listeners[name].filter((f) => f !== fn); } }; },
    emit: (name, payload) => (listeners[name] || []).forEach((f) => f(payload)),
  };
  return player;
}
const created = [];
module.exports = {
  __created: created,
  useVideoPlayer: (source, setup) => {
    const ref = React.useRef(null);
    if (!ref.current) { ref.current = createPlayer(source); if (setup) setup(ref.current); created.push(ref.current); }
    return ref.current;
  },
  VideoView: (props) => React.createElement(View, { ...props, testID: 'video-view' }),
};
