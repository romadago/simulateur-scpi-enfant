import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

ChartJS.register(ArcElement, Tooltip, Legend);

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

interface Results {
  capaciteEpargne: number;
  repartition: {
    securise: number;
    dynamique: number;
  };
  pourcentages: {
    securise: number;
    dynamique: number;
  };
  objectifPrecaution: number;
  capitalProjete: number;
}

const initialValues = {
  salaire: 4000,
  chargesLogement: 1200,
  age: 35,
  epargneExistante: 5000,
  dureeProjection: 10,
};

const App: React.FC = () => {
  const [values, setValues] = useState(initialValues);
  const [results, setResults] = useState<Results>({
    capaciteEpargne: 0,
    repartition: { securise: 0, dynamique: 0 },
    pourcentages: { securise: 0, dynamique: 0 },
    objectifPrecaution: 0,
    capitalProjete: 0,
  });
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const parametres: Parametre[] = [
    { id: 'salaire', label: 'Votre salaire mensuel net', unit: '€', min: 1500, max: 15000, step: 100, tooltip: 'Votre revenu mensuel net après impôts.' },
    { id: 'chargesLogement', label: 'Vos charges de logement mensuelles', unit: '€', min: 200, max: 5000, step: 50, tooltip: 'Loyer ou remboursement de prêt, charges de copropriété, etc.' },
    { id: 'age', label: 'Votre âge', unit: 'ans', min: 18, max: 70, step: 1, tooltip: 'Votre âge est un facteur clé pour déterminer votre profil de risque.' },
    { id: 'epargneExistante', label: 'Votre épargne déjà constituée', unit: '€', min: 0, max: 500000, step: 1000, tooltip: 'Le montant total de votre épargne actuelle, tous comptes confondus.' },
    { id: 'dureeProjection', label: 'Estimer mon capital obtenu dans', unit: 'ans', min: 5, max: 40, step: 1, tooltip: 'Choisissez un horizon de temps pour estimer la croissance de votre épargne.' },
  ];
  
  const calculerValeurFutureVersements = (versementMensuel: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (versementMensuel <= 0 || dureeEnAnnees <= 0) return 0;
    const tauxMensuel = tauxAnnuel / 12;
    const nombreDeMois = dureeEnAnnees * 12;
    return versementMensuel * (Math.pow(1 + tauxMensuel, nombreDeMois) - 1) / tauxMensuel;
  };

  useEffect(() => {
    const autresDepenses = values.salaire * 0.30;
    const depensesTotales = values.chargesLogement + autresDepenses;
    const revenuDisponible = values.salaire - depensesTotales;
    const capaciteEpargne = Math.max(0, revenuDisponible * 0.5);
    const objectifPrecaution = depensesTotales * 3;
    const pourcentageDynamique = Math.max(0, 100 - values.age);
    const pourcentageSecurise = 100 - pourcentageDynamique;
    const repartition = {
      dynamique: capaciteEpargne * (pourcentageDynamique / 100),
      securise: capaciteEpargne * (pourcentageSecurise / 100),
    };
    const fvSecurise = calculerValeurFutureVersements(repartition.securise, 0.04, values.dureeProjection);
    const fvDynamique = calculerValeurFutureVersements(repartition.dynamique, 0.08, values.dureeProjection);
    const capitalProjete = fvSecurise + fvDynamique;

    setResults({
      capaciteEpargne,
      repartition,
      pourcentages: { securise: pourcentageSecurise, dynamique: pourcentageDynamique },
      objectifPrecaution,
      capitalProjete,
    });
  }, [values]);

  useEffect(() => {
    tippy('[data-tippy-content]', { theme: 'custom', animation: 'scale-subtle' });
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setValues(prevValues => ({ ...prevValues, [id]: parseFloat(value) }));
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
        body: JSON.stringify({ email, values, results, simulatorTitle: "Coach Épargne" }),
      });
      if (!response.ok) throw new Error("Erreur du serveur lors de l'envoi.");
      setEmailStatus('success');
    } catch (error) {
      console.error(error);
      setEmailStatus('error');
    }
  };

  const chartData = {
    labels: ['Épargne Sécurisée', 'Épargne Dynamique'],
    datasets: [{ data: [results.pourcentages.securise, results.pourcentages.dynamique], backgroundColor: ['#3b82f6', '#10b981'], borderColor: '#1f2937', borderWidth: 4 }],
  };
  const chartOptions = {
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: any) => `${context.label}: ${context.raw}%` } } },
    responsive: true, maintainAspectRatio: false,
  };

  return (
    <>
      <style>{tippyCustomTheme}</style>
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
        <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-6xl mx-auto">
          
          <div className="flex items-center justify-center gap-4 mb-10">
            <img src="/generique-turquoise.svg" alt="Logo Aeterni Patrimoine" className="w-12 h-12" />
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-100">
              Coach Épargne : Répartition Optimisée
            </h1>
          </div>
          
          <div className="bg-slate-700/50 p-6 rounded-lg mb-12 ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold text-center text-white mb-6">Passez à l'action</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label htmlFor="email" className="text-gray-300 font-medium">Recevez cette stratégie personnalisée par email :</label>
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
                    {emailStatus === 'success' && <p className="text-green-400 text-sm mt-2">Stratégie envoyée avec succès !</p>}
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


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6">Votre Situation</h2>
              <div className="space-y-6">
                {parametres.map((p) => (
                  <div key={p.id}>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{p.label}</span>
                          <svg data-tippy-content={p.tooltip} className="w-4 h-4 text-gray-400 cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        </div>
                        <span className="font-bold text-[#00FFD2]">{values[p.id].toLocaleString('fr-FR')} {p.unit}</span>
                      </div>
                    </label>
                    <input type="range" id={p.id} min={p.min} max={p.max} step={p.step} value={values[p.id]} onChange={handleSliderChange} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-[#00FFD2] mb-4">Votre Stratégie d'Épargne Conseillée</h2>
              <div className="text-center bg-slate-900/50 p-4 rounded-lg mb-4">
                  <p className="text-gray-300">Votre capacité d'épargne mensuelle est estimée à :</p>
                  <p className="text-3xl font-bold text-white my-2">{results.capaciteEpargne.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center mb-4">
                <div className="h-48 md:h-56 relative"><Pie data={chartData} options={chartOptions} /></div>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-blue-300">Épargne Sécurisée ({results.pourcentages.securise}%)</p>
                        <p className="text-xl font-bold text-white">{results.repartition.securise.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})} / mois</p>
                    </div>
                     <div>
                        <p className="text-sm text-green-300">Épargne Dynamique ({results.pourcentages.dynamique}%)</p>
                        <p className="text-xl font-bold text-white">{results.repartition.dynamique.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})} / mois</p>
                    </div>
                </div>
              </div>

              {/* --- MODIFICATION : Bloc de projection réintégré --- */}
              <div className="mt-4 text-center bg-gradient-to-r from-cyan-500/20 to-teal-500/20 p-4 rounded-lg border border-cyan-400/30">
                <h4 className="font-semibold text-cyan-200">Projection de votre patrimoine</h4>
                <p className="text-gray-300 mt-1">
                  En suivant cette stratégie, votre capital est estimé à :
                </p>
                <p className="text-3xl font-bold text-white my-2">
                    {results.capitalProjete.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                </p>
                 <p className="text-xs text-gray-400">dans {values.dureeProjection} ans</p>
              </div>

              <div className="mt-4 text-center bg-sky-100/10 p-3 rounded-lg border border-sky-200/20">
                <h4 className="font-semibold text-sky-200">Conseil pour votre Épargne de Précaution</h4>
                <p className="text-xs text-gray-300 mt-1">
                  Votre objectif est d'environ {results.objectifPrecaution.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}.
                  {values.epargneExistante < results.objectifPrecaution 
                    ? ` Il vous manque encore ${(results.objectifPrecaution - values.epargneExistante).toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}. Pensez à y allouer une partie de votre épargne en priorité.`
                    : ` Bravo, votre matelas de sécurité est constitué !`
                  }
                </p>
              </div>
            </div>
          </div>
          
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