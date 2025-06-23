import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// --- Helper Components for UI ---

interface InputSliderProps {
  label: string;
  unit: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
  id: string;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, unit, value, onChange, min, max, step, id }) => (
  <div>
    <label className="text-gray-300 text-sm font-medium mb-2 block">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-bold text-[#00FFD2]">{value.toLocaleString('fr-FR')} {unit}</span>
      </div>
    </label>
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);


// --- Main App Component ---

const App: React.FC = () => {
  // --- Fixed Assumptions ---
  const TAUX_DISTRIBUTION_SCPI = 0.06;
  const DELAI_JOUISSANCE_MOIS = 5;
  const TAUX_FISCALITE_MOYENNE = 0.20;

  // --- State Management for Inputs ---
  const [revenuRecherche, setRevenuRecherche] = useState<number>(500);
  const [dureePlacement, setDureePlacement] = useState<number>(15);
  const [versementInitial, setVersementInitial] = useState<number>(5000);
  
  // --- State Management for Results ---
  const [results, setResults] = useState({ versementMensuelRequis: 0, capitalVise: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  
  // --- State for email form ---
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');


  // --- Simulation Engine ---
  useEffect(() => {
    const runSimulation = (versementMensuelCible: number, generateChart: boolean = false): number | any[] => {
      const monthlyRate = TAUX_DISTRIBUTION_SCPI / 12;
      const totalMonths = dureePlacement * 12;
      const chartHistory = [];

      const investments: { amount: number; month_invested: number }[] = [];

      if (versementInitial > 0) {
        investments.push({ amount: versementInitial, month_invested: 0 });
      }

      for (let m = 1; m <= totalMonths; m++) {
        if (versementMensuelCible > 0) {
            investments.push({ amount: versementMensuelCible, month_invested: m });
        }

        let productiveCapital = 0;
        for (const inv of investments) {
          if (m > inv.month_invested + DELAI_JOUISSANCE_MOIS) {
            productiveCapital += inv.amount;
          }
        }
        const dividendThisMonth = productiveCapital * monthlyRate;
        const netDividendAfterTaxes = dividendThisMonth * (1 - TAUX_FISCALITE_MOYENNE);
        
        if (netDividendAfterTaxes > 0) {
          investments.push({ amount: netDividendAfterTaxes, month_invested: m });
        }
        
        if (generateChart && m % 12 === 0) {
            const capitalTotal = investments.reduce((sum, inv) => sum + inv.amount, 0);
            const totalVersements = versementInitial + (versementMensuelCible * m);
            chartHistory.push({
                annee: m / 12,
                "Capital Total": capitalTotal,
                "Total des Versements": totalVersements,
            });
        }
      }
      
      if (generateChart) {
          return chartHistory;
      }
      return investments.reduce((sum, inv) => sum + inv.amount, 0);
    };

    // --- Goal Seeking Logic (Binary Search) ---
    const revenuAnnuelVise = revenuRecherche * 12;
    const capitalVise = revenuAnnuelVise / TAUX_DISTRIBUTION_SCPI;

    if (runSimulation(0) as number >= capitalVise) {
        setResults({ versementMensuelRequis: 0, capitalVise });
        const finalChartData = runSimulation(0, true) as any[];
        setChartData(finalChartData);
        return;
    }

    let minVersement = 0;
    let maxVersement = revenuRecherche * 3;
    let versementTrouve = 0;

    for (let i = 0; i < 50; i++) {
      const milieu = (minVersement + maxVersement) / 2;
      const capitalObtenu = runSimulation(milieu) as number;
    
      if (capitalObtenu < capitalVise) {
        minVersement = milieu;
      } else {
        maxVersement = milieu;
      }
    }
    versementTrouve = maxVersement;
    
    setResults({ versementMensuelRequis: versementTrouve, capitalVise });
    const finalChartData = runSimulation(versementTrouve, true) as any[];
    setChartData(finalChartData);

  }, [revenuRecherche, dureePlacement, versementInitial]);
  
  // --- Email form handler ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setEmailMessage('Veuillez saisir une adresse e-mail valide.');
        return;
    }

    setIsSending(true);
    setEmailMessage('');

    const simulationData = {
        objectifs: {
            revenuRecherche: `${revenuRecherche.toLocaleString('fr-FR')} €`,
            dureePlacement: `${dureePlacement} ans`,
            versementInitial: `${versementInitial.toLocaleString('fr-FR')} €`,
        },
        resultats: {
            versementMensuelRequis: `${results.versementMensuelRequis.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}`,
            capitalVise: `${results.capitalVise.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}`,
        }
    };

    try {
        // This is the call to the Netlify serverless function
        const response = await fetch('/.netlify/functions/send-simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, data: simulationData }),
        });

        if (!response.ok) {
            throw new Error('La réponse du serveur n\'est pas OK.');
        }

        setEmailMessage(`Votre simulation a bien été envoyée à ${email}.`);
        setEmail('');

    } catch (error) {
        console.error('Failed to send simulation:', error);
        setEmailMessage("Une erreur est survenue. Veuillez réessayer.");
    } finally {
        setIsSending(false);
        setTimeout(() => setEmailMessage(''), 5000);
    }
  };


  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
      <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto">
        
        <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                Préparez les Études de votre Enfant
            </h1>
            <p className="text-slate-300 mt-2">Découvrez l'effort d'épargne mensuel pour générer le revenu mensuel nécessaire.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Left Column: Controls */}
            <div className="lg:col-span-2 bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6">Vos Objectifs</h2>
                <div className="space-y-6">
                <InputSlider
                    id="revenuRecherche"
                    label="Revenu mensuel pour ses études"
                    unit="€"
                    value={revenuRecherche}
                    onChange={(e) => setRevenuRecherche(parseFloat(e.target.value))}
                    min={100} max={2000} step={50}
                />
                <InputSlider
                    id="dureePlacement"
                    label="Durée jusqu'aux études"
                    unit="ans"
                    value={dureePlacement}
                    onChange={(e) => setDureePlacement(parseFloat(e.target.value))}
                    min={1} max={25} step={1}
                />
                <InputSlider
                    id="versementInitial"
                    label="Versement initial"
                    unit="€"
                    value={versementInitial}
                    onChange={(e) => setVersementInitial(parseFloat(e.target.value))}
                    min={0} max={100000} step={1000}
                />
                </div>
            </div>
            
            {/* Right Column: Result and Actions */}
            <div className="lg:col-span-3 bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10 flex flex-col justify-start">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-[#00FFD2] mb-4">Résultat de votre projet</h2>
                    <p className="text-gray-300 mb-6">Pour financer des études nécessitant <span className="font-bold text-white">{revenuRecherche.toLocaleString('fr-FR')} €/mois</span>, le versement mensuel suggéré est de :</p>
                    
                    <div className="bg-emerald-100 p-6 rounded-lg text-center shadow">
                        <p className="text-3xl md:text-4xl font-extrabold text-emerald-900">
                            {results.versementMensuelRequis.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                            <span className="text-xl font-semibold"> / mois</span>
                        </p>
                    </div>

                    <div className="mt-6 text-xs text-gray-400">
                        <p>Cet effort vous permettrait de viser un capital final de <span className="font-bold text-gray-200">{results.capitalVise.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</span> au terme des <span className="font-bold text-gray-200">{dureePlacement}</span> ans.</p>
                    </div>
                </div>

                <hr className="my-8 border-slate-600" />
                
                <div className="text-center">
                     <h3 className="text-lg font-semibold text-gray-100 mb-3">Passez à l'étape suivante</h3>
                     <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre adresse e-mail"
                            className="flex-grow bg-slate-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#00FFD2]"
                            required
                            disabled={isSending}
                        />
                        <button type="submit" className="bg-slate-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-slate-500 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSending}>
                            {isSending ? 'Envoi...' : 'Recevoir par e-mail'}
                        </button>
                    </form>
                    {emailMessage && <p className="text-sm text-emerald-400 mb-4">{emailMessage}</p>}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                        <a href="https://www.aeterniapatrimoine.fr/solutions/scpi/" target="_blank" rel="noopener noreferrer" className="bg-[#00FFD2] text-slate-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-white transition-colors duration-300 w-full sm:w-auto">
                            Découvrir nos solutions SCPI
                        </a>
                        <a href="https://www.aeterniapatrimoine.fr/contact/" target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-[#00FFD2] text-[#00FFD2] font-bold py-3 px-8 rounded-lg hover:bg-[#00FFD2] hover:text-slate-900 transition-colors duration-300 w-full sm:w-auto">
                            Être contacté
                        </a>
                    </div>
                </div>
            </div>
        </div>

        {/* Chart Section */}
        <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6 text-center">Projection de votre Épargne</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="annee" stroke="#94a3b8" unit=" ans" />
                        <YAxis stroke="#94a3b8" tickFormatter={(value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#e2e8f0' }} formatter={(value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'} />
                        <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                        <ReferenceLine y={results.capitalVise} label={{ value: 'Objectif', position: 'insideTopLeft', fill: '#f0f9ff' }} stroke="#f0f9ff" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="Capital Total" stroke="#00FFD2" strokeWidth={2} dot={{ r: 4, fill: '#00FFD2' }} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Total des Versements" stroke="#818cf8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        {/* Hypotheses */}
        <div className="text-center mt-10">
             <div className="text-xs text-slate-400 p-4 bg-slate-900/50 rounded-lg max-w-3xl mx-auto">
                <h3 className="font-semibold text-slate-300 mb-2">Hypothèses de calcul</h3>
                <p>Taux de distribution: {TAUX_DISTRIBUTION_SCPI * 100}%/an. Réinvestissement des dividendes: 100%. Délai de jouissance: {DELAI_JOUISSANCE_MOIS} mois. Fiscalité moyenne retenue: {TAUX_FISCALITE_MOYENNE * 100}%*. <br/>*Taux moyen constaté pour une SCPI "européenne" (TMI 30%). Cette simulation est non contractuelle et ne constitue pas un conseil en investissement.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;