// Fichier : netlify/functions/send-simulation.js (Version corrigée)

const { Resend } = require('resend');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    const { email, values, results, simulatorTitle } = data;

    // --- Formatage des résultats pour l'email ---
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

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre stratégie d'épargne personnalisée`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur "${simulatorTitle}". Voici votre stratégie personnalisée.</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Salaire mensuel net :</strong> ${values.salaire.toLocaleString('fr-FR')} €</li>
            <li><strong>Charges de logement :</strong> ${values.chargesLogement.toLocaleString('fr-FR')} €</li>
            <li><strong>Âge :</strong> ${values.age} ans</li>
            <li><strong>Épargne existante :</strong> ${values.epargneExistante.toLocaleString('fr-FR')} €</li>
          </ul>

          <h3 style="color: #333;">Votre stratégie conseillée :</h3>
          ${repartitionHtml}
          ${projectionHtml}
          
          <p>Pour mettre en place une stratégie adaptée, n'hésitez pas à nous contacter.</p>
          <br>
          <p>Cordialement,<br>L'équipe Aeternia Patrimoine</p>

          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
          
          <p style="font-size: 10px; color: #777; text-align: center; margin-top: 20px;">
            Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils ne constituent pas un conseil en investissement et sont basés sur les hypothèses que vous avez renseignées.
          </p>
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