import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toasts } from './components/Toasts';
import { ControllerView } from './controller/ControllerView';
import { useApp } from './store';
import { TableView } from './table/TableView';
import { applyTheme, DEFAULT_THEME_ID } from './themes';

export function App() {
  const themeId = useApp((s) => s.room?.themeId);

  // Host-selected theme is broadcast with room:state; every screen applies it.
  useEffect(() => {
    applyTheme(themeId ?? DEFAULT_THEME_ID);
  }, [themeId]);

  return (
    <>
      <Routes>
        <Route path="/" element={<TableView />} />
        <Route path="/join/:roomCode" element={<ControllerView />} />
      </Routes>
      <Toasts />
    </>
  );
}
