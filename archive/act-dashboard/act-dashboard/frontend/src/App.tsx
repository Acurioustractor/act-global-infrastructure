import { GoalsProgress } from './components/GoalsProgress';
import { EcosystemHealth } from './components/EcosystemHealth';
import { AlertsPanel } from './components/AlertsPanel';
import { SummaryStats } from './components/SummaryStats';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>ACT Brain Center</h1>
        <div className="header-meta">
          <span className="pulse-dot" />
          <span>Live</span>
        </div>
      </header>

      <SummaryStats />

      <div className="dashboard-grid">
        <div className="grid-col">
          <GoalsProgress />
        </div>
        <div className="grid-col">
          <AlertsPanel />
        </div>
      </div>

      <EcosystemHealth />
    </div>
  );
}

export default App;
