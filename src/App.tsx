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

interface ProfileResult {
  valeurNominale: number;
  valeurReelle: number;
  totalInvesti: number;
  gainReel: number;
}

const initialValues = {
  capitalInitial: 10000,
  versementMensuel: 300,
  dureePlacement: 20,
  tauxInflation: 3,
};

type ProfilName = 'Prudent' | 'Équilibré' | 'Dynamique';

const profils: Record<ProfilName, number> = {
  Prudent: 0.04,
  'Équilibré': 0.06,
  Dynamique: 0.08,
};

const profilStyles: Record<ProfilName, { card: string; title: string; label: string; value: string; gainPositif: string; gainNegatif: string; border: string; }> = {
  Prudent: {
    card: 'bg-sky-100',
    title: 'text-sky-900',
    label: 'text-sky-700',
    value: 'text-sky-900 font-semibold',
    gainPositif: 'text-green-600',
    gainNegatif: 'text-red-600',
    border: 'border-sky-200'
  },
  'Équilibré': {
    card: 'bg-emerald-100',
    title: 'text-emerald-900',
    label: 'text-emerald-700',
    value: 'text-emerald-900 font-semibold',
    gainPositif: 'text-green-600',
    gainNegatif: 'text-red-600',
    border: 'border-emerald-200'
  },
  Dynamique: {
    card: 'bg-rose-100',
    title: 'text-rose-900',
    label: 'text-rose-700',
    value: 'text-rose-900 font-semibold',
    gainPositif: 'text-green-600',
    gainNegatif: 'text-red-600',
    border: 'border-rose-200'
  }
};

const App: React.FC = () => {
  const [values, setValues] = useState(initialValues);
  const [results, setResults] = useState<Partial<Record<ProfilName, ProfileResult>>>({});
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const parametres: Parametre[] = [
    { id: 'capitalInitial', label: 'Capital Initial', unit: '€', min: 0, max: 200000, step: 1000, tooltip: 'La somme que vous investissez au départ.' },
    { id: 'versementMensuel', label: 'Épargne Mensuelle', unit: '€', min: 0, max: 2000, step: 50, tooltip: 'La somme que vous prévoyez d\'épargner chaque mois.' },
    { id: 'dureePlacement', label: 'Durée du placement', unit: 'ans', min: 5, max: 40, step: 1, tooltip: 'Le nombre d\'années total pendant lesquelles vous souhaitez épargner.' },
    { id: 'tauxInflation', label: 'Taux d\'inflation annuel', unit: '%', min: 1, max: 5, step: 0.1, tooltip: 'L\'inflation annuelle moyenne qui réduit votre pouvoir d\'achat.' },
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
    const nouveauxResultats: Partial<Record<ProfilName, ProfileResult>> = {};
    const totalVersements = values.versementMensuel * values.dureePlacement * 12;
    const totalInvesti = values.capitalInitial + totalVersements;
    for (const entry of Object.entries(profils)) {
      const [nomProfil, taux] = entry as [ProfilName, number];
      const fvVersements = calculerValeurFutureVersements(values.versementMensuel, taux, values.dureePlacement);
      const fvCapitalInitial = calculerValeurFutureCapitalInitial(values.capitalInitial, taux, values.dureePlacement);
      const valeurNominale = fvVersements + fvCapitalInitial;
      const valeurReelle = valeurNominale / Math.pow(1 + (values.tauxInflation / 100), values.dureePlacement);
      const gainReel = valeurReelle - totalInvesti;
      nouveauxResultats[nomProfil] = { valeurNominale, valeurReelle, totalInvesti, gainReel };
    }
    setResults(nouveauxResultats);
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
        body: JSON.stringify({ email, values, results }),
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
          
          <div className="flex items-center justify-center gap-4 mb-10">
            <img src="/generique-turquoise.svg" alt="Logo Aeterni Patrimoine" className="w-12 h-12" />
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-100">Simulateur d'Impact de l'Inflation</h1>
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

                {/* --- MODIFICATION : Ajout d'un conteneur pour les 2 boutons --- */}
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
                        {/* --- MODIFICATION : Ajout du nouveau bouton --- */}
                        <a
                            href="https://www.aeterniapatrimoine.fr/solutions/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-transparent text-[#00FFD2] font-bold py-3 px-6 rounded-md border-2 border-[#00FFD2] hover:bg-[#00FFD2] hover:text-slate-900 transition-colors"
                        >
                            Nos solutions anti-inflation
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
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6">Impact de l'Inflation sur votre capital</h2>
              <div className="space-y-5">
                {(Object.keys(profils) as ProfilName[]).map(nomProfil => {
                  const resultData = results[nomProfil];
                  if (!resultData) return null; 
                  const styles = profilStyles[nomProfil];
                  const gainStyle = resultData.gainReel >= 0 ? styles.gainPositif : styles.gainNegatif;
                  return (
                    <div key={nomProfil} className={`${styles.card} p-4 rounded-lg shadow-sm`}>
                      <h3 className={`text-xl font-bold ${styles.title} mb-3`}>{nomProfil} (Rendement { profils[nomProfil] * 100 }%)</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className={styles.label}>Capital final (valeur nominale) :</span>
                          <span className={styles.value}>{resultData.valeurNominale.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={styles.label}>Total de vos versements :</span>
                          <span className={styles.value}>{resultData.totalInvesti.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</span>
                        </div>
                         <div className="flex justify-between items-center">
                          <span className={styles.label}>Pouvoir d'achat final (valeur réelle) :</span>
                          <span className={styles.value}>{resultData.valeurReelle.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</span>
                        </div>
                         <div className={`flex justify-between items-center mt-2 pt-2 border-t ${styles.border} border-dashed`}>
                          <span className={`font-bold ${gainStyle}`}>Gain réel (après inflation) :</span>
                          <span className={`font-extrabold ${gainStyle} text-base`}>
                            {resultData.gainReel >= 0 ? '+ ' : ''}
                            {resultData.gainReel.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;