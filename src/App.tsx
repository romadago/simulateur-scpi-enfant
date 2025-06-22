import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const tippyCustomTheme = `
  .tippy-box[data-theme~='custom'] {
      background-color: #2c3e50;
      color: white;
      font-weight: 600;
  }
  .tippy-box[data-theme~='custom'][data-placement^='top'] > .tippy-arrow::before {
      border-top-color: #2c3e50;
  }
`;

interface Parametre {
  id: keyof typeof initialValues;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
}

type ProfilName = 'Prudent' | 'Équilibré' | 'Dynamique';
type Results = Record<ProfilName, number>;

const initialValues = {
  capitalInitial: 10000,
  capitalVise: 200000,
  dureeEpargne: 15,
};

const profils: Record<ProfilName, number> = {
  Prudent: 0.04,
  'Équilibré': 0.06,
  Dynamique: 0.08,
};

const TAUX_LIVRET_MOYEN = 0.02;

const profilStyles: Record<ProfilName, { card: string; title: string; value: string; lineChartBorder: string; lineChartBg: string; }> = {
  Prudent: { card: 'bg-sky-100', title: 'text-sky-900', value: 'text-sky-900', lineChartBorder: 'rgb(56, 189, 248)', lineChartBg: 'rgba(56, 189, 248, 0.2)' },
  'Équilibré': { card: 'bg-emerald-100', title: 'text-emerald-900', value: 'text-emerald-900', lineChartBorder: 'rgb(16, 185, 129)', lineChartBg: 'rgba(16, 185, 129, 0.2)' },
  Dynamique: { card: 'bg-rose-100', title: 'text-rose-900', value: 'text-rose-900', lineChartBorder: 'rgb(244, 63, 94)', lineChartBg: 'rgba(244, 63, 94, 0.2)' },
};

