// Fichier : netlify/functions/send-simulation.js
const { Resend } = require('resend');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, values, results } = JSON.parse(event.body);

    let resultsHtml = '';
    for (const profil in results) {
        const r = results[profil];
        resultsHtml += `<div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;"><h4>Profil ${profil}</h4><p>Capital: ${Math.round(r.valeurFinaleMaintenant).toLocaleString('fr-FR')} €</p><p>Coût du report: - ${Math.round(r.coutDuReport).toLocaleString('fr-FR')} €</p></div>`;
    }
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>',
      to: [email], bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre simulation du coût du report d'investissement`,
      html: `<div><h2>Bonjour,</h2><p>Voici votre simulation :</p><h3>Paramètres :</h3><ul><li>Épargne Mensuelle: ${values.versementMensuel} €</li><li>Durée: ${values.dureePlacement} ans</li><li>Report: ${values.delaiReport} ans</li></ul><h3>Résultats :</h3>${resultsHtml}<p>Cordialement,<br>L'équipe Aeternia Patrimoine</p></div>`,
    });
    return { statusCode: 200, body: JSON.stringify({ message: "OK" }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: "Erreur." }) };
  }
};