// Fichier : netlify/functions/send-simulation.js
// Version finale avec la mention légale dans l'email

const { Resend } = require('resend');

exports.handler = async function(event) {
  // On accepte uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    // On récupère les données du simulateur d'épargne objectif
    const { email, values, results } = data;

    // --- Formatage des résultats pour l'email ---
    let resultsHtml = '';
    for (const profil in results) {
        const effortMensuel = results[profil];
        resultsHtml += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #0056b3;">Profil ${profil}</h4>
                <p>Pour atteindre votre objectif, votre effort d'épargne mensuel devrait être de :</p>
                <p style="font-size: 20px; font-weight: bold;">${Math.round(effortMensuel).toLocaleString('fr-FR')} € / mois</p>
            </div>
        `;
    }

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre simulation d'épargne objectif`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre "Simulateur d'Épargne Objectif".</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Capital Initial :</strong> ${values.capitalInitial.toLocaleString('fr-FR')} €</li>
            <li><strong>Objectif de capital à atteindre :</strong> ${values.capitalVise.toLocaleString('fr-FR')} €</li>
            <li><strong>Sur une durée de :</strong> ${values.dureeEpargne} ans</li>
          </ul>

          <h3 style="color: #333;">Votre effort d'épargne mensuel requis :</h3>
          ${resultsHtml}
          
          <p>Pour discuter de ces résultats et mettre en place la stratégie la plus adaptée, n'hésitez pas à prendre rendez-vous.</p>
          <br>
          <p>Cordialement,</p>
          <p><strong>L'équipe Aeternia Patrimoine</strong></p>

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