const App: React.FC = () => {
  const [values, setValues] = useState(initialValues);
  const [results, setResults] = useState<Results>({ Prudent: 0, 'Équilibré': 0, Dynamique: 0 });
  const [selectedProfile, setSelectedProfile] = useState<ProfilName | null>(null);
  const [lineChartData, setLineChartData] = useState<any>({ labels: [], datasets: [] });
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const parametres: Parametre[] = [
    { id: 'capitalInitial', label: 'Capital initial', unit: '€', min: 0, max: 200000, step: 1000, tooltip: 'La somme que vous avez déjà de côté pour ce projet.' },
    { id: 'capitalVise', label: 'Objectif de capital à atteindre', unit: '€', min: 10000, max: 1000000, step: 10000, tooltip: 'La somme que vous souhaitez avoir à la fin de la période.' },
    { id: 'dureeEpargne', label: 'Durée de l\'épargne', unit: 'ans', min: 5, max: 40, step: 1, tooltip: 'Le nombre d\'années pendant lesquelles vous allez épargner.' },
  ];
  
  const calculerValeurFutureCapitalInitial = (capital: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (capital <= 0) return 0;
    return capital * Math.pow(1 + tauxAnnuel, dureeEnAnnees);
  };

  const calculerValeurFutureVersements = (versementMensuel: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (versementMensuel <= 0 || dureeEnAnnees <= 0) return 0;
    const tauxMensuel = tauxAnnuel / 12;
    const nombreDeMois = dureeEnAnnees * 12;
    return versementMensuel * (Math.pow(1 + tauxMensuel, nombreDeMois) - 1) / tauxMensuel;
  };
  
  const calculerVersementMensuel = (capitalFinalVise: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (dureeEnAnnees <= 0) return 0;
    if (tauxAnnuel <= 0) return capitalFinalVise > 0 ? capitalFinalVise / (dureeEnAnnees * 12) : 0;
    const r = tauxAnnuel / 12;
    const n = dureeEnAnnees * 12;
    const denominateur = (Math.pow(1 + r, n) - 1) / r;
    return denominateur > 0 ? capitalFinalVise / denominateur : 0;
  };

  useEffect(() => {
    const nouveauxResultats: Partial<Results> = {};
    for (const entry of Object.entries(profils)) {
      const [nomProfil, tauxAnnuel] = entry as [ProfilName, number];
      const fvCapitalInitial = calculerValeurFutureCapitalInitial(values.capitalInitial, tauxAnnuel, values.dureeEpargne);
      const capitalACreer = Math.max(0, values.capitalVise - fvCapitalInitial);
      nouveauxResultats[nomProfil] = calculerVersementMensuel(capitalACreer, tauxAnnuel, values.dureeEpargne);
    }
    setResults(nouveauxResultats as Results);
  }, [values]);

  useEffect(() => {
    if (!selectedProfile) return;

    const labels = Array.from({ length: values.dureeEpargne + 1 }, (_, i) => `Année ${i}`);
    const profilDataPoints = [];
    const livretDataPoints = [];
    
    const effortMensuelProfil = results[selectedProfile] || 0;
    const tauxProfil = profils[selectedProfile] || 0;

    for (let annee = 0; annee <= values.dureeEpargne; annee++) {
      const fvProfilInitial = calculerValeurFutureCapitalInitial(values.capitalInitial, tauxProfil, annee);
      const fvProfilVersements = calculerValeurFutureVersements(effortMensuelProfil, tauxProfil, annee);
      profilDataPoints.push(fvProfilInitial + fvProfilVersements);

      const fvLivretInitial = calculerValeurFutureCapitalInitial(values.capitalInitial, TAUX_LIVRET_MOYEN, annee);
      const fvLivretVersements = calculerValeurFutureVersements(effortMensuelProfil, TAUX_LIVRET_MOYEN, annee);
      livretDataPoints.push(fvLivretInitial + fvLivretVersements);
    }

    setLineChartData({
      labels,
      datasets: [
        {
          label: `Profil ${selectedProfile}`,
          data: profilDataPoints,
          borderColor: profilStyles[selectedProfile].lineChartBorder,
          backgroundColor: profilStyles[selectedProfile].lineChartBg,
          fill: true, tension: 0.2,
        },
        { 
          label: `Comparaison Livret A (~${TAUX_LIVRET_MOYEN * 100}%, moy. 20 ans)`,
          data: livretDataPoints,
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.2)',
          fill: true, tension: 0.2,
        }
      ]
    });
  }, [selectedProfile, results, values]);

  useEffect(() => {
    tippy('[data-tippy-content]', { theme: 'custom', animation: 'scale-subtle' });
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSelectedProfile(null);
    setValues(prevValues => ({ ...prevValues, [id]: parseFloat(value) }));
  };

  const handleProfileClick = (profil: ProfilName) => {
    setSelectedProfile(prev => (prev === profil ? null : profil));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }
    setEmailStatus('sending');
    try {
      const response = await fetch('/.netlify/functions/send-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, values, results, simulatorTitle: "Épargne Objectif" }),
      });
      if (!response.ok) throw new Error("Erreur du serveur lors de l'envoi.");
      setEmailStatus('success');
    } catch (error) {
      console.error(error);
      setEmailStatus('error');
    }
  };

  return (
    <>
      <style>{tippyCustomTheme}</style>
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
        <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto">
          
          <div className="flex items-center justify-center gap-4 mb-10">
            <img src="/generique-turquoise.svg" alt="Logo Aeterni Patrimoine" className="w-12 h-12" />
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-100">
              Simulateur d'Épargne Objectif
            </h1>
          </div>

          <div className="bg-slate-700/50 p-6 rounded-lg mb-12 ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold text-center text-white mb-6">Passez à l'action</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label htmlFor="email" className="text-gray-300 font-medium">Recevez cette simulation par email :</label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre adresse email"
                            className="flex-grow bg-slate-800 text-white placeholder-gray-400 rounded-md p-3 border border-slate-600 focus:ring-2 focus:ring-[#00FFD2] focus:outline-none"
                            required
                        />
                        <button type="submit" disabled={emailStatus === 'sending'} className="bg-[#00FFD2] text-slate-900 font-bold py-3 px-5 rounded-md hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {emailStatus === 'sending' ? 'Envoi...' : 'Envoyer'}
                        </button>
                    </div>
                    {emailStatus === 'success' && <p className="text-green-400 text-sm mt-2">Simulation envoyée avec succès !</p>}
                    {emailStatus === 'error' && <p className="text-red-400 text-sm mt-2">Une erreur est survenue. Veuillez réessayer.</p>}
                </form>
                <div className="text-center">
                     <p className="text-gray-300 font-medium mb-3">Poursuivez votre démarche :</p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="https://www.aeterniapatrimoine.fr/solutions/" target="_blank" rel="noopener noreferrer" className="inline-block bg-transparent text-[#00FFD2] font-bold py-3 px-6 rounded-md border-2 border-[#00FFD2] hover:bg-[#00FFD2] hover:text-slate-900 transition-colors">
                            Nos solutions
                        </a>
                        <a href="https://doodle.com/bp/romaindagnano/rdv-decouverte-aeternia" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-slate-900 font-bold py-3 px-6 rounded-md hover:bg-[#00FFD2] transition-colors">
                            Prendre rendez-vous
                        </a>
                     </div>
                </div>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6">Vos Paramètres</h2>
              <div className="space-y-6">
                {parametres.map((p) => (
                  <div key={p.id}>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{p.label}</span>
                          <svg data-tippy-content={p.tooltip} className="w-4 h-4 text-gray-400 cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        </div>
                        <span className="font-bold text-[#00FFD2]">{p.unit === '€' ? values[p.id].toLocaleString('fr-FR') : values[p.id]} {p.unit}</span>
                      </div>
                    </label>
                    <input type="range" id={p.id} min={p.min} max={p.max} step={p.step} value={values[p.id]} onChange={handleSliderChange} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-[#00FFD2] mb-4">Effort d'épargne mensuel requis</h2>
              <p className="text-gray-400 text-sm mb-6">Cliquez sur un profil pour voir la projection de votre capital.</p>
              <div className="space-y-4">
                  {(Object.keys(results) as ProfilName[]).map(nomProfil => {
                      const styles = profilStyles[nomProfil];
                      const isActive = selectedProfile === nomProfil;
                      return (
                          <button 
                            key={nomProfil} 
                            onClick={() => handleProfileClick(nomProfil)}
                            className={`${styles.card} p-4 rounded-lg shadow-sm text-center w-full transition-all duration-200 ${isActive ? 'ring-2 ring-white/80 scale-105' : 'opacity-80 hover:opacity-100'}`}
                          >
                              <h3 className={`text-lg font-bold ${styles.title}`}>{nomProfil} ({profils[nomProfil] * 100}%)</h3>
                              <p className={`text-3xl font-extrabold ${styles.value} mt-1`}>
                                  {results[nomProfil].toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                              </p>
                          </button>
                      )
                  })}
              </div>
            </div>
          </div>

          {selectedProfile && (
            <div className="mt-8 bg-slate-700/50 p-6 rounded-lg ring-1 ring-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">
                    Évolution de votre patrimoine
                </h2>
                <div className="h-64">
                    <Line 
                        data={lineChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: { 
                                legend: { display: true, position: 'top', labels: { color: '#d1d5db' } },
                                tooltip: {
                                    callbacks: {
                                        title: (context) => context[0]?.label || '',
                                        label: (context) => {
                                            const label = context.dataset.label || '';
                                            const value = context.parsed.y;
                                            return `${label}: ${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`;
                                        },
                                        footer: (tooltipItems) => {
                                            if (!tooltipItems[0] || lineChartData.datasets.length < 2) return '';
                                            const dataIndex = tooltipItems[0].dataIndex;
                                            const profilValue = lineChartData.datasets[0].data[dataIndex];
                                            const livretValue = lineChartData.datasets[1].data[dataIndex];
                                            const ecart = profilValue - livretValue;
                                            return `\nÉcart: ${ecart.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                                y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } }
                            }
                        }}
                    />
                </div>
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500">
              Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils ne constituent pas un conseil en investissement et sont basés sur les hypothèses que vous avez renseignées.
            </p>
          </div>

        </div>
      </div>
    </>
  );
};

export default App;