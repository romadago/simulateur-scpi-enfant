// Fichier : netlify/functions/send-simulation.js
// Version mise à jour pour le simulateur de PRÉPARATION RETRAITE

const { Resend } = require('resend');

exports.handler = async function(event) {
  // Accepter uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    // On récupère les nouvelles données, y compris le profil sélectionné
    const { email, values, results, selectedProfil } = data;

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre simulation de préparation à la retraite`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur. Voici le récapitulatif de votre simulation de préparation à la retraite.</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Capital Initial :</strong> ${values.capitalInitial.toLocaleString('fr-FR')} €</li>
            <li><strong>Salaire mensuel en fin de carrière :</strong> ${values.salaireFinCarriere.toLocaleString('fr-FR')} €</li>
            <li><strong>Départ à la retraite dans :</strong> ${values.anneesAvantRetraite} ans</li>
            <li><strong>Profil de rendement choisi pour l'épargne :</strong> ${selectedProfil}</li>
          </ul>

          <h3 style="color: #333;">Vos résultats :</h3>
          <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
            <p>Perte de revenu mensuel estimée à la retraite : <strong style="color: #d9534f;">- ${Math.round(results.perteRevenuMensuel).toLocaleString('fr-FR')} €</strong></p>
          </div>
          <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
            <p>Pour compenser cette baisse, l'effort d'épargne mensuel requis est de :</p>
            <p style="font-size: 24px; font-weight: bold; color: #28a745;">${Math.round(results.effortEpargneMensuel).toLocaleString('fr-FR')} € / mois</p>
            <p style="font-size: 12px; color: #555;">(Ceci vous permettrait de viser un capital de ${Math.round(results.capitalNecessaire).toLocaleString('fr-FR')} € qui, placé à 6%, générerait la rente nécessaire.)</p>
          </div>
          
          <p>Pour mettre en place une stratégie adaptée, n'hésitez pas à nous contacter.</p>
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