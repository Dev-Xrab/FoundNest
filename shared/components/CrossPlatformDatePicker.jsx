// Native pass-through — react-native-date-picker only supports
// Android/iOS (it throws "is not supported on this platform" on import for
// any other Platform.OS). The .web.jsx sibling provides the web fallback.
export { default } from "react-native-date-picker";
