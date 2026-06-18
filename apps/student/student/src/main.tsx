import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../../../../src/index.css';
import StudentStandaloneApp from './StudentStandaloneApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudentStandaloneApp />
  </StrictMode>
);
