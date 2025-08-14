module.exports = {
  __esModule: true,
  default: {},
  View: () => null,
  useSharedValue: (init = 0) => ({ value: init }),
  useAnimatedStyle: () => ({}),
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDelay: (_t, v) => v,
  Easing: { linear: () => {} },
  runOnJS: (fn) => fn,
  interpolate: (_x, _in, out) => (out ? out[0] : 0),
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
};


