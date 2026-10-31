// Test double for react-native-webview: its native module isn't registered under jest.
const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn(), postMessage: jest.fn() }));
  return React.createElement(View, { testID: props.testID });
});

module.exports = { WebView, default: WebView };
