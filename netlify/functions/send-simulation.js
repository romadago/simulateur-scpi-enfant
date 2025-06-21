// Fichier : netlify/functions/send-simulation.js (Version simplifiée et fonctionnelle)

const { Resend } = require('resend');

exports.handler = async function(event) {
  // Accepter uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    const { email, values, results } = data;

    // --- Formatage simple des résultats pour l'email ---
    let resultsHtml = '';
    for (const profil in results) {
        const r = results[profil];
        resultsHtml += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #0056b3;">Profil ${profil}</h4>
                <p>Capital final (dès maintenant) : <strong>${Math.round(r.valeurFinaleMaintenant).toLocaleString('fr-FR')} €</strong></p>
                <p>Capital final (reporté de ${values.delaiReport} ans) : <strong>${Math.round(r.valeurFinaleReport).toLocaleString('fr-FR')} €</strong></p>
                <p style="color: #d9534f;">Coût du report : <strong>- ${Math.round(r.coutDuReport).toLocaleString('fr-FR')} €</strong></p>
            </div>
        `;
    }

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre simulation du coût du report d'investissement`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur. Voici le récapitulatif de votre simulation personnalisée.</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Épargne Mensuelle :</strong> ${values.versementMensuel} €</li>
            <li><strong>Durée du placement :</strong> ${values.dureePlacement} ans</li>
            <li><strong>Report de l'investissement :</strong> ${values.delaiReport} ans</li>
          </ul>

          <h3 style="color: #333;">Vos résultats détaillés :</h3>
          ${resultsHtml}
          
          <p>N'hésitez pas à prendre rendez-vous pour discuter de vos résultats et établir une stratégie d'investissement sur mesure.</p>
          <br>
          <p>Cordialement,</p>
          <p><strong>L'équipe Aeternia Patrimoine</strong></p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email envoyé avec succès !' }),
    };

  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};