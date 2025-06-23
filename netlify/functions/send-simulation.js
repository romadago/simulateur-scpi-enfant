// Fichier : netlify/functions/send-simulation.js
// Adapté pour le "Simulateur Études Enfant"

const { Resend } = require('resend');

exports.handler = async function(event) {
  // On accepte uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = JSON.parse(event.body);
    
    // On récupère les données envoyées par le nouveau simulateur
    const { email, data } = body;
    const { objectifs, resultats } = data;

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'], // Copie pour vos archives
      subject: `Votre simulation pour les études de votre enfant`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333;">Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur pour préparer un projet d'avenir pour votre enfant. Vous trouverez ci-dessous le résumé de votre simulation.</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
            <li><strong>Revenu mensuel souhaité pour les études :</strong> ${objectifs.revenuRecherche}</li>
            <li><strong>Durée de l'épargne :</strong> ${objectifs.dureePlacement}</li>
            <li><strong>Versement initial :</strong> ${objectifs.versementInitial}</li>
          </ul>

          <h3 style="color: #333;">Résultats de votre projet :</h3>
          <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 16px;">Pour atteindre votre objectif, votre effort d'épargne mensuel suggéré est de :</p>
              <p style="font-size: 24px; font-weight: bold; color: #00877a; margin: 10px 0;">${resultats.versementMensuelRequis} / mois</p>
              <p style="font-size: 14px; color: #555; margin: 0;">Cet effort vous permettrait de viser un capital final de <strong>${resultats.capitalVise}</strong>.</p>
          </div>
          
          <p style="margin-top: 25px;">Pour discuter de ces résultats et mettre en place la stratégie la plus adaptée, n'hésitez pas à nous contacter ou à explorer nos solutions d'investissement.</p>
          <br>
          <p>Cordialement,</p>
          <p><strong>L'équipe Aeternia Patrimoine</strong></p>

          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
          
          <p style="font-size: 10px; color: #777; text-align: center; margin-top: 20px;">
            Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils sont basés sur les hypothèses de calcul et les paramètres que vous avez renseignés et ne constituent pas un conseil en investissement.
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