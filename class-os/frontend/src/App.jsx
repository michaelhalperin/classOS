import { AuthProvider } from './context/AuthContext.jsx';
import { ClassProvider } from './context/ClassContext.jsx';
import AppRouter from './router/index.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ClassProvider>
        <AppRouter />
      </ClassProvider>
    </AuthProvider>
  );
}
