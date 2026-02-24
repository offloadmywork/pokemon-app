import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { pokemonAPI } from '@/api/client';
import { setTeamApiClient } from '@/game/team';
import { setProgressApiClient } from '@/game/progress';

// Initialize API clients on app load
setTeamApiClient(pokemonAPI);
setProgressApiClient(pokemonAPI);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
