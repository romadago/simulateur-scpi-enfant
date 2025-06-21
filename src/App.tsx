import React, { useState, useEffect } from 'react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

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
  perteRevenuMensuel: number;
  effortEpargneMensuel: number;
  capitalNecessaire: number;
}

const initialValues = {
  capitalInitial: 10000,
  salaireFinCarriere: 5000,
  anneesAvantRetraite: 15,
};

type ProfilName = 'Prudent' | 'Équilibré' | 'Dynamique';

const profils: Record<ProfilName, number> = {
  Prudent: 0.04,
  'Équilibré': 0.06,
  Dynamique: 0.08,
};

const profilStyles: Record<ProfilName, { bg: string; text: string; ring: string }> = {
    Prudent: { bg: 'bg-sky-100', text: 'text-sky-800', ring: 'ring-sky-400' },
    'Équilibré': { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-400' },
    Dynamique: { bg: 'bg-rose-100', text: 'text-rose-800', ring: 'ring-rose-400' },
};

const App: React.FC = () => {
  const [values, setValues] = useState(initialValues);
  const [selectedProfil, setSelectedProfil] = useState<ProfilName>('Équilibré');
  const [results, setResults] = useState<Results>({
    perteRevenuMensuel: 0,
    effortEpargneMensuel: 0,
    capitalNecessaire: 0,
  });
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const parametres: Parametre[] = [
    { id: 'capitalInitial', label: 'Capital Initial', unit: '€', min: 0, max: 200000, step: 1000, tooltip: 'La somme que vous investissez au départ.' },
    { id: 'salaireFinCarriere', label: 'Salaire mensuel net estimé en fin de carrière', unit: '€', min: 2000, max: 30000, step: 250, tooltip: 'Votre dernier salaire mensuel net avant de partir à la retraite.' },
    { id: 'anneesAvantRetraite', label: 'Vous pensez prendre votre retraite dans', unit: 'ans', min: 5, max: 40, step: 1, tooltip: 'Le nombre d\'années qu\'il vous reste avant votre départ à la retraite.' },
  ];

  const calculerValeurFutureVersements = (versementMensuel: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (versementMensuel <= 0) return 0;
    const tauxMensuel = tauxAnnuel / 12;
    const nombreDeMois = dureeEnAnnees * 12;
    return versementMensuel * (Math.pow(1 + tauxMensuel, nombreDeMois) - 1) / tauxMensuel;
  };

  const calculerValeurFutureCapitalInitial = (capital: number, tauxAnnuel: number, dureeEnAnnees: number): number => {
    if (capital <= 0) return 0;
    return capital * Math.pow(1 + tauxAnnuel, dureeEnAnnees);
  };
  
  useEffect(() => {
    const perteRevenuMensuel = values.salaireFinCarriere * 0.60;
    const perteRevenuAnnuel = perteRevenuMensuel * 12;
    const tauxRente = 0.06;
    const capitalNecessaire = perteRevenuAnnuel / tauxRente;

    const tauxPlacement = profils[selectedProfil];
    const r = tauxPlacement / 12;
    const n = values.anneesAvantRetraite * 12;
    
    // Pour trouver le versement mensuel, on doit soustraire la valeur future du capital initial
    // de la cible de capital total.
    const fvCapitalInitial = calculerValeurFutureCapitalInitial(values.capitalInitial, tauxPlacement, values.anneesAvantRetraite);
    const capitalACreerViaVersements = Math.max(0, capitalNecessaire - fvCapitalInitial);
    
    let effortEpargneMensuel = 0;
    if (r > 0 && capitalACreerViaVersements > 0) {
      const denominateur = (Math.pow(1 + r, n) - 1) / r;
      effortEpargneMensuel = capitalACreerViaVersements / denominateur;
    }

    setResults({
      perteRevenuMensuel,
      effortEpargneMensuel,
      capitalNecessaire,
    });
  }, [values, selectedProfil]);

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
        body: JSON.stringify({ email, values, results, selectedProfil, simulatorTitle: "Préparation Retraite" }),
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
        <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-6xl mx-auto">
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <img src="/generique-turquoise.svg" alt="Logo Aeterni Patrimoine" className="w-12 h-12" />
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-100">
              Simulateur Préparation Retraite
            </h1>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-center text-white mb-4">Choisissez un profil de rendement pour votre épargne :</h3>
            <div className="flex flex-wrap justify-center gap-4">
                {(Object.keys(profils) as ProfilName[]).map(nomProfil => {
                    const isActive = selectedProfil === nomProfil;
                    const styles = profilStyles[nomProfil];
                    return (
                        <button
                            key={nomProfil}
                            onClick={() => setSelectedProfil(nomProfil)}
                            className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${styles.bg} ${styles.text} ${isActive ? `ring-2 ${styles.ring} shadow-lg` : 'opacity-70 hover:opacity-100'}`}
                        >
                            <span className="block text-lg">{nomProfil}</span>
                            <span className="block text-sm">({profils[nomProfil] * 100}% / an)</span>
                        </button>
                    )
                })}
            </div>
          </div>

          <div className="bg-slate-700/50 p-6 rounded-lg mb-12 ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold text-center text-white mb-6">Passez à l'action</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label htmlFor="email" className="text-gray-300 font-medium">Recevez cette simulation détaillée par email :</label>
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
                        <a
                            href="https://doodle.com/bp/romaindagnano/rdv-decouverte-aeternia"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-white text-slate-900 font-bold py-3 px-6 rounded-md hover:bg-[#00FFD2] transition-colors"
                        >
                            Prendre rendez-vous
                        </a>
                        <a
                            href="https://www.aeterniapatrimoine.fr/solutions/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-transparent text-[#00FFD2] font-bold py-3 px-6 rounded-md border-2 border-[#00FFD2] hover:bg-[#00FFD2] hover:text-slate-900 transition-colors"
                        >
                            Nos solutions retraite
                        </a>
                     </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
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
                        <span className="font-bold text-[#00FFD2]">{values[p.id].toLocaleString('fr-FR')} {p.unit}</span>
                      </div>
                    </label>
                    <input type="range" id={p.id} min={p.min} max={p.max} step={p.step} value={values[p.id]} onChange={handleSliderChange} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10 flex flex-col justify-center">
              <div className="space-y-8">
                <div className="bg-sky-100 p-6 rounded-lg text-center shadow">
                  <h3 className="text-lg font-semibold text-sky-800 mb-2">Perte de revenu mensuel estimée</h3>
                  <p className="text-4xl font-bold text-sky-900">- {results.perteRevenuMensuel.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                  <p className="text-xs text-sky-700 mt-1">(Basé sur une pension de 40% de votre dernier salaire)</p>
                </div>
                <div className="bg-emerald-100 p-6 rounded-lg text-center shadow">
                  <h3 className="text-lg font-semibold text-emerald-800 mb-2">Effort d'épargne mensuel requis</h3>
                  <p className="text-4xl font-bold text-emerald-900">{results.effortEpargneMensuel.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                  <p className="text-xs text-emerald-700 mt-1">(Profil <span className="font-bold">{selectedProfil}</span> pour viser un capital de {results.capitalNecessaire.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;