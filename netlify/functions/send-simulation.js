// Fichier : netlify/functions/send-simulation.js (LA SEULE VERSION NÉCESSAIRE)

const { Resend } = require('resend');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    const { email, values, results } = data;

    let resultsHtml = '';
    for (const profil in results) {
        const r = results[profil];
        const gainReelStyle = r.gainReel >= 0 ? 'color: #28a745;' : 'color: #d9534f;';
        
        resultsHtml += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #0056b3;">Profil ${profil}</h4>
                <p>Capital final (valeur nominale) : <strong>${Math.round(r.valeurNominale).toLocaleString('fr-FR')} €</strong></p>
                <p>Total de vos versements : <strong>${Math.round(r.totalInvesti).toLocaleString('fr-FR')} €</strong></p>
                <p>Pouvoir d'achat final (valeur réelle) : <strong>${Math.round(r.valeurReelle).toLocaleString('fr-FR')} €</strong></p>
                <p style="${gainReelStyle}">Gain réel (après inflation) : <strong>${r.gainReel >= 0 ? '+' : ''} ${Math.round(r.gainReel).toLocaleString('fr-FR')} €</strong></p>
            </div>
        `;
    }

    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre simulation sur l'impact de l'inflation`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur. Voici le récapitulatif de votre simulation personnalisée.</p>
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul>
            <li><strong>Capital Initial :</strong> ${values.capitalInitial.toLocaleString('fr-FR')} €</li>
            <li><strong>Épargne Mensuelle :</strong> ${values.versementMensuel.toLocaleString('fr-FR')} €</li>
            <li><strong>Durée du placement :</strong> ${values.dureePlacement} ans</li>
            <li><strong>Taux d'inflation estimé :</strong> ${values.tauxInflation} %</li>
          </ul>
          <h3 style="color: #333;">Vos résultats détaillés :</h3>
          ${resultsHtml}
          <p>Cordialement,<br>L'équipe Aeternia Patrimoine</p>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Email envoyé avec succès !' }) };
  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }) };
  }
